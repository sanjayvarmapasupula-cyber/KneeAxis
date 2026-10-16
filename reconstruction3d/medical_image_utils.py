"""
Medical Image Utilities for Clinical Atlas 3D Knee Reconstruction
================================================================
Handles NIfTI/medical image loading, metadata extraction, orientation/affine calculation,
voxel validation, label mapping, and connected-component cleaning.
"""

from pathlib import Path
from typing import Dict, Any, Tuple, Optional
import numpy as np
import SimpleITK as sitk
from scipy import ndimage


def load_medical_image(file_path: str | Path) -> Dict[str, Any]:
    """
    Load a 3D medical image (NIfTI, NRRD, MHD, etc.) using SimpleITK, preserving
    all spatial physical metadata (spacing, origin, direction matrix, affine).

    Parameters
    ----------
    file_path : str or Path
        Path to the segmentation file (e.g. segmentation.nii.gz).

    Returns
    -------
    dict
        Dictionary containing:
        - 'sitk_image': SimpleITK.Image object
        - 'array': 3D NumPy array in (Z, Y, X) order
        - 'spacing': (sx, sy, sz) voxel spacing in mm
        - 'origin': (ox, oy, oz) physical origin in mm
        - 'direction': 3x3 orientation direction cosine matrix
        - 'affine': 4x4 affine matrix mapping continuous index (x, y, z) -> physical (x, y, z)
        - 'dimensions': (nx, ny, nz) image size in voxels
        - 'file_path': absolute path to the file
    """
    path = Path(file_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Medical image file not found at: {path}")

    # Read image using SimpleITK
    try:
        sitk_image = sitk.ReadImage(str(path))
    except Exception as exc:
        raise ValueError(f"Failed to read medical image file with SimpleITK: {exc}") from exc

    # Image metadata
    spacing = tuple(sitk_image.GetSpacing())      # (sx, sy, sz)
    origin = tuple(sitk_image.GetOrigin())        # (ox, oy, oz)
    direction_flat = sitk_image.GetDirection()    # tuple of 9 elements
    direction = np.array(direction_flat, dtype=np.float64).reshape((3, 3))
    dimensions = tuple(sitk_image.GetSize())      # (nx, ny, nz)

    # SimpleITK GetArrayFromImage returns numpy array in (Z, Y, X) order
    array = sitk.GetArrayFromImage(sitk_image)

    # Compute 4x4 affine matrix mapping continuous index (x, y, z) to physical space (LPS)
    # Physical = Origin + Direction @ diag(Spacing) @ [x, y, z]^T
    affine = np.eye(4, dtype=np.float64)
    affine[:3, :3] = direction @ np.diag(spacing)
    affine[:3, 3] = origin

    return {
        "sitk_image": sitk_image,
        "array": array,
        "spacing": spacing,
        "origin": origin,
        "direction": direction,
        "affine": affine,
        "dimensions": dimensions,
        "file_path": str(path),
    }


def validate_segmentation(image_data: Dict[str, Any]) -> None:
    """
    Validate that the loaded medical image is a valid 3D label map.

    Raises
    ------
    ValueError
        If dimensions are invalid, image is 2D/single-slice, or segmentation is empty.
    """
    array = image_data["array"]
    spacing = image_data["spacing"]
    dimensions = image_data["dimensions"]

    if array.ndim != 3:
        raise ValueError(
            f"Segmentation must be a 3D volume, but received {array.ndim}D array with shape {array.shape}."
        )

    if any(d < 2 for d in dimensions):
        raise ValueError(
            f"Segmentation has an invalid slice/dimension depth: {dimensions}. Must have at least 2 voxels along every axis."
        )

    if any(s <= 0 for s in spacing):
        raise ValueError(
            f"Invalid non-positive voxel spacing detected: {spacing}. Spacing must be > 0 mm."
        )

    if not np.any(array > 0):
        raise ValueError(
            "Segmentation volume is completely empty (all voxels are 0/background)."
        )


def get_image_metadata(image_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract human-readable metadata summary from loaded image data.
    """
    array = image_data["array"]
    spacing = image_data["spacing"]
    origin = image_data["origin"]
    direction = image_data["direction"]
    dimensions = image_data["dimensions"]
    voxel_volume_mm3 = float(spacing[0] * spacing[1] * spacing[2])
    unique_labels = sorted([int(x) for x in np.unique(array)])

    return {
        "dimensions_voxels_xyz": dimensions,
        "array_shape_zyx": list(array.shape),
        "voxel_spacing_mm_xyz": [round(float(s), 4) for s in spacing],
        "voxel_volume_mm3": round(voxel_volume_mm3, 4),
        "physical_origin_mm_xyz": [round(float(o), 4) for o in origin],
        "direction_matrix": direction.tolist(),
        "available_label_ids": unique_labels,
        "dtype": str(array.dtype),
    }


def get_label_voxel_counts(
    label_array: np.ndarray,
    spacing: Tuple[float, float, float],
    label_map: Optional[Dict[int, str]] = None,
) -> Dict[int, Dict[str, Any]]:
    """
    Calculate the number of voxels and physical volume (mm3) for each anatomical label.

    Parameters
    ----------
    label_array : np.ndarray
        3D numpy array of segmentation labels.
    spacing : tuple
        (sx, sy, sz) in mm.
    label_map : dict, optional
        Mapping from label int to structure name.

    Returns
    -------
    dict
        {label_id: {'name': name, 'voxel_count': count, 'volume_mm3': vol, 'present': bool}}
    """
    voxel_volume_mm3 = float(spacing[0] * spacing[1] * spacing[2])
    unique_labels, counts = np.unique(label_array, return_counts=True)
    count_dict = dict(zip([int(x) for x in unique_labels], [int(c) for c in counts]))

    results = {}
    # If label map is provided, iterate over target labels
    labels_to_check = label_map.keys() if label_map else count_dict.keys()

    for lid in labels_to_check:
        if lid == 0:
            continue  # Skip background
        count = count_dict.get(lid, 0)
        name = label_map.get(lid, f"label_{lid}") if label_map else f"label_{lid}"
        results[lid] = {
            "name": name,
            "voxel_count": count,
            "volume_mm3": round(count * voxel_volume_mm3, 2),
            "present": count > 0,
        }

    return results


def extract_cleaned_binary_mask(
    label_array: np.ndarray,
    label_id: int,
    keep_largest_only: bool = True,
    min_component_size_voxels: int = 50,
) -> np.ndarray:
    """
    Extract binary mask for a specific label ID and remove disconnected noise/speckles.

    Parameters
    ----------
    label_array : np.ndarray
        3D segmentation array.
    label_id : int
        The integer label to extract.
    keep_largest_only : bool
        If True, keeps only the single largest connected component (ideal for major bones like femur, tibia).
        If False, filters out all connected components smaller than min_component_size_voxels (useful for multi-focal cartilage).
    min_component_size_voxels : int
        Minimum number of voxels required to keep a connected component.

    Returns
    -------
    np.ndarray
        Cleaned boolean 3D mask.
    """
    raw_mask = (label_array == label_id)
    if not np.any(raw_mask):
        return np.zeros_like(label_array, dtype=bool)

    # 3D 26-connectivity structuring element
    structure = ndimage.generate_binary_structure(3, 3)
    labeled_components, num_features = ndimage.label(raw_mask, structure=structure)

    if num_features <= 1:
        return raw_mask

    # Calculate component sizes
    component_sizes = ndimage.sum(raw_mask, labeled_components, range(1, num_features + 1))
    component_sizes = np.array(component_sizes)

    if keep_largest_only:
        # Bone mode: keep the single largest contiguous structure
        largest_label = int(np.argmax(component_sizes) + 1)
        cleaned_mask = (labeled_components == largest_label)
    else:
        # Multi-component / cartilage mode: filter out components below min size
        valid_labels = np.where(component_sizes >= min_component_size_voxels)[0] + 1
        if len(valid_labels) == 0:
            # If all are below threshold, keep at least the largest one
            largest_label = int(np.argmax(component_sizes) + 1)
            cleaned_mask = (labeled_components == largest_label)
        else:
            cleaned_mask = np.isin(labeled_components, valid_labels)

    return cleaned_mask


def voxel_to_physical_coordinates(
    vertices_zyx: np.ndarray,
    affine: np.ndarray,
) -> np.ndarray:
    """
    Convert vertices from Marching Cubes array coordinates (Z, Y, X) to real
    physical patient coordinates in millimeters (LPS) using the image affine transformation.

    Parameters
    ----------
    vertices_zyx : np.ndarray
        Array of shape (N, 3) returned by skimage.measure.marching_cubes, where:
        col 0 = Z continuous index
        col 1 = Y continuous index
        col 2 = X continuous index
    affine : np.ndarray
        4x4 affine transformation matrix mapping (X, Y, Z) continuous indices to physical space.

    Returns
    -------
    np.ndarray
        Physical coordinates in mm with shape (N, 3).
    """
    if len(vertices_zyx) == 0:
        return np.empty((0, 3), dtype=np.float64)

    # Reorder (Z, Y, X) array indices to standard continuous image index (X, Y, Z)
    indices_xyz = np.column_stack([
        vertices_zyx[:, 2],  # X continuous index
        vertices_zyx[:, 1],  # Y continuous index
        vertices_zyx[:, 0],  # Z continuous index
    ])

    # Affine transform: P = indices_xyz @ R^T + T
    # where R = affine[:3, :3] and T = affine[:3, 3]
    physical_pts = indices_xyz @ affine[:3, :3].T + affine[:3, 3]
    return physical_pts.astype(np.float64)
