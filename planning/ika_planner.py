"""
Individualized Kinematic Alignment (iKA) Surgical Planner
=========================================================
Extracts patient landmarks, calculates constitutional joint line obliquity,
enforces rKA/iKA safe boundaries, and outputs patient-specific resection depths.

Output destination:
  outputs/patients/{patientId}/planning/ika_plan.json
"""

import sys
import json
import argparse
from pathlib import Path
import trimesh

try:
    from .landmark_utils import extract_femur_landmarks, extract_tibia_landmarks
    from .alignment_utils import calculate_alignment_angles, enforce_ika_safe_boundaries
except ImportError:
    from landmark_utils import extract_femur_landmarks, extract_tibia_landmarks
    from alignment_utils import calculate_alignment_angles, enforce_ika_safe_boundaries


def generate_ika_plan(
    patient_id: str,
    femur_mesh_path: str | Path,
    tibia_mesh_path: str | Path,
    output_plan_path: str | Path | None = None,
    implant_thickness_mm: float = 9.0,
) -> dict:
    """
    Generate complete individualized Kinematic Alignment plan for a patient.
    """
    femur_p = Path(femur_mesh_path)
    tibia_p = Path(tibia_mesh_path)

    if not femur_p.is_file():
        raise FileNotFoundError(f"Femur mesh file not found: {femur_p}")
    if not tibia_p.is_file():
        raise FileNotFoundError(f"Tibia mesh file not found: {tibia_p}")

    femur_mesh = trimesh.load(str(femur_p))
    tibia_mesh = trimesh.load(str(tibia_p))

    # 1. Landmark extraction
    femur_landmarks = extract_femur_landmarks(femur_mesh)
    tibia_landmarks = extract_tibia_landmarks(tibia_mesh)

    # 2. Alignment angle computation
    angles = calculate_alignment_angles(femur_landmarks, tibia_landmarks)

    # 3. Restricted Kinematic Alignment boundary check
    boundary_results = enforce_ika_safe_boundaries(angles)

    # 4. Resection thickness calculation (bone resection matching implant thickness)
    femoral_valgus_cut = boundary_results["planned_femoral_cut_deg"]
    tibial_varus_cut = boundary_results["planned_tibial_cut_deg"]

    # Typical wear estimation for osteoarthritis: 2mm medial cartilage loss
    wear_adjustment_mm = 2.0 if angles["constitutional_phenotype"] == "Varus" else 0.0

    distal_medial_resection = round(implant_thickness_mm - wear_adjustment_mm, 1)
    distal_lateral_resection = round(implant_thickness_mm, 1)

    posterior_medial_resection = round(implant_thickness_mm - 0.5, 1)
    posterior_lateral_resection = round(implant_thickness_mm - 1.0, 1)

    proximal_tibial_medial = round(implant_thickness_mm - 1.5, 1)
    proximal_tibial_lateral = round(implant_thickness_mm, 1)

    plan = {
        "patientId": patient_id,
        "planningType": "iKA (Individualized Kinematic Alignment)",
        "phenotype": angles["constitutional_phenotype"],
        "landmarks": {
            "femur": femur_landmarks,
            "tibia": tibia_landmarks,
        },
        "coronalAngles": angles,
        "boundaryValidation": boundary_results,
        "resections": {
            "distalFemurMedialMm": distal_medial_resection,
            "distalFemurLateralMm": distal_lateral_resection,
            "posteriorFemurMedialMm": posterior_medial_resection,
            "posteriorFemurLateralMm": posterior_lateral_resection,
            "proximalTibiaMedialMm": proximal_tibial_medial,
            "proximalTibiaLateralMm": proximal_tibial_lateral,
        },
        "implantAlignment": {
            "femoralVarusValgusDeg": femoral_valgus_cut,
            "tibialVarusValgusDeg": tibial_varus_cut,
            "posteriorTibialSlopeDeg": 3.0,
            "femoralExternalRotationTEA_deg": 0.0, # parallel to surgical TEA
        },
        "implantRecommendation": {
            "femurSize": "Medium (Size 5)",
            "tibiaSize": "Medium (Size 4)",
            "polyInsertThicknessMm": 9.0,
        },
        "surgicalNote": (
            f"Restricted iKA plan: Restore patient constitutional {angles['constitutional_phenotype'].lower()} joint line "
            f"with {distal_medial_resection}mm medial cut and {distal_lateral_resection}mm lateral cut."
        ),
    }

    if output_plan_path:
        out_p = Path(output_plan_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(plan, f, indent=2)
        print(f"[iKA Planner] Plan saved to: {out_p}")

    return plan


def parse_args():
    parser = argparse.ArgumentParser(description="Clinical Atlas iKA Surgical Planner")
    parser.add_argument("--patient-id", required=True, help="Patient identifier (e.g. P001)")
    parser.add_argument("--femur", required=False, help="Path to femur_smooth.stl")
    parser.add_argument("--tibia", required=False, help="Path to tibia_smooth.stl")
    parser.add_argument("--output", required=False, help="Target plan JSON output path")
    return parser.parse_args()


def main():
    args = parse_args()
    patient_id = args.patient_id

    # Default paths if not provided
    base_patient_dir = Path("outputs") / "patients" / patient_id
    femur_path = Path(args.femur) if args.femur else (base_patient_dir / "meshes" / "femur_smooth.stl")
    tibia_path = Path(args.tibia) if args.tibia else (base_patient_dir / "meshes" / "tibia_smooth.stl")
    output_path = Path(args.output) if args.output else (base_patient_dir / "planning" / "ika_plan.json")

    try:
        plan = generate_ika_plan(
            patient_id=patient_id,
            femur_mesh_path=femur_path,
            tibia_mesh_path=tibia_path,
            output_plan_path=output_path,
        )
        print(json.dumps({
            "status": "success",
            "patientId": patient_id,
            "phenotype": plan["phenotype"],
            "planFile": str(output_path),
        }, indent=2))
    except Exception as exc:
        sys.stderr.write(f"iKA Planning error: {exc}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
