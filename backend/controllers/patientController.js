import db from "../db/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sanitizeId } from "../utils/paths.js";

/**
 * Create a new clinical patient record in PostgreSQL
 */
export const createPatient = async (req, res) => {
  try {
    const { patientId, name, age, gender, affectedKnee, clinicalNotes, urgency } = req.body;

    if (!patientId || !name) {
      return sendError(res, "patientId and name are required fields.", null, 400);
    }

    const safeId = sanitizeId(patientId);
    const patientAge = parseInt(age, 10) || 50;
    const patientGender = gender || "Female";
    const knee = affectedKnee || "Right";
    const patientUrgency = urgency || "Routine";

    const insertRes = await db.query(
      `INSERT INTO patients (patient_id, name, age, gender, affected_knee, urgency, clinical_notes, imaging_status, segmentation_status, reconstruction_status, review_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', 'Pending', 'Pending', 'Draft')
       RETURNING *`,
      [safeId, name.trim(), patientAge, patientGender, knee, patientUrgency, clinicalNotes || ""]
    );

    const newPatient = insertRes.rows[0];

    // Create default imaging study record
    try {
      await db.query(
        `INSERT INTO imaging_studies (study_id, patient_id, modality, study_type, slice_count)
         VALUES ($1, $2, 'CT', 'Pre-Op Knee Protocol', 420)
         ON CONFLICT (study_id) DO NOTHING`,
        [`CT-${safeId}`, safeId]
      );

      // Create default planning record
      await db.query(
        `INSERT INTO planning_records (patient_id, status, planned_by)
         VALUES ($1, 'Draft', $2)
         ON CONFLICT (patient_id) DO NOTHING`,
        [safeId, req.user ? req.user.full_name : "Dr. Sarah Mitchell"]
      );

      // Log in audit trail
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES ($1, 'PATIENT_ENROLLMENT', $2, $3, $4, $5)`,
        [
          safeId,
          req.user ? req.user.email : "system@clinicalatlas.demo",
          req.user ? req.user.full_name : "Clinical Registrar",
          req.user ? req.user.role : "surgeon",
          `Enrolled patient ${name} (${safeId}) for ROSA knee assessment.`
        ]
      );
    } catch {}

    return sendSuccess(res, {
      id: newPatient.patient_id,
      patientId: newPatient.patient_id,
      name: newPatient.name,
      age: newPatient.age,
      gender: newPatient.gender,
      kneeSide: newPatient.affected_knee,
      urgency: newPatient.urgency,
      clinicalNotes: newPatient.clinical_notes,
      imagingStatus: newPatient.imaging_status,
      segmentationStatus: newPatient.segmentation_status,
      reconstructionStatus: newPatient.reconstruction_status,
      reviewStatus: newPatient.review_status,
      createdAt: newPatient.created_at,
    }, "Patient created successfully in PostgreSQL.", 201);
  } catch (err) {
    if (err.message.includes("unique") || err.message.includes("duplicate")) {
      return sendError(res, "A patient with this ID already exists.", null, 409);
    }
    return sendError(res, "Failed to create patient record.", err, 500);
  }
};

/**
 * Get all clinical patients from PostgreSQL
 */
export const getAllPatients = async (req, res) => {
  try {
    const { search, urgency, status } = req.query;

    let queryText = "SELECT * FROM patients WHERE 1=1";
    const queryParams = [];

    if (search) {
      queryParams.push(`%${search.toLowerCase()}%`);
      queryText += ` AND (LOWER(name) LIKE $${queryParams.length} OR LOWER(patient_id) LIKE $${queryParams.length})`;
    }

    if (urgency) {
      queryParams.push(urgency);
      queryText += ` AND urgency = $${queryParams.length}`;
    }

    if (status) {
      queryParams.push(status);
      queryText += ` AND review_status = $${queryParams.length}`;
    }

    queryText += " ORDER BY updated_at DESC, id DESC";

    const result = await db.query(queryText, queryParams);

    const patients = result.rows.map((p) => ({
      id: p.patient_id,
      patientId: p.patient_id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      kneeSide: p.affected_knee,
      urgency: p.urgency,
      clinicalNotes: p.clinical_notes,
      imagingDate: p.created_at ? new Date(p.created_at).toISOString().split("T")[0] : "2026-09-15",
      lastUpdated: p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : "2026-09-20",
      imagingStatus: p.imaging_status,
      segmentationStatus: p.segmentation_status,
      reconstructionStatus: p.reconstruction_status,
      reviewStatus: p.review_status,
      studyId: `CT-${p.patient_id}`,
      notes: p.clinical_notes,
    }));

    return sendSuccess(res, patients, "Patients retrieved successfully from PostgreSQL.");
  } catch (err) {
    return sendError(res, "Failed to retrieve patients.", err, 500);
  }
};

/**
 * Get patient details by ID from PostgreSQL
 */
export const getPatientById = async (req, res) => {
  try {
    const safeId = sanitizeId(req.params.id);

    const result = await db.query(
      "SELECT * FROM patients WHERE patient_id = $1",
      [safeId]
    );

    if (result.rows.length === 0) {
      return sendError(res, `Patient with ID '${safeId}' not found.`, null, 404);
    }

    const p = result.rows[0];

    // Fetch imaging study and planning info if available
    const studyRes = await db.query(
      "SELECT * FROM imaging_studies WHERE patient_id = $1 LIMIT 1",
      [safeId]
    );
    const planRes = await db.query(
      "SELECT * FROM planning_records WHERE patient_id = $1 LIMIT 1",
      [safeId]
    );

    return sendSuccess(res, {
      id: p.patient_id,
      patientId: p.patient_id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      kneeSide: p.affected_knee,
      urgency: p.urgency,
      clinicalNotes: p.clinical_notes,
      imagingDate: p.created_at ? new Date(p.created_at).toISOString().split("T")[0] : "2026-09-15",
      lastUpdated: p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : "2026-09-20",
      imagingStatus: p.imaging_status,
      segmentationStatus: p.segmentation_status,
      reconstructionStatus: p.reconstruction_status,
      reviewStatus: p.review_status,
      studyId: studyRes.rows[0]?.study_id || `CT-${p.patient_id}`,
      notes: p.clinical_notes,
      planning: planRes.rows[0] || null,
      imaging: studyRes.rows[0] || null,
    }, "Patient record retrieved.");
  } catch (err) {
    return sendError(res, "Failed to retrieve patient.", err, 500);
  }
};

/**
 * Update patient in PostgreSQL
 */
export const updatePatient = async (req, res) => {
  try {
    const safeId = sanitizeId(req.params.id);
    const { name, age, gender, affectedKnee, clinicalNotes, urgency, reviewStatus } = req.body;

    const result = await db.query(
      `UPDATE patients
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           gender = COALESCE($3, gender),
           affected_knee = COALESCE($4, affected_knee),
           clinical_notes = COALESCE($5, clinical_notes),
           urgency = COALESCE($6, urgency),
           review_status = COALESCE($7, review_status),
           updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $8
       RETURNING *`,
      [name, age, gender, affectedKnee, clinicalNotes, urgency, reviewStatus, safeId]
    );

    if (result.rows.length === 0) {
      return sendError(res, `Patient with ID '${safeId}' not found.`, null, 404);
    }

    const p = result.rows[0];
    return sendSuccess(res, {
      id: p.patient_id,
      patientId: p.patient_id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      kneeSide: p.affected_knee,
      urgency: p.urgency,
      clinicalNotes: p.clinical_notes,
      reviewStatus: p.review_status,
      updatedAt: p.updated_at,
    }, "Patient record updated successfully.");
  } catch (err) {
    return sendError(res, "Failed to update patient.", err, 500);
  }
};

/**
 * Delete patient from PostgreSQL
 */
export const deletePatient = async (req, res) => {
  try {
    const safeId = sanitizeId(req.params.id);

    const result = await db.query(
      "DELETE FROM patients WHERE patient_id = $1 RETURNING patient_id, name",
      [safeId]
    );

    if (result.rows.length === 0) {
      return sendError(res, `Patient '${safeId}' not found.`, null, 404);
    }

    return sendSuccess(res, result.rows[0], "Patient record deleted successfully.");
  } catch (err) {
    return sendError(res, "Failed to delete patient.", err, 500);
  }
};
