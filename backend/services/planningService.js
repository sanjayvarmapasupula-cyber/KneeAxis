import path from "path";
import fs from "fs";
import { runPythonScript } from "./pythonService.js";
import db from "../db/index.js";
import { WORKSPACE_ROOT, getPatientSubdir, getPatientOutputDir } from "../utils/paths.js";

/**
 * Service to execute Individualized Kinematic Alignment (iKA) surgical planning
 */
export const executeIkaPlanning = async (patientId, options = {}) => {
  const scriptPath = path.join(WORKSPACE_ROOT, "planning", "ika_planner.py");
  const patientOutputDir = getPatientOutputDir(patientId);
  const meshesDir = path.join(patientOutputDir, "meshes");
  const planningDir = getPatientSubdir(patientId, "planning");

  const femurMesh = path.join(meshesDir, "femur_smooth.stl");
  const tibiaMesh = path.join(meshesDir, "tibia_smooth.stl");
  const targetPlanPath = path.join(planningDir, "ika_plan.json");

  if (!fs.existsSync(femurMesh) || !fs.existsSync(tibiaMesh)) {
    throw new Error(
      `Reconstructed femur and tibia meshes required for planning were not found in ${meshesDir}. Run 3D reconstruction first.`
    );
  }

  const args = [
    "--patient-id", patientId,
    "--femur", femurMesh,
    "--tibia", tibiaMesh,
    "--output", targetPlanPath,
  ];

  console.log(`[PlanningService] Executing iKA surgical planning for patient ${patientId}...`);
  await runPythonScript(scriptPath, args, { parseJson: true });

  if (!fs.existsSync(targetPlanPath)) {
    throw new Error(`iKA planner did not produce output at: ${targetPlanPath}`);
  }

  const planData = JSON.parse(fs.readFileSync(targetPlanPath, "utf-8"));

  // Store in PostgreSQL
  let recordId = null;
  try {
    const insertRes = await db.query(
      `INSERT INTO planning_records (
        patient_id, status, target_hip_knee_ankle_deg, resection_depth_femur_mm, resection_depth_tibia_mm,
        varus_valgus_angle_deg, flexion_extension_angle_deg, implant_size_femur, implant_size_tibia,
        poly_thickness_mm, notes, updated_at
      ) VALUES ($1, 'Draft', $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      ON CONFLICT (patient_id) DO UPDATE
      SET status = 'Draft',
          resection_depth_femur_mm = EXCLUDED.resection_depth_femur_mm,
          resection_depth_tibia_mm = EXCLUDED.resection_depth_tibia_mm,
          varus_valgus_angle_deg = EXCLUDED.varus_valgus_angle_deg,
          flexion_extension_angle_deg = EXCLUDED.flexion_extension_angle_deg,
          implant_size_femur = EXCLUDED.implant_size_femur,
          implant_size_tibia = EXCLUDED.implant_size_tibia,
          poly_thickness_mm = EXCLUDED.poly_thickness_mm,
          notes = EXCLUDED.notes,
          updated_at = CURRENT_TIMESTAMP
      RETURNING id`,
      [
        patientId,
        180.0,
        planData.resections?.distalFemurMedialMm || 8.5,
        planData.resections?.proximalTibiaMedialMm || 9.0,
        planData.implantAlignment?.varusValgusDeg || 0.0,
        planData.implantAlignment?.posteriorTibialSlopeDeg || 3.0,
        planData.implantRecommendation?.femurSize || "Size 5",
        planData.implantRecommendation?.tibiaSize || "Size 4",
        planData.implantRecommendation?.polyInsertThicknessMm || 10.0,
        planData.surgicalNote || "Restricted iKA plan: Restore patient constitutional joint line.",
      ]
    );
    recordId = insertRes.rows[0]?.id;

    // Update patient review status
    await db.query(
      `UPDATE patients SET review_status = 'Pending Review', updated_at = CURRENT_TIMESTAMP WHERE patient_id = $1`,
      [patientId]
    );
  } catch (dbErr) {
    console.warn(`[PlanningService] Could not persist plan to PostgreSQL: ${dbErr.message}`);
  }

  return {
    patientId,
    plan: planData,
    planFile: targetPlanPath,
    recordId,
  };
};
