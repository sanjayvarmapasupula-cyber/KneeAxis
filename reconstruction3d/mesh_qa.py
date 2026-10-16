"""
Mesh Quality Assurance (QA) Module for Clinical Atlas 3D Knee Reconstruction
============================================================================
Calculates physical, topological, and geometric metrics for raw and smoothed meshes,
and computes volume drift to verify anatomical fidelity.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import trimesh


def calculate_mesh_qa(mesh: trimesh.Trimesh) -> Dict[str, Any]:
    """
    Calculate comprehensive QA metrics for a triangular mesh.

    Parameters
    ----------
    mesh : trimesh.Trimesh
        Trimesh triangular surface mesh with coordinates in physical millimeters.

    Returns
    -------
    dict
        Dictionary of computed quality assurance metrics:
        - vertices: int
        - faces: int
        - surface_area_mm2: float
        - volume_mm3: float
        - bounding_box_dimensions_mm: [dx, dy, dz]
        - watertight: bool
        - connected_components: int
        - euler_characteristic: int
        - is_winding_consistent: bool
    """
    if mesh is None or len(mesh.vertices) == 0 or len(mesh.faces) == 0:
        return {
            "vertices": 0,
            "faces": 0,
            "surface_area_mm2": 0.0,
            "volume_mm3": 0.0,
            "bounding_box_dimensions_mm": [0.0, 0.0, 0.0],
            "watertight": False,
            "connected_components": 0,
            "euler_characteristic": 0,
            "is_winding_consistent": False,
        }

    # Vertices and Faces count
    n_vertices = int(len(mesh.vertices))
    n_faces = int(len(mesh.faces))

    # Surface area in mm2
    try:
        surface_area = float(mesh.area)
    except Exception:
        surface_area = 0.0

    # Watertight status
    is_watertight = bool(mesh.is_watertight)

    # Volume calculation in mm3
    volume_mm3 = 0.0
    try:
        raw_vol = float(mesh.volume)
        if not np.isnan(raw_vol) and not np.isinf(raw_vol):
            volume_mm3 = abs(raw_vol)
        elif not is_watertight and hasattr(mesh, "convex_hull"):
            # Fallback for open sheets
            volume_mm3 = float(mesh.convex_hull.volume)
    except Exception:
        volume_mm3 = 0.0

    # Bounding box dimensions (dx, dy, dz) in mm
    try:
        extents = [round(float(dim), 3) for dim in mesh.bounding_box.extents]
    except Exception:
        extents = [0.0, 0.0, 0.0]

    # Connected components
    try:
        components = len(mesh.split(only_watertight=False))
    except Exception:
        components = 1

    # Euler characteristic: V - E + F (should be 2 for a closed sphere-like surface)
    try:
        euler_char = int(mesh.euler_number)
    except Exception:
        euler_char = 0

    # Winding consistency
    try:
        winding = bool(mesh.is_winding_consistent)
    except Exception:
        winding = False

    return {
        "vertices": n_vertices,
        "faces": n_faces,
        "surface_area_mm2": round(surface_area, 2),
        "volume_mm3": round(volume_mm3, 2),
        "bounding_box_dimensions_mm": extents,
        "watertight": is_watertight,
        "connected_components": components,
        "euler_characteristic": euler_char,
        "is_winding_consistent": winding,
    }


def calculate_volume_drift(raw_volume: float, smoothed_volume: float) -> float:
    """
    Calculate the percentage volume drift between raw and smoothed mesh.

    Formula:
        volume_drift_percent = ((smoothed_volume - raw_volume) / raw_volume) * 100

    Parameters
    ----------
    raw_volume : float
        Volume of the raw marching cubes mesh (mm3).
    smoothed_volume : float
        Volume of the Taubin-smoothed mesh (mm3).

    Returns
    -------
    float
        Percentage volume drift rounded to 3 decimal places.
    """
    if raw_volume is None or abs(raw_volume) < 1e-6:
        return 0.0
    drift = ((smoothed_volume - raw_volume) / raw_volume) * 100.0
    return round(float(drift), 3)


def generate_structure_qa_report(
    raw_mesh: trimesh.Trimesh,
    smoothed_mesh: trimesh.Trimesh,
    structure_name: str,
) -> Dict[str, Any]:
    """
    Compile complete QA report for an anatomical structure comparing raw and smoothed meshes.
    """
    raw_qa = calculate_mesh_qa(raw_mesh)
    smoothed_qa = calculate_mesh_qa(smoothed_mesh)
    drift = calculate_volume_drift(raw_qa["volume_mm3"], smoothed_qa["volume_mm3"])

    warnings: List[str] = []
    if not raw_qa["watertight"]:
        warnings.append(f"{structure_name}: Raw mesh is not completely watertight.")
    if not smoothed_qa["watertight"]:
        warnings.append(f"{structure_name}: Smoothed mesh is not completely watertight.")
    if abs(drift) > 2.0:
        warnings.append(
            f"{structure_name}: Noticeable volume drift ({drift}%) after smoothing exceeding 2% threshold."
        )

    return {
        "raw": raw_qa,
        "smoothed": smoothed_qa,
        "volume_drift_percent": drift,
        "warnings": warnings,
    }
