import db from "../db/index.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { sanitizeId } from "../utils/paths.js";

/**
 * Calculate age dynamically from Date of Birth
 */
const calculateAge = (dob, fallbackAge) => {
  if (dob) {
    const birthDate = new Date(dob);
    if (!isNaN(birthDate.getTime())) {
      const today = new Date();
      // Guard against future dates or invalid years
      if (birthDate.getFullYear() >= 1900 && birthDate <= today) {
        let calculated = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          calculated--;
        }
        return Math.max(1, Math.min(125, calculated));
      }
    }
  }
  const parsed = parseInt(fallbackAge, 10);
  return parsed >= 1 && parsed <= 125 ? parsed : 50;
};

/**
 * Create a new clinical patient record in PostgreSQL
 */
export const createPatient = async (req, res) => {
  try {
    const { patientId, name, age, dateOfBirth, gender, affectedKnee, clinicalNotes, urgency } = req.body;

    if (!patientId || !name) {
      return sendError(res, "patientId and name are required fields.", null, 400);
    }

    const safeId = sanitizeId(patientId);
    let validDob = null;
    if (dateOfBirth) {
      const parsedDob = new Date(dateOfBirth);
      if (!isNaN(parsedDob.getTime()) && parsedDob.getFullYear() >= 1900 && parsedDob <= new Date()) {
        validDob = dateOfBirth.split("T")[0];
      }
    }
    const patientAge = calculateAge(validDob, age);
    const patientGender = gender || "Female";
    const knee = affectedKnee || "Right";
    const patientUrgency = urgency || "Routine";
    const creatorId = req.user ? req.user.id : null;

    console.log(`[PATIENT REGISTRY] Registering new patient: MRN=${safeId}, Name="${name.trim()}", Age=${patientAge}, Gender=${patientGender}, Knee=${knee}, Priority=${patientUrgency}`);

    const insertRes = await db.query(
      `INSERT INTO patients (
        patient_id, name, age, date_of_birth, gender, affected_knee, urgency,
        clinical_notes, imaging_status, segmentation_status, reconstruction_status,
        review_status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', 'Pending', 'Pending', 'Draft', $9)
      RETURNING *`,
      [
        safeId,
        name.trim(),
        patientAge,
        validDob,
        patientGender,
        knee,
        patientUrgency,
        clinicalNotes || "",
        creatorId,
      ]
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
          `Enrolled patient ${name} (${safeId}) for KneeAxis assessment.`,
        ]
      );
    } catch (auxErr) {
      console.warn(`[PATIENT REGISTRY] Auxiliary record initialization notice: ${auxErr.message}`);
    }

    console.log(`[PATIENT REGISTRY] Patient enrolled successfully in PostgreSQL: ${safeId} - "${newPatient.name}"`);

    return sendSuccess(
      res,
      {
        id: newPatient.patient_id,
        patientId: newPatient.patient_id,
        name: newPatient.name,
        age: newPatient.age,
        dateOfBirth: newPatient.date_of_birth,
        gender: newPatient.gender,
        kneeSide: newPatient.affected_knee,
        affectedKnee: newPatient.affected_knee,
        urgency: newPatient.urgency,
        clinicalNotes: newPatient.clinical_notes,
        imagingStatus: newPatient.imaging_status,
        segmentationStatus: newPatient.segmentation_status,
        reconstructionStatus: newPatient.reconstruction_status,
        reviewStatus: newPatient.review_status,
        createdAt: newPatient.created_at,
      },
      "Patient created successfully in PostgreSQL.",
      201
    );
  } catch (err) {
    const msg = (err.message || "").toLowerCase();
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return sendError(res, "A patient with this ID already exists.", null, 409);
    }
    console.error("[PATIENT REGISTRY] Error enrolling patient:", err);
    return sendError(res, "Failed to create patient record.", err, 500);
  }
};

/**
 * Get all clinical patients from PostgreSQL with search, filtering, and pagination
 */
export const getAllPatients = async (req, res) => {
  try {
    const { search, urgency, status, page = 1, limit = 50, scope } = req.query;

    let queryText = "SELECT * FROM patients WHERE 1=1";
    const queryParams = [];

    // Scope patients for non-supervisory roles: researchers only see owned or assigned patients
    if (req.user && req.user.role !== "admin" && req.user.role !== "surgeon") {
      queryParams.push(req.user.id);
      queryText += ` AND (created_by = $${queryParams.length} OR assigned_to = $${queryParams.length})`;
    }

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

    const parsedLimit = parseInt(limit, 10) || 50;
    const parsedPage = parseInt(page, 10) || 1;
    const offset = (parsedPage - 1) * parsedLimit;

    queryParams.push(parsedLimit);
    queryText += ` LIMIT $${queryParams.length}`;

    queryParams.push(offset);
    queryText += ` OFFSET $${queryParams.length}`;

    const result = await db.query(queryText, queryParams);

    const patients = result.rows.map((p) => {
      const computedAge = calculateAge(p.date_of_birth, p.age);
      return {
        id: p.patient_id,
        patientId: p.patient_id,
        name: p.name,
        age: computedAge,
        dateOfBirth: p.date_of_birth,
        gender: p.gender,
        kneeSide: p.affected_knee,
        affectedKnee: p.affected_knee,
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
      };
    });

    console.log(`[PATIENT REGISTRY] Retrieved ${patients.length} patient records from PostgreSQL`);

    return sendSuccess(res, patients, "Patients retrieved successfully from PostgreSQL.");
  } catch (err) {
    console.error("[PATIENT REGISTRY] Error retrieving patients:", err);
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
      "SELECT * FROM patients WHERE patient_id = $1 OR CAST(id AS TEXT) = $1",
      [safeId]
    );

    if (result.rows.length === 0) {
      return sendError(res, `Patient with ID '${safeId}' not found.`, null, 404);
    }

    const p = result.rows[0];
    const actualPatientId = p.patient_id;

    // Fetch imaging study and planning info if available
    const studyRes = await db.query(
      "SELECT * FROM imaging_studies WHERE patient_id = $1 LIMIT 1",
      [actualPatientId]
    );
    const planRes = await db.query(
      "SELECT * FROM planning_records WHERE patient_id = $1 LIMIT 1",
      [actualPatientId]
    );

    const computedAge = calculateAge(p.date_of_birth, p.age);

    return sendSuccess(
      res,
      {
        id: p.patient_id,
        patientId: p.patient_id,
        name: p.name,
        age: computedAge,
        dateOfBirth: p.date_of_birth,
        gender: p.gender,
        kneeSide: p.affected_knee,
        affectedKnee: p.affected_knee,
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
      },
      "Patient record retrieved."
    );
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
    const { name, age, dateOfBirth, gender, affectedKnee, clinicalNotes, urgency, reviewStatus } = req.body;

    let validDob = null;
    if (dateOfBirth) {
      const parsedDob = new Date(dateOfBirth);
      if (!isNaN(parsedDob.getTime()) && parsedDob.getFullYear() >= 1900 && parsedDob <= new Date()) {
        validDob = dateOfBirth.split("T")[0];
      }
    }
    const newAge = validDob ? calculateAge(validDob, age) : age;

    const result = await db.query(
      `UPDATE patients
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           date_of_birth = COALESCE($3, date_of_birth),
           gender = COALESCE($4, gender),
           affected_knee = COALESCE($5, affected_knee),
           clinical_notes = COALESCE($6, clinical_notes),
           urgency = COALESCE($7, urgency),
           review_status = COALESCE($8, review_status),
           updated_at = CURRENT_TIMESTAMP
       WHERE patient_id = $9 OR CAST(id AS TEXT) = $9
       RETURNING *`,
      [name, newAge, validDob, gender, affectedKnee, clinicalNotes, urgency, reviewStatus, safeId]
    );

    if (result.rows.length === 0) {
      return sendError(res, `Patient with ID '${safeId}' not found.`, null, 404);
    }

    const p = result.rows[0];

    // Log update in audit
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES ($1, 'PATIENT_UPDATED', $2, $3, $4, $5)`,
        [
          p.patient_id,
          req.user ? req.user.email : "system@clinicalatlas.demo",
          req.user ? req.user.full_name : "Clinical Staff",
          req.user ? req.user.role : "clinician",
          `Updated patient record for ${p.name} (${p.patient_id}).`,
        ]
      );
    } catch {}

    return sendSuccess(
      res,
      {
        id: p.patient_id,
        patientId: p.patient_id,
        name: p.name,
        age: p.age,
        dateOfBirth: p.date_of_birth,
        gender: p.gender,
        kneeSide: p.affected_knee,
        urgency: p.urgency,
        clinicalNotes: p.clinical_notes,
        reviewStatus: p.review_status,
        updatedAt: p.updated_at,
      },
      "Patient record updated successfully."
    );
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
      "DELETE FROM patients WHERE patient_id = $1 OR CAST(id AS TEXT) = $1 RETURNING patient_id, name",
      [safeId]
    );

    if (result.rows.length === 0) {
      return sendError(res, `Patient '${safeId}' not found.`, null, 404);
    }

    // Log deletion
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES ($1, 'PATIENT_DELETED', $2, $3, $4, $5)`,
        [
          safeId,
          req.user ? req.user.email : "system@clinicalatlas.demo",
          req.user ? req.user.full_name : "Clinical Staff",
          req.user ? req.user.role : "clinician",
          `Deleted patient record ${result.rows[0].name} (${safeId}).`,
        ]
      );
    } catch {}

    return sendSuccess(res, result.rows[0], "Patient record deleted successfully.");
  } catch (err) {
    return sendError(res, "Failed to delete patient.", err, 500);
  }
};
