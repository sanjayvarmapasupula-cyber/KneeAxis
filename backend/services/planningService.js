import path from "path";
import fs from "fs";
import { runPythonScript } from "./pythonService.js";
import { PlanningRecord } from "../models/PlanningRecord.js";
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

  // Store in MongoDB
  let record = null;
  try {
    record = await PlanningRecord.create({
      patientId,
      planningType: "iKA",
      parameters: {
        distalFemoralResectionMm: planData.resections.distalFemurMedialMm,
        posteriorFemoralResectionMm: planData.resections.posteriorFemurMedialMm,
        proximalTibialResectionMm: planData.resections.proximalTibiaMedialMm,
        femoralVarusValgusDeg: planData.implantAlignment.femoralVarusValgusDeg,
        tibialVarusValgusDeg: planData.implantAlignment.tibialVarusValgusDeg,
        tibialSlopeDeg: planData.implantAlignment.posteriorTibialSlopeDeg,
        implantSizes: {
          femur: planData.implantRecommendation.femurSize,
          tibia: planData.implantRecommendation.tibiaSize,
          insertMm: planData.implantRecommendation.polyInsertThicknessMm,
        },
      },
      clinicianNotes: planData.surgicalNote,
      status: "finalized",
    });
  } catch (dbErr) {
    console.warn(`[PlanningService] Could not persist plan to MongoDB: ${dbErr.message}`);
  }

  return {
    patientId,
    plan: planData,
    planFile: targetPlanPath,
    recordId: record ? record._id : null,
  };
};
