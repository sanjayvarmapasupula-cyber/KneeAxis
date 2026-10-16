"""
Main 3D Reconstruction Pipeline for Clinical Atlas
==================================================
Converts 3D medical segmentation label maps into clean, anatomically accurate,
physical-coordinate-calibrated 3D triangular surface meshes (STL and OBJ)
with Taubin anti-shrinkage smoothing and comprehensive QA.

Can be run via:
1. Python API:
   from reconstruction3d.reconstruct_3d import generate_meshes
   generate_meshes("segmentation.nii.gz", "outputs/case_001")

2. Command Line Interface:
   python reconstruct_3d.py --segmentation segmentation.nii.gz --output outputs/case_001
"""

import sys
import json
import logging
import argparse
from pathlib import Path
from typing import Dict, Any, Optional, Union

import numpy as np

# Ensure directory is on sys.path for direct CLI calls
_CURRENT_DIR = Path(__file__).resolve().parent
_PARENT_DIR = _CURRENT_DIR.parent
for _p in [str(_CURRENT_DIR), str(_PARENT_DIR)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from medical_image_utils import (
        load_medical_image,
        validate_segmentation,
        get_image_metadata,
        get_label_voxel_counts,
        extract_cleaned_binary_mask,
    )
    from mesh_utils import (
        marching_cubes_to_mesh,
        apply_taubin_smoothing,
        export_structure_meshes,
    )
    from mesh_qa import generate_structure_qa_report
except ImportError:
    from reconstruction3d.medical_image_utils import (
        load_medical_image,
        validate_segmentation,
        get_image_metadata,
        get_label_voxel_counts,
        extract_cleaned_binary_mask,
    )
    from reconstruction3d.mesh_utils import (
        marching_cubes_to_mesh,
        apply_taubin_smoothing,
        export_structure_meshes,
    )
    from reconstruction3d.mesh_qa import generate_structure_qa_report

# Configure logger
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("reconstruction3d")

# Default label map for OAIZIB-CM dataset
DEFAULT_LABEL_MAP: Dict[int, str] = {
    1: "femur",
    2: "femoral_cartilage",
    3: "tibia",
    4: "medial_tibial_cartilage",
    5: "lateral_tibial_cartilage",
}


def load_label_config(config_path_or_dict: Optional[Union[str, Path, Dict[Any, str]]]) -> Dict[int, str]:
    """
    Parse label map from dictionary, JSON file, or default.
    Ensures keys are integer IDs and values are clean strings.
    """
    if config_path_or_dict is None:
        return DEFAULT_LABEL_MAP.copy()

    if isinstance(config_path_or_dict, dict):
        return {int(k): str(v).strip().lower().replace(" ", "_") for k, v in config_path_or_dict.items()}

    cfg_path = Path(config_path_or_dict)
    if not cfg_path.is_file():
        raise FileNotFoundError(f"Label configuration file not found: {cfg_path}")

    with open(cfg_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return {int(k): str(v).strip().lower().replace(" ", "_") for k, v in data.items()}


def generate_meshes(
    segmentation_path: Union[str, Path],
    output_directory: Union[str, Path],
    label_map: Optional[Union[Dict[int, str], str, Path]] = None,
    case_id: Optional[str] = None,
    taubin_lambda: float = 0.5,
    taubin_nu: float = -0.53,
    taubin_iterations: int = 20,
    keep_largest_component: bool = True,
    export_stl: bool = True,
    export_obj: bool = True,
    step_size: int = 1,
) -> Dict[str, Any]:
    """
    Independent reusable 3D reconstruction pipeline.

    Converts a 3D medical image segmentation mask into physical-coordinate
    STL and OBJ surface meshes, applies Taubin smoothing, and writes
    mesh_qa.json and mesh_manifest.json.

    Parameters
    ----------
    segmentation_path : str or Path
        Path to segmentation label map (e.g. segmentation.nii.gz).
    output_directory : str or Path
        Target folder where meshes/ and manifest JSONs will be saved.
    label_map : dict, str, or Path, optional
        Anatomical label configuration. Defaults to OAIZIB-CM labels.
    case_id : str, optional
        Identifier for the patient/scan case. If None, derived from output folder name.
    taubin_lambda : float, default=0.5
        Taubin positive scale parameter.
    taubin_nu : float, default=-0.53
        Taubin negative scale parameter (must satisfy nu < -lambda).
    taubin_iterations : int, default=20
        Number of Taubin smoothing iterations.
    keep_largest_component : bool, default=True
        Whether to keep the largest connected component for bones to remove speckles.
    export_stl : bool, default=True
        Whether to export .stl meshes.
    export_obj : bool, default=True
        Whether to export .obj meshes.
    step_size : int, default=1
        Marching cubes step size in voxels.

    Returns
    -------
    dict
        Execution results containing status, manifest, qa_report, and paths.
    """
    seg_path = Path(segmentation_path).resolve()
    out_dir = Path(output_directory).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    meshes_dir = out_dir / "meshes"
    meshes_dir.mkdir(parents=True, exist_ok=True)

    if case_id is None:
        case_id = out_dir.name

    labels = load_label_config(label_map)

    logger.info(f"--- Starting 3D Reconstruction for Case: {case_id} ---")
    logger.info(f"Input segmentation: {seg_path}")
    logger.info(f"Output directory:   {out_dir}")
    logger.info(f"Active Label Map:   {labels}")

    # 1. Load medical image and extract spatial metadata
    image_data = load_medical_image(seg_path)
    validate_segmentation(image_data)

    metadata = get_image_metadata(image_data)
    label_array = image_data["array"]
    affine = image_data["affine"]
    spacing = image_data["spacing"]

    logger.info(
        f"Image Dimensions (XYZ): {metadata['dimensions_voxels_xyz']} voxels | "
        f"Spacing: {metadata['voxel_spacing_mm_xyz']} mm"
    )
    logger.info(f"Available Labels in Mask: {metadata['available_label_ids']}")

    # 2. Check voxel counts per target label
    voxel_stats = get_label_voxel_counts(label_array, spacing, labels)

    mesh_qa_dict: Dict[str, Any] = {
        "case_id": case_id,
        "metadata": {
            "source_segmentation": str(seg_path.name),
            "dimensions_xyz": metadata["dimensions_voxels_xyz"],
            "spacing_mm_xyz": metadata["voxel_spacing_mm_xyz"],
            "taubin_parameters": {
                "lambda": taubin_lambda,
                "nu": taubin_nu,
                "iterations": taubin_iterations,
            },
        },
    }

    manifest_meshes = []
    generated_files = []

    # 3. Process each anatomical structure individually
    for label_id, structure_name in labels.items():
        logger.info(f"Processing label {label_id}: '{structure_name}'...")

        stat = voxel_stats.get(label_id, {"voxel_count": 0, "present": False})
        if not stat["present"] or stat["voxel_count"] == 0:
            logger.warning(
                f"Label {label_id} ('{structure_name}') is ABSENT in segmentation. Skipping cleanly."
            )
            continue

        logger.info(
            f"-> Found {stat['voxel_count']} voxels ({stat['volume_mm3']} mm³) for '{structure_name}'."
        )

        # 4. Extract cleaned binary mask (remove tiny disconnected noise)
        # For bones (femur, tibia), keep single largest component.
        # For cartilage, keep components above threshold to preserve thin contact patches.
        is_bone = "cartilage" not in structure_name.lower()
        cleaned_mask = extract_cleaned_binary_mask(
            label_array=label_array,
            label_id=label_id,
            keep_largest_only=(keep_largest_component if is_bone else False),
            min_component_size_voxels=50,
        )

        if not np.any(cleaned_mask):
            logger.warning(
                f"Label {label_id} ('{structure_name}') has no voxels remaining after noise cleaning."
            )
            continue

        # 5. Marching Cubes -> Raw Triangular Mesh (in physical mm coordinates)
        try:
            raw_mesh = marching_cubes_to_mesh(
                binary_mask=cleaned_mask,
                affine=affine,
                step_size=step_size,
            )
        except Exception as mc_err:
            logger.error(f"Marching Cubes failed for '{structure_name}': {mc_err}")
            continue

        # 6. Apply Taubin Anti-Shrinkage Smoothing
        try:
            smoothed_mesh = apply_taubin_smoothing(
                mesh=raw_mesh,
                lamb=taubin_lambda,
                nu=taubin_nu,
                iterations=taubin_iterations,
            )
        except Exception as smooth_err:
            logger.warning(
                f"Taubin smoothing failed for '{structure_name}' ({smooth_err}). Falling back to raw mesh."
            )
            smoothed_mesh = raw_mesh.copy()

        # 7. Mesh QA Calculation (Before and After Smoothing)
        qa_report = generate_structure_qa_report(
            raw_mesh=raw_mesh,
            smoothed_mesh=smoothed_mesh,
            structure_name=structure_name,
        )
        mesh_qa_dict[structure_name] = qa_report

        logger.info(
            f"-> '{structure_name}' QA: "
            f"Raw Vol={qa_report['raw']['volume_mm3']} mm³, "
            f"Smooth Vol={qa_report['smoothed']['volume_mm3']} mm³, "
            f"Drift={qa_report['volume_drift_percent']}%, "
            f"Watertight={qa_report['smoothed']['watertight']}"
        )

        # 8. Export Mesh Files (Raw and Smooth; STL and OBJ)
        raw_exported = export_structure_meshes(
            mesh=raw_mesh,
            output_dir=out_dir,
            structure_name=structure_name,
            stage="raw",
            export_stl=export_stl,
            export_obj=export_obj,
        )

        smooth_exported = export_structure_meshes(
            mesh=smoothed_mesh,
            output_dir=out_dir,
            structure_name=structure_name,
            stage="smooth",
            export_stl=export_stl,
            export_obj=export_obj,
        )

        generated_files.extend(list(raw_exported.values()))
        generated_files.extend(list(smooth_exported.values()))

        # 9. Register in Manifest
        manifest_entry: Dict[str, Any] = {
            "name": structure_name,
            "label": label_id,
            "stl": f"meshes/{structure_name}_smooth.stl" if export_stl else None,
            "obj": f"meshes/{structure_name}_smooth.obj" if export_obj else None,
            "stl_raw": f"meshes/{structure_name}_raw.stl" if export_stl else None,
            "obj_raw": f"meshes/{structure_name}_raw.obj" if export_obj else None,
            "volume_mm3": qa_report["smoothed"]["volume_mm3"],
            "surface_area_mm2": qa_report["smoothed"]["surface_area_mm2"],
            "watertight": qa_report["smoothed"]["watertight"],
        }
        manifest_meshes.append(manifest_entry)

    # 10. Write mesh_qa.json in both root and qa/ directory
    qa_path = out_dir / "mesh_qa.json"
    qa_dir = out_dir / "qa"
    qa_dir.mkdir(parents=True, exist_ok=True)
    qa_sub_path = qa_dir / "mesh_qa.json"

    with open(qa_path, "w", encoding="utf-8") as f:
        json.dump(mesh_qa_dict, f, indent=4)
    with open(qa_sub_path, "w", encoding="utf-8") as f:
        json.dump(mesh_qa_dict, f, indent=4)

    generated_files.append(str(qa_path))
    generated_files.append(str(qa_sub_path))

    # 11. Write mesh_manifest.json
    manifest_dict = {
        "case_id": case_id,
        "total_structures": len(manifest_meshes),
        "meshes": manifest_meshes,
    }
    manifest_path = out_dir / "mesh_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_dict, f, indent=4)
    generated_files.append(str(manifest_path))

    logger.info(f"Reconstruction successfully completed for case '{case_id}'!")
    logger.info(f"Generated {len(manifest_meshes)} anatomical structures.")
    logger.info(f"QA report saved to:      {qa_path}")
    logger.info(f"Mesh manifest saved to:  {manifest_path}")

    return {
        "status": "success",
        "case_id": case_id,
        "output_directory": str(out_dir),
        "manifest": manifest_dict,
        "qa_report": mesh_qa_dict,
        "generated_files": generated_files,
    }


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Clinical Atlas 3D Medical Mesh Reconstruction Pipeline (CPU-compatible)."
    )
    parser.add_argument(
        "--segmentation",
        "-s",
        type=str,
        required=True,
        help="Path to the input segmentation NIfTI file (e.g. segmentation.nii.gz).",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        required=True,
        help="Path to the output folder (e.g. outputs/case_001).",
    )
    parser.add_argument(
        "--config",
        "-c",
        type=str,
        default=None,
        help="Optional path to label configuration JSON file (e.g. labels.json).",
    )
    parser.add_argument(
        "--case-id",
        type=str,
        default=None,
        help="Optional case/patient ID. Defaults to output directory basename.",
    )
    parser.add_argument(
        "--taubin-iter",
        type=int,
        default=20,
        help="Number of Taubin smoothing iterations (default: 20).",
    )
    parser.add_argument(
        "--taubin-lambda",
        type=float,
        default=0.5,
        help="Taubin positive scale factor lambda (default: 0.5).",
    )
    parser.add_argument(
        "--taubin-nu",
        type=float,
        default=-0.53,
        help="Taubin negative scale factor nu (default: -0.53).",
    )
    parser.add_argument(
        "--no-stl",
        action="store_true",
        help="Disable STL mesh export.",
    )
    parser.add_argument(
        "--no-obj",
        action="store_true",
        help="Disable OBJ mesh export.",
    )
    return parser.parse_args()


def main():
    """Command-line entry point."""
    args = parse_args()
    try:
        results = generate_meshes(
            segmentation_path=args.segmentation,
            output_directory=args.output,
            label_map=args.config,
            case_id=args.case_id,
            taubin_lambda=args.taubin_lambda,
            taubin_nu=args.taubin_nu,
            taubin_iterations=args.taubin_iter,
            export_stl=not args.no_stl,
            export_obj=not args.no_obj,
        )
        print("\n" + "=" * 60)
        print(f"3D RECONSTRUCTION COMPLETE: Case '{results['case_id']}'")
        print("=" * 60)
        print(f"Total Meshes Generated: {results['manifest']['total_structures']}")
        for m in results["manifest"]["meshes"]:
            print(f"  - {m['name']} (Label {m['label']}): Vol = {m['volume_mm3']} mm³")
        print(f"Manifest: {results['output_directory']}/mesh_manifest.json")
        print(f"QA Stats: {results['output_directory']}/mesh_qa.json")
        print("=" * 60)
    except Exception as exc:
        logger.error(f"Reconstruction failed: {exc}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
