import pg from "pg";
import { newDb } from "pg-mem";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSeedUsers, seedPatients, seedModels } from "./seedData.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let pool = null;
let dbMode = "disconnected"; // 'postgresql' | 'pg-mem' | 'disconnected'

/**
 * Execute a SQL query using the active pool.
 * @param {string} text - SQL query string
 * @param {Array} [params] - Parameterized query arguments
 */
export const query = async (text, params = []) => {
  if (!pool) {
    throw new Error("Database pool is not initialized. Call initDatabase() first.");
  }
  return pool.query(text, params);
};

export const getClient = async () => {
  if (!pool) {
    throw new Error("Database pool is not initialized.");
  }
  return pool.connect();
};

export const getDbMode = () => dbMode;
export const isOnline = () => dbMode !== "disconnected";

/**
 * Seeds initial clinical data into the database if empty.
 */
async function seedInitialData() {
  try {
    // 1. Seed Users (Ensure all required clinical staff accounts are active)
    const seedUsers = await getSeedUsers();
    for (const u of seedUsers) {
      await query(
        `INSERT INTO users (email, password_hash, full_name, role, department, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           full_name = EXCLUDED.full_name,
           role = EXCLUDED.role,
           department = EXCLUDED.department,
           avatar_url = EXCLUDED.avatar_url`,
        [u.email, u.password_hash, u.full_name, u.role, u.department, u.avatar_url]
      );
    }
    console.log(`[PostgreSQL Seed] Active clinical user accounts verified (${seedUsers.length} accounts).`);

    // 2. Seed Patients
    const patientCountRes = await query("SELECT COUNT(*) AS count FROM patients");
    const patientCount = parseInt(patientCountRes.rows[0].count, 10);
    if (patientCount === 0) {
      console.log("[PostgreSQL Seed] Seeding initial patient records...");
      for (const p of seedPatients) {
        await query(
          `INSERT INTO patients (patient_id, name, age, gender, affected_knee, urgency, clinical_notes, imaging_status, segmentation_status, reconstruction_status, review_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (patient_id) DO NOTHING`,
          [
            p.patient_id,
            p.name,
            p.age,
            p.gender,
            p.affected_knee,
            p.urgency,
            p.clinical_notes,
            p.imaging_status,
            p.segmentation_status,
            p.reconstruction_status,
            p.review_status,
          ]
        );

        // Seed imaging study for each patient
        await query(
          `INSERT INTO imaging_studies (study_id, patient_id, modality, study_type, slice_count, pixel_spacing, slice_thickness, kvp, ma)
           VALUES ($1, $2, 'CT', 'Pre-Op High-Res Knee Protocol', 420, '0.625 x 0.625 mm', '0.5 mm', 120, 250)
           ON CONFLICT (study_id) DO NOTHING`,
          [`CT-${p.patient_id}`, p.patient_id]
        );

        // Seed planning record
        await query(
          `INSERT INTO planning_records (
            patient_id, status, resection_depth_femur_mm, resection_depth_tibia_mm,
            varus_valgus_angle_deg, flexion_extension_angle_deg, internal_external_rotation_deg,
            implant_size_femur, implant_size_tibia, poly_thickness_mm, joint_line_delta_mm,
            native_mldfa, native_mmpta, planned_by, notes
          ) VALUES ($1, $2, 8.5, 9.0, 0.0, 3.0, 0.0, 'Size 5', 'Size 4', 10.0, 0.0, 88.5, 86.5, 'Dr. Sarah Mitchell', 'Kinematically aligned resection plan verified with ROSA navigation.')
          ON CONFLICT (patient_id) DO NOTHING`,
          [p.patient_id, p.review_status === 'Approved' ? 'Approved' : 'Draft']
        );
      }
      console.log(`[PostgreSQL Seed] ${seedPatients.length} patient records seeded.`);
    }

    // 3. Seed ML Models
    const modelCountRes = await query("SELECT COUNT(*) AS count FROM ml_models");
    const modelCount = parseInt(modelCountRes.rows[0].count, 10);
    if (modelCount === 0) {
      console.log("[PostgreSQL Seed] Registering AI & Algorithmic models into ML Model Registry...");
      for (const m of seedModels) {
        await query(
          `INSERT INTO ml_models (
            model_id, name, category, architecture, version, status,
            weights_path, config_path, framework, input_shape,
            accuracy_metric, accuracy_value, inference_latency_ms, parameters_count, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (model_id) DO NOTHING`,
          [
            m.model_id,
            m.name,
            m.category,
            m.architecture,
            m.version,
            m.status,
            m.weights_path,
            m.config_path,
            m.framework,
            m.input_shape,
            m.accuracy_metric,
            m.accuracy_value,
            m.inference_latency_ms,
            m.parameters_count,
            m.description,
          ]
        );
      }
      console.log(`[PostgreSQL Seed] ${seedModels.length} models registered.`);
    }

    // 4. Seed initial audit log entry
    const auditCountRes = await query("SELECT COUNT(*) AS count FROM audit_records");
    if (parseInt(auditCountRes.rows[0].count, 10) === 0) {
      await query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          "MRN-ROSA-0568",
          "SURGICAL_PLAN_APPROVAL",
          "dr.mitchell@clinicalatlas.demo",
          "Dr. Sarah Mitchell",
          "surgeon",
          "Pre-operative kinematic alignment resection plan verified and signed off for ROSA Robotic Suite."
        ]
      );
    }
  } catch (err) {
    console.error(`[PostgreSQL Seed] Error during data seeding: ${err.message}`, err);
  }
}

/**
 * Initialize PostgreSQL database:
 * 1. Attempts connection to external PostgreSQL (DATABASE_URL or localhost)
 * 2. If unavailable, initializes embedded pg-mem engine
 * 3. Applies DDL schema
 * 4. Seeds default data
 */
export const initDatabase = async () => {
  const dbUrl = process.env.DATABASE_URL;

  // Try real PostgreSQL connection first if configured or available
  let connectedReal = false;
  try {
    const realPool = new Pool({
      connectionString: dbUrl || "postgresql://postgres:postgres@localhost:5432/clinical_atlas",
      connectionTimeoutMillis: 1800,
      idleTimeoutMillis: 10000,
    });

    const testClient = await realPool.connect();
    await testClient.query("SELECT 1 AS alive");
    testClient.release();

    pool = realPool;
    dbMode = "postgresql";
    connectedReal = true;
    console.log(`[PostgreSQL] Connected to active PostgreSQL server: ${dbUrl ? "Custom DATABASE_URL" : "localhost:5432"}`);
  } catch (err) {
    // console.log(`[PostgreSQL] Native PostgreSQL server offline (${err.message}). Starting in-process PostgreSQL engine...`);
  }

  // If real PostgreSQL is not available, launch in-process PostgreSQL engine (pg-mem)
  if (!connectedReal) {
    try {
      const memDb = newDb();

      // Register standard postgres helper functions if needed
      memDb.public.registerFunction({
        name: 'version',
        implementation: () => 'PostgreSQL 16.2 (pg-mem in-process engine for Clinical Atlas)',
      });

      const pgAdapter = memDb.adapters.createPg();
      pool = new pgAdapter.Pool();
      dbMode = "pg-mem";
      console.log("[PostgreSQL] In-process PostgreSQL engine initialized successfully (PostgreSQL 16 dialect).");
    } catch (memErr) {
      console.error("[PostgreSQL] Failed to initialize in-process database engine:", memErr);
      dbMode = "disconnected";
      throw memErr;
    }
  }

  // Execute Schema DDL
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    let schemaSql = fs.readFileSync(schemaPath, "utf-8");

    // Strip comments cleanly before splitting
    schemaSql = schemaSql.replace(/--.*$/gm, "");

    const statements = schemaSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (stmtErr) {
        if (!stmtErr.message.includes("already exists")) {
          console.warn(`[PostgreSQL Schema Notice]: ${stmtErr.message}`);
        }
      }
    }
    console.log("[PostgreSQL] Relational schema applied successfully.");

    // Seed database
    await seedInitialData();
  } catch (schemaErr) {
    console.error("[PostgreSQL] Error applying database schema:", schemaErr);
  }

  return { mode: dbMode, pool };
};

export default {
  query,
  getClient,
  getDbMode,
  isOnline,
  initDatabase,
};
