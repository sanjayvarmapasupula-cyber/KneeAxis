import pg from "pg";
import { newDb } from "pg-mem";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getSeedUsers, seedModels } from "./seedData.js";
import { maskDatabaseUrl } from "../config/env.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let pool = null;
let dbMode = "disconnected"; // 'postgresql' | 'pg-mem' | 'disconnected'

const SNAPSHOT_DIR = path.join(__dirname, "../data");
const SNAPSHOT_PATH = path.join(SNAPSHOT_DIR, "db_snapshot.json");

// Automated tests must never restore or persist development snapshots.
const isIsolatedTest = () =>
  process.env.NODE_ENV === "test" || process.env.USE_ISOLATED_TEST_DB === "true";

const SNAPSHOT_TABLES = [
  "users",
  "sessions",
  "password_reset_tokens",
  "user_settings",
  "patients",
  "imaging_studies",
  "predictions",
  "segmentation_jobs",
  "meshes",
  "planning_records",
  "audit_records",
  "ml_models",
];

let snapshotTimer = null;

export const scheduleSnapshot = () => {
  if (dbMode !== "pg-mem" || isIsolatedTest()) return;
  if (snapshotTimer) clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    saveSnapshot().catch((err) => {
      console.error("[PostgreSQL Snapshot] Async error saving snapshot:", err.message);
    });
  }, 250);
};

export const saveSnapshot = async () => {
  if (!pool || dbMode !== "pg-mem" || isIsolatedTest()) return;
  try {
    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    const data = {
      version: "1.0.0",
      savedAt: new Date().toISOString(),
      tables: {},
    };

    for (const table of SNAPSHOT_TABLES) {
      try {
        const res = await pool.query(`SELECT * FROM ${table}`);
        data.tables[table] = res.rows;
      } catch {
        data.tables[table] = [];
      }
    }

    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[PostgreSQL Snapshot] Failed to save snapshot:", err.message);
  }
};

export const restoreSnapshot = async () => {
  if (isIsolatedTest() || !fs.existsSync(SNAPSHOT_PATH)) {
    return false;
  }
  try {
    const raw = fs.readFileSync(SNAPSHOT_PATH, "utf-8");
    const snapshot = JSON.parse(raw);
    if (!snapshot || !snapshot.tables) return false;

    let restoredCount = 0;
    const userIdMap = new Map();

    for (const table of SNAPSHOT_TABLES) {
      const rows = snapshot.tables[table];
      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (const row of rows) {
        const rowCopy = { ...row };
        const oldId = rowCopy.id;

        // Map foreign key user_id if applicable
        if (table === "sessions" || table === "password_reset_tokens" || table === "user_settings") {
          if (rowCopy.user_id && userIdMap.has(rowCopy.user_id)) {
            rowCopy.user_id = userIdMap.get(rowCopy.user_id);
          }
        }
        if (table === "patients" && rowCopy.created_by && userIdMap.has(rowCopy.created_by)) {
          rowCopy.created_by = userIdMap.get(rowCopy.created_by);
        }

        // For SERIAL tables in pg-mem, delete 'id' so pg-mem sequence generates it and increments
        delete rowCopy.id;

        const cols = Object.keys(rowCopy);
        const vals = Object.values(rowCopy);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const colList = cols.join(", ");
        const preparedVals = vals.map((v) =>
          v !== null && typeof v === "object" ? JSON.stringify(v) : v
        );

        try {
          const insertRes = await pool.query(
            `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING RETURNING id`,
            preparedVals
          );
          if (insertRes.rows && insertRes.rows.length > 0) {
            const newId = insertRes.rows[0].id;
            if (table === "users" && oldId) {
              userIdMap.set(oldId, newId);
            }
          }
          restoredCount++;
        } catch {
          // ignore duplicate conflict
        }
      }
    }

    console.log(
      `[PostgreSQL Persistence] Restored database snapshot from disk (${restoredCount} total records across tables).`
    );
    return restoredCount > 0;
  } catch (err) {
    console.error("[PostgreSQL Persistence] Error restoring snapshot:", err.message);
    return false;
  }
};

/**
 * Execute a SQL query using the active pool.
 * @param {string} text - SQL query string
 * @param {Array} [params] - Parameterized query arguments
 */
export const query = async (text, params = []) => {
  if (!pool) {
    throw new Error("Database pool is not initialized. Call initDatabase() first.");
  }
  const result = await pool.query(text, params);

  // If in pg-mem mode and the query mutated data, trigger debounced snapshot save
  if (dbMode === "pg-mem") {
    const trimmed = text.trim().toUpperCase();
    if (
      trimmed.startsWith("INSERT") ||
      trimmed.startsWith("UPDATE") ||
      trimmed.startsWith("DELETE")
    ) {
      scheduleSnapshot();
    }
  }

  return result;
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
 * Seeds initial baseline data (Admin accounts & Model Registry entries) if empty.
 * ZERO clinical demo records (patients, studies, plans, audits) are seeded.
 */
async function seedInitialData() {
  try {
    // 1. Seed Users (Ensure baseline staff accounts exist in development/test unless explicitly opted in)
    if (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_SEED === "true") {
      const seedUsers = await getSeedUsers();
      for (const u of seedUsers) {
        await query(
          `INSERT INTO users (email, password_hash, full_name, role, department, avatar_url, account_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')
           ON CONFLICT (email) DO NOTHING`,
          [u.email, u.password_hash, u.full_name, u.role, u.department, u.avatar_url]
        );
      }
      console.log(`[PostgreSQL Seed] Active staff accounts verified (${seedUsers.length} accounts).`);
    } else {
      console.log("[PostgreSQL Seed] Predictable demo accounts seeding disabled in production.");
    }

    // 2. Seed ML Models (Registered with status: "Not Trained" and accuracy: null)
    const modelCountRes = await query("SELECT COUNT(*) AS count FROM ml_models");
    const modelCount = parseInt(modelCountRes.rows[0].count, 10);
    if (modelCount === 0) {
      console.log("[PostgreSQL Seed] Registering AI models into ML Registry (status: Not Trained)...");
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

    // NOTE: ZERO clinical patient records, imaging studies, or planning records are seeded.
    // The fresh application starts with authentic zero counts.
  } catch (err) {
    console.error(`[PostgreSQL Seed] Error during data seeding: ${err.message}`, err);
  }
}

/**
 * Initialize PostgreSQL database:
 * 1. For isolated testing (NODE_ENV=test), initializes isolated in-process test engine.
 * 2. For normal operation, connects directly to external PostgreSQL (DATABASE_URL).
 * 3. Never reports false connection if PostgreSQL is unavailable.
 */
export const initDatabase = async () => {
  const isTest = process.env.NODE_ENV === "test" || process.env.USE_ISOLATED_TEST_DB === "true";
  const dbUrl = process.env.DATABASE_URL;

  // 1. If in test mode, launch isolated in-process pg-mem engine directly
  if (isTest) {
    try {
      const memDb = newDb();
      memDb.public.registerFunction({
        name: "version",
        implementation: () => "PostgreSQL 16.2 (pg-mem isolated test fixture)",
      });

      const pgAdapter = memDb.adapters.createPg();
      pool = new pgAdapter.Pool();
      dbMode = "pg-mem";
      console.log("[PostgreSQL] Isolated test database engine initialized (NODE_ENV=test).");
    } catch (memErr) {
      console.error("[PostgreSQL] Failed to initialize isolated test database engine:", memErr);
      dbMode = "disconnected";
      throw memErr;
    }
  } else {
    // 2. Normal application mode: Must connect to actual PostgreSQL server
    if (!dbUrl && process.env.NODE_ENV === "production") {
      dbMode = "disconnected";
      throw new Error(
        "[PostgreSQL Configuration Error] DATABASE_URL must be explicitly configured in production. Fallback connections are disallowed."
      );
    }

    const targetUrl = dbUrl || process.env.DATABASE_URL;
    if (!targetUrl) {
      if (process.env.ALLOW_OFFLINE_FALLBACK === "true") {
        console.warn("[PostgreSQL] Offline development fallback active (ALLOW_OFFLINE_FALLBACK=true).");
        const memDb = newDb();
        memDb.public.registerFunction({
          name: "version",
          implementation: () => "PostgreSQL 16.2 (pg-mem offline fallback)",
        });
        const pgAdapter = memDb.adapters.createPg();
        pool = new pgAdapter.Pool();
        dbMode = "pg-mem";
        return { mode: dbMode, pool };
      }
      dbMode = "disconnected";
      throw new Error(
        "[PostgreSQL Configuration Error] DATABASE_URL is not set. Please configure DATABASE_URL in backend/.env"
      );
    }

    const maskedUrl = maskDatabaseUrl(targetUrl);

    try {
      const realPool = new Pool({
        connectionString: targetUrl,
        connectionTimeoutMillis: 3000,
        idleTimeoutMillis: 10000,
      });

      const testClient = await realPool.connect();
      await testClient.query("SELECT 1 AS alive");
      testClient.release();

      pool = realPool;
      dbMode = "postgresql";
      console.log(`[PostgreSQL] Connected to active PostgreSQL server: ${maskedUrl}`);
    } catch (pgErr) {
      console.warn(`[PostgreSQL] Connection to server at ${maskedUrl} failed: ${pgErr.message}`);

      // Allow offline in-process fallback ONLY if explicitly set in environment
      if (process.env.ALLOW_OFFLINE_FALLBACK === "true") {
        console.warn("[PostgreSQL] Offline development fallback active (ALLOW_OFFLINE_FALLBACK=true).");
        const memDb = newDb();
        memDb.public.registerFunction({
          name: "version",
          implementation: () => "PostgreSQL 16.2 (pg-mem offline fallback)",
        });
        const pgAdapter = memDb.adapters.createPg();
        pool = new pgAdapter.Pool();
        dbMode = "pg-mem";
      } else {
        dbMode = "disconnected";
        console.error("=============================================================================");
        console.error("[PostgreSQL Connection Required]");
        console.error("KneeAxis requires a running PostgreSQL server for normal application operation.");
        console.error(`Target: ${maskedUrl}`);
        console.error("Please ensure PostgreSQL is running and configure DATABASE_URL in backend/.env");
        console.error("=============================================================================");
        return { mode: dbMode, pool: null };
      }
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

    // Automated column migrations for existing PostgreSQL databases
    if (dbMode === "postgresql") {
      const migrations = [
        "ALTER TABLE patients ADD COLUMN IF NOT EXISTS assigned_to INT REFERENCES users(id) ON DELETE SET NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE"
      ];
      for (const mig of migrations) {
        try {
          await pool.query(mig);
        } catch (migErr) {
          console.warn(`[PostgreSQL Migration Notice]: ${migErr.message}`);
        }
      }
    }
    let hasSnapshot = false;
    if (dbMode === "pg-mem") {
      hasSnapshot = await restoreSnapshot();
    }

    // Seed baseline data if empty (Users + Not Trained models only)
    if (!hasSnapshot) {
      await seedInitialData();
      if (dbMode === "pg-mem") {
        await saveSnapshot();
      }
    } else if (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_SEED === "true") {
      // Ensure default staff user exists if needed without overwriting in development/test
      const seedUsers = await getSeedUsers();
      for (const u of seedUsers) {
        await query(
          `INSERT INTO users (email, password_hash, full_name, role, department, avatar_url, account_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')
           ON CONFLICT (email) DO NOTHING`,
          [u.email, u.password_hash, u.full_name, u.role, u.department, u.avatar_url]
        );
      }
    }
  } catch (schemaErr) {
    console.error("[PostgreSQL] Error applying database schema:", schemaErr);
  }

  // Flush snapshot on process exit
  const handleExit = () => {
    if (dbMode === "pg-mem") {
      saveSnapshot().catch(() => {});
    }
  };
  process.on("SIGINT", handleExit);
  process.on("SIGTERM", handleExit);

  return { mode: dbMode, pool };
};

export default {
  query,
  getClient,
  getDbMode,
  isOnline,
  initDatabase,
  saveSnapshot,
  restoreSnapshot,
  scheduleSnapshot,
};
