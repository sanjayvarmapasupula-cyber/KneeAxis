import crypto from "crypto";
import fs from "fs";
import { AuditRecord } from "../models/AuditRecord.js";

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

// In-memory fallback map when MongoDB is running in offline mode
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

  let audit;
  try {
    audit = await AuditRecord.create({
      patientId,
      meshId,
      imageHash,
      segmentationHash,
      meshHash,
      approved: Boolean(approved),
      reviewer,
      reviewNotes,
      approvalTimestamp: new Date(),
    });
  } catch (err) {
    // If DB is offline, create in-memory object
    audit = {
      patientId,
      meshId,
      imageHash,
      segmentationHash,
      meshHash,
      approved: Boolean(approved),
      reviewer,
      reviewNotes,
      approvalTimestamp: new Date(),
      createdAt: new Date(),
      disclaimer: "Research/Prototype Audit Mechanism - Not a legal medical device signature.",
    };
  }

  // Keep in memory fallback cache
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
    const latestAudit = await AuditRecord.findOne({ patientId })
      .sort({ createdAt: -1 })
      .exec();

    if (latestAudit) return latestAudit.approved === true;
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
    const records = await AuditRecord.find({ patientId }).sort({ createdAt: -1 });
    if (records && records.length > 0) return records;
  } catch {
    // fallback to in-memory check
  }
  return memoryAuditRecords.get(patientId) || [];
};
