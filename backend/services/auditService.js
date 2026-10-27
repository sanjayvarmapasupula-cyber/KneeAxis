import crypto from "crypto";
import fs from "fs";
import db from "../db/index.js";

/**
 * Audit Service using Node.js built-in 'crypto' for SHA-256 integrity verification.
 * Calculates cryptographic hashes for medical images, segmentations, and 3D meshes.
 */

/**
 * Compute SHA-256 hash of a file on disk using a streaming pipeline.
 * @param {string} filePath - Absolute or relative file path
 * @returns {Promise<string>} - Hex SHA-256 digest
 */
export const calculateFileHash = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return resolve("");
    }

    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", (err) => reject(err));
  });
};

// In-memory fallback map when needed
const memoryAuditRecords = new Map();

/**
 * Record a clinician review and approval with cryptographic hashes
 */
export const recordApproval = async ({
  patientId,
  meshId,
  imagePath,
  segmentationPath,
  meshPath,
  approved,
  reviewer,
  reviewNotes = "",
}) => {
  const [imageHash, segmentationHash, meshHash] = await Promise.all([
    imagePath ? calculateFileHash(imagePath) : Promise.resolve(""),
    segmentationPath ? calculateFileHash(segmentationPath) : Promise.resolve(""),
    meshPath ? calculateFileHash(meshPath) : Promise.resolve(""),
  ]);

  const metadata = {
    meshId: meshId || null,
    imageHash,
    segmentationHash,
    meshHash,
    approved: Boolean(approved),
    disclaimer: "Research/Prototype Audit Mechanism - Not a legal medical device signature.",
  };

  const action = Boolean(approved) ? "SURGICAL_PLAN_APPROVAL" : "SURGICAL_PLAN_REJECTION";

  let auditRecord = null;
  try {
    const res = await db.query(
      `INSERT INTO audit_records (patient_id, action, user_name, role, notes, metadata)
       VALUES ($1, $2, $3, 'surgeon', $4, $5)
       RETURNING *`,
      [patientId, action, reviewer, reviewNotes, JSON.stringify(metadata)]
    );
    auditRecord = res.rows[0];
  } catch (err) {
    console.warn(`[AuditService] Could not persist audit record to PostgreSQL: ${err.message}`);
  }

  const audit = {
    id: auditRecord?.id || `audit_${Date.now()}`,
    patientId,
    meshId,
    imageHash,
    segmentationHash,
    meshHash,
    approved: Boolean(approved),
    reviewer,
    reviewNotes,
    approvalTimestamp: auditRecord?.created_at || new Date().toISOString(),
    createdAt: auditRecord?.created_at || new Date().toISOString(),
  };

  if (!memoryAuditRecords.has(patientId)) {
    memoryAuditRecords.set(patientId, []);
  }
  memoryAuditRecords.get(patientId).unshift(audit);

  return audit;
};

/**
 * Check if a patient's mesh has been officially approved by a clinician
 */
export const isMeshApproved = async (patientId) => {
  try {
    // Check patient's review status first
    const patientRes = await db.query(
      "SELECT review_status FROM patients WHERE patient_id = $1",
      [patientId]
    );

    if (patientRes.rows.length > 0 && patientRes.rows[0].review_status === "Approved") {
      return true;
    }

    // Check latest audit record for this patient
    const auditRes = await db.query(
      `SELECT action, metadata FROM audit_records
       WHERE patient_id = $1 AND (action = 'SURGICAL_PLAN_APPROVAL' OR action = 'SURGICAL_PLAN_REJECTION')
       ORDER BY created_at DESC LIMIT 1`,
      [patientId]
    );

    if (auditRes.rows.length > 0) {
      return auditRes.rows[0].action === "SURGICAL_PLAN_APPROVAL";
    }
  } catch {
    // fallback to in-memory check
  }

  const inMem = memoryAuditRecords.get(patientId);
  if (inMem && inMem.length > 0) {
    return inMem[0].approved === true;
  }
  return false;
};

export const getAuditRecordsForPatient = async (patientId) => {
  try {
    const result = await db.query(
      `SELECT id, patient_id, action, user_name, user_email, role, notes, metadata, created_at
       FROM audit_records
       WHERE patient_id = $1
       ORDER BY created_at DESC`,
      [patientId]
    );

    if (result.rows.length > 0) {
      return result.rows.map((r) => {
        const meta = r.metadata || {};
        return {
          id: r.id,
          patientId: r.patient_id,
          action: r.action,
          reviewer: r.user_name || "Clinician",
          userName: r.user_name,
          userEmail: r.user_email,
          role: r.role,
          notes: r.notes,
          reviewNotes: r.notes,
          meshHash: meta.meshHash || "",
          imageHash: meta.imageHash || "",
          segmentationHash: meta.segmentationHash || "",
          approved: meta.approved !== undefined ? meta.approved : r.action === "SURGICAL_PLAN_APPROVAL",
          createdAt: r.created_at,
          approvalTimestamp: r.created_at,
        };
      });
    }
  } catch {
    // fallback to in-memory
  }
  return memoryAuditRecords.get(patientId) || [];
};
