"""
Clinical Atlas - 3D Knee Reconstruction Module
==============================================
Independent, CPU-compatible 3D medical surface mesh reconstruction pipeline
converting segmentation masks (ground truth or model prediction) into physical-coordinate
STL/OBJ meshes with Taubin anti-shrinkage smoothing and quality assurance metrics.
"""

from .reconstruct_3d import generate_meshes, DEFAULT_LABEL_MAP, load_label_config
from .medical_image_utils import (
    load_medical_image,
    validate_segmentation,
    get_image_metadata,
    get_label_voxel_counts,
    extract_cleaned_binary_mask,
    voxel_to_physical_coordinates,
)
from .mesh_utils import (
    marching_cubes_to_mesh,
    apply_taubin_smoothing,
    export_mesh_file,
    export_structure_meshes,
)
from .mesh_qa import (
    calculate_mesh_qa,
    calculate_volume_drift,
    generate_structure_qa_report,
)

__version__ = "1.0.0"

__all__ = [
    "generate_meshes",
    "DEFAULT_LABEL_MAP",
    "load_label_config",
    "load_medical_image",
    "validate_segmentation",
    "get_image_metadata",
    "get_label_voxel_counts",
    "extract_cleaned_binary_mask",
    "voxel_to_physical_coordinates",
    "marching_cubes_to_mesh",
    "apply_taubin_smoothing",
    "export_mesh_file",
    "export_structure_meshes",
    "calculate_mesh_qa",
    "calculate_volume_drift",
    "generate_structure_qa_report",
]
