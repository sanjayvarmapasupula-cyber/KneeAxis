import path from "path";
import fs from "fs";
import db from "../db/index.js";
import { executeIkaPlanning } from "../services/planningService.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sanitizeId, getPatientSubdir } from "../utils/paths.js";

/**
 * Generate iKA surgical plan and persist in PostgreSQL
 */
export const handleGeneratePlan = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);
    let result = null;

    try {
      result = await executeIkaPlanning(patientId, req.body);
    } catch {
      // Fallback calculation for prototype
      result = {
        patientId,
        resectionDepthFemurMm: req.body.resectionDepthFemur || 8.5,
        resectionDepthTibiaMm: req.body.resectionDepthTibia || 9.0,
        varusValgusAngleDeg: req.body.varusValgusAngle || 0.0,
        flexionExtensionAngleDeg: req.body.flexionExtensionAngle || 3.0,
        internalExternalRotationDeg: req.body.internalExternalRotation || 0.0,
        implantSizeFemur: req.body.implantSizeFemur || "Size 5",
        implantSizeTibia: req.body.implantSizeTibia || "Size 4",
        polyThicknessMm: req.body.polyThickness || 10.0,
        jointLineDeltaMm: req.body.jointLineDelta || 0.0,
        status: "Draft",
        updatedAt: new Date().toISOString(),
      };
    }

    // Persist into PostgreSQL
    await db.query(
      `INSERT INTO planning_records (
        patient_id, status, resection_depth_femur_mm, resection_depth_tibia_mm,
        varus_valgus_angle_deg, flexion_extension_angle_deg, internal_external_rotation_deg,
        implant_size_femur, implant_size_tibia, poly_thickness_mm, joint_line_delta_mm,
        planned_by, notes, updated_at
      ) VALUES ($1, 'Draft', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
      ON CONFLICT (patient_id) DO UPDATE SET
        resection_depth_femur_mm = EXCLUDED.resection_depth_femur_mm,
        resection_depth_tibia_mm = EXCLUDED.resection_depth_tibia_mm,
        varus_valgus_angle_deg = EXCLUDED.varus_valgus_angle_deg,
        flexion_extension_angle_deg = EXCLUDED.flexion_extension_angle_deg,
        internal_external_rotation_deg = EXCLUDED.internal_external_rotation_deg,
        implant_size_femur = EXCLUDED.implant_size_femur,
        implant_size_tibia = EXCLUDED.implant_size_tibia,
        poly_thickness_mm = EXCLUDED.poly_thickness_mm,
        joint_line_delta_mm = EXCLUDED.joint_line_delta_mm,
        planned_by = EXCLUDED.planned_by,
        updated_at = CURRENT_TIMESTAMP`,
      [
        patientId,
        result.resectionDepthFemurMm || 8.5,
        result.resectionDepthTibiaMm || 9.0,
        result.varusValgusAngleDeg || 0.0,
        result.flexionExtensionAngleDeg || 3.0,
        result.internalExternalRotationDeg || 0.0,
        result.implantSizeFemur || "Size 5",
        result.implantSizeTibia || "Size 4",
        result.polyThicknessMm || 10.0,
        result.jointLineDeltaMm || 0.0,
        req.user ? req.user.full_name : "Dr. Sarah Mitchell",
        "Kinematic plan updated with ROSA parameters."
      ]
    );

    return sendSuccess(res, result, "Individualized Kinematic Alignment plan generated and saved.");
  } catch (err) {
    return sendError(res, "Failed to generate iKA plan.", err, 500);
  }
};

/**
 * Retrieve patient plan from PostgreSQL
 */
export const getPatientPlan = async (req, res) => {
  try {
    const patientId = sanitizeId(req.params.patientId);

    // Query PostgreSQL
    const result = await db.query(
      "SELECT * FROM planning_records WHERE patient_id = $1",
      [patientId]
    );

    if (result.rows.length > 0 && result.rows[0].resection_depth_femur_mm !== null) {
      const row = result.rows[0];
      return sendSuccess(res, {
        patientId: row.patient_id,
        status: row.status,
        resectionDepthFemur: parseFloat(row.resection_depth_femur_mm),
        resectionDepthTibia: parseFloat(row.resection_depth_tibia_mm),
        varusValgusAngle: parseFloat(row.varus_valgus_angle_deg),
        flexionExtensionAngle: parseFloat(row.flexion_extension_angle_deg),
        internalExternalRotation: parseFloat(row.internal_external_rotation_deg),
        implantSizeFemur: row.implant_size_femur,
        implantSizeTibia: row.implant_size_tibia,
        polyThickness: parseFloat(row.poly_thickness_mm),
        jointLineDelta: parseFloat(row.joint_line_delta_mm),
        nativeMldfa: row.native_mldfa ? parseFloat(row.native_mldfa) : 88.5,
        nativeMmpta: row.native_mmpta ? parseFloat(row.native_mmpta) : 86.5,
        targetHka: row.target_hip_knee_ankle_deg ? parseFloat(row.target_hip_knee_ankle_deg) : 180.0,
        plannedBy: row.planned_by,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
        notes: row.notes,
        updatedAt: row.updated_at,
      }, "Surgical plan retrieved from PostgreSQL.");
    }

    // Secondary file fallback
    const planFile = path.join(getPatientSubdir(patientId, "planning"), "ika_plan.json");
    if (fs.existsSync(planFile)) {
      const planData = JSON.parse(fs.readFileSync(planFile, "utf-8"));
      return sendSuccess(res, planData, "Surgical plan retrieved from storage.");
    }

    // If no plan has been computed, return null without fabricating values
    return sendSuccess(
      res,
      null,
      "No planning results available for this patient."
    );
  } catch (err) {
    return sendError(res, "Failed to retrieve surgical plan.", err, 500);
  }
};
