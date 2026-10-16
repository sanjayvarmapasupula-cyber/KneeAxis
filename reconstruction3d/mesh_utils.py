"""
Mesh Processing Utilities for Clinical Atlas 3D Knee Reconstruction
===================================================================
Handles Marching Cubes surface extraction, physical coordinate mapping,
Taubin anti-shrinkage smoothing, and STL/OBJ export.
"""

from pathlib import Path
from typing import Dict, Tuple, Optional
import numpy as np
import skimage.measure
import trimesh
try:
    from .medical_image_utils import voxel_to_physical_coordinates
except (ImportError, ValueError):
    try:
        from medical_image_utils import voxel_to_physical_coordinates
    except ImportError:
        from reconstruction3d.medical_image_utils import voxel_to_physical_coordinates


def marching_cubes_to_mesh(
    binary_mask: np.ndarray,
    affine: np.ndarray,
    step_size: int = 1,
) -> trimesh.Trimesh:
    """
    Extract a raw triangular surface mesh from a 3D binary mask using Marching Cubes,
    and convert all vertices into physical patient coordinates (millimeters).

    Parameters
    ----------
    binary_mask : np.ndarray
        3D boolean or binary array with shape (Z, Y, X).
    affine : np.ndarray
        4x4 affine transformation matrix mapping voxel index (X, Y, Z) to physical space.
    step_size : int, default=1
        Step size in voxels for Marching Cubes. Default is 1 for maximum anatomical fidelity.

    Returns
    -------
    trimesh.Trimesh
        Raw 3D triangular mesh in physical coordinates.

    Raises
    ------
    ValueError
        If the mask contains no foreground voxels or if Marching Cubes fails to extract triangles.
    """
    if not np.any(binary_mask):
        raise ValueError("Cannot perform Marching Cubes on an empty binary mask.")

    # Run scikit-image Marching Cubes
    # Note: array is in (Z, Y, X) order
    verts_zyx, faces, normals, values = skimage.measure.marching_cubes(
        binary_mask.astype(np.float32),
        level=0.5,
        step_size=step_size,
        allow_degenerate=False,
    )

    if len(verts_zyx) < 4 or len(faces) < 4:
        raise ValueError(
            f"Marching Cubes produced insufficient geometry: {len(verts_zyx)} vertices, {len(faces)} faces."
        )

    # Convert voxel array coordinates (Z, Y, X) to physical patient coordinates (mm)
    physical_vertices = voxel_to_physical_coordinates(verts_zyx, affine)

    # Check determinant of linear transformation to maintain outward normal winding
    det = np.linalg.det(affine[:3, :3])
    faces_copy = faces.copy()
    if det < 0:
        # Flip triangle winding to ensure correct outward-facing normals
        faces_copy = faces_copy[:, [0, 2, 1]]

    # Construct Trimesh object
    mesh = trimesh.Trimesh(
        vertices=physical_vertices,
        faces=faces_copy,
        process=True,
    )

    # Ensure normals are oriented outward
    mesh.fix_normals()

    return mesh


def apply_taubin_smoothing(
    mesh: trimesh.Trimesh,
    lamb: float = 0.5,
    nu: float = -0.53,
    iterations: int = 20,
) -> trimesh.Trimesh:
    """
    Apply Taubin smoothing to remove staircase voxel artifacts without shrinking the volume.

    Taubin smoothing alternates between positive (shrinkage) and negative (expansion)
    Laplacian steps: lambda > 0 and nu < -lambda, such that (1/lambda + 1/nu) > 0.
    This acts as a low-pass filter on vertex frequencies while preserving macroscopic volume.

    Parameters
    ----------
    mesh : trimesh.Trimesh
        Input raw mesh (will NOT be modified in-place; a smoothed clone is returned).
    lamb : float, default=0.5
        Positive scaling factor (lambda).
    nu : float, default=-0.53
        Negative scaling factor (mu / nu), must satisfy nu < -lamb.
    iterations : int, default=20
        Number of smoothing iteration pairs.

    Returns
    -------
    trimesh.Trimesh
        New smoothed mesh object.
    """
    # Create an independent clone so the original raw mesh is preserved unaltered
    smoothed_mesh = mesh.copy()

    # Apply Taubin filter
    trimesh.smoothing.filter_taubin(
        smoothed_mesh,
        lamb=lamb,
        nu=nu,
        iterations=iterations,
    )

    # Recompute and fix face and vertex normals
    smoothed_mesh.fix_normals()

    return smoothed_mesh


def export_mesh_file(mesh: trimesh.Trimesh, file_path: str | Path) -> str:
    """
    Export a trimesh to disk (STL or OBJ), ensuring parent directories exist.

    Parameters
    ----------
    mesh : trimesh.Trimesh
        Mesh to export.
    file_path : str or Path
        Target destination path ending in .stl or .obj.

    Returns
    -------
    str
        Resolved file path.
    """
    path = Path(file_path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    mesh.export(str(path))
    return str(path)


def export_structure_meshes(
    mesh: trimesh.Trimesh,
    output_dir: Path,
    structure_name: str,
    stage: str,  # 'raw' or 'smooth'
    export_stl: bool = True,
    export_obj: bool = True,
) -> Dict[str, str]:
    """
    Export both STL and OBJ formats for a given structure and stage.

    Returns
    -------
    dict
        {'stl': path_str, 'obj': path_str}
    """
    results = {}
    meshes_dir = output_dir / "meshes"
    meshes_dir.mkdir(parents=True, exist_ok=True)

    if export_stl:
        stl_path = meshes_dir / f"{structure_name}_{stage}.stl"
        export_mesh_file(mesh, stl_path)
        results["stl"] = str(stl_path)

    if export_obj:
        obj_path = meshes_dir / f"{structure_name}_{stage}.obj"
        export_mesh_file(mesh, obj_path)
        results["obj"] = str(obj_path)

    return results
