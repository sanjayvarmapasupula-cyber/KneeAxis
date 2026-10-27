import db from "../db/index.js";
import { sendError } from "../utils/response.js";
import { sanitizeId } from "../utils/paths.js";

/**
 * Middleware to enforce patient-level authorization and prevent IDOR.
 *
 * Rules:
 * 1. Must be authenticated (req.user must exist).
 * 2. Administrators ('admin') and Lead Orthopedic Surgeons ('surgeon') have supervisory access.
 * 3. Researchers and clinicians can only access patients they created (created_by) or are assigned to (assigned_to).
 * 4. Unassigned patients with no creator are restricted to admin/surgeon roles.
 */
export const requirePatientAccess = async (req, res, next) => {
  if (!req.user) {
    return sendError(res, "Authentication required to access patient data.", null, 401);
  }

  const rawPatientId = req.params.patientId || req.params.id;
  if (!rawPatientId) {
    return sendError(res, "Patient identifier missing from request parameters.", null, 400);
  }

  const safePatientId = sanitizeId(rawPatientId);

  try {
    const result = await db.query(
      "SELECT patient_id, name, created_by, assigned_to FROM patients WHERE patient_id = $1 OR CAST(id AS TEXT) = $1",
      [safePatientId]
    );

    if (result.rows.length === 0) {
      return sendError(res, `Patient with ID '${safePatientId}' not found.`, null, 404);
    }

    const patient = result.rows[0];
    const user = req.user;

    // 1. Privileged supervisory roles (admin, surgeon)
    if (user.role === "admin" || user.role === "surgeon") {
      req.patient = patient;
      return next();
    }

    // 2. Ownership check (user created the patient)
    if (patient.created_by && patient.created_by === user.id) {
      req.patient = patient;
      return next();
    }

    // 3. Assignment check (user is assigned to the patient)
    if (patient.assigned_to && patient.assigned_to === user.id) {
      req.patient = patient;
      return next();
    }

    // 4. Deny access if user does not own or have assignment to this patient
    return sendError(
      res,
      `Access denied: You do not have authorization to view or modify records for patient '${safePatientId}'.`,
      null,
      403
    );
  } catch (err) {
    return sendError(res, "Error verifying patient authorization.", err, 500);
  }
};

export default requirePatientAccess;
