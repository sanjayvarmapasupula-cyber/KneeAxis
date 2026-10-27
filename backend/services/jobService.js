import crypto from "crypto";
import db from "../db/index.js";

/**
 * Durable Job Service for Long-Running Asynchronous Tasks.
 * 
 * Implements PostgreSQL persistence via pipeline_jobs table with in-memory caching.
 * Recovers and reconciles orphan jobs on server restarts.
 */
class JobService {
  constructor() {
    this.jobs = new Map();
    this.reconciled = false;
  }

  /**
   * Reconcile interrupted jobs from previous server runs
   */
  async reconcileOrphans(force = false) {
    if (this.reconciled && !force) return 0;
    try {
      if (db.isOnline && db.isOnline()) {
        const updateRes = await db.query(
          `UPDATE pipeline_jobs
           SET status = 'failed',
               stage = 'failed',
               error = 'Job interrupted: Backend service restarted before job completion.',
               failed_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE status IN ('queued', 'processing')
           RETURNING job_id, patient_id, job_type, status, error`
        );
        const count = updateRes?.rows?.length || 0;
        if (count > 0) {
          console.log(`[JobService] Reconciled ${count} interrupted job(s) from previous run.`);
          for (const row of updateRes.rows) {
            const cached = this.jobs.get(row.job_id);
            if (cached) {
              cached.status = 'failed';
              cached.stage = 'failed';
              cached.error = row.error;
            }
          }
        }
        this.reconciled = true;
        return count;
      }
      return 0;
    } catch (err) {
      return 0;
    }
  }

  createJob(type, patientId, metadata = {}, ownerId = null) {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const studyId = metadata?.studyId || null;
    const now = new Date();

    const job = {
      jobId,
      type,
      patientId,
      ownerId: ownerId || null,
      studyId,
      status: "queued", // 'queued' | 'processing' | 'completed' | 'failed'
      stage: "queued",
      progress: 0,
      metadata,
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      completedAt: null,
      failedAt: null,
    };

    this.jobs.set(jobId, job);

    // Persist to PostgreSQL asynchronously
    if (db.isOnline && db.isOnline()) {
      db.query(
        `INSERT INTO pipeline_jobs (
          job_id, job_type, patient_id, owner_id, study_id, status, stage, progress, metadata, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (job_id) DO NOTHING`,
        [
          jobId,
          type,
          patientId,
          ownerId || null,
          studyId,
          "queued",
          "queued",
          0,
          JSON.stringify(metadata),
          now,
          now,
        ]
      ).catch((err) => {
        console.warn(`[JobService] Warning: Failed to persist new job ${jobId} to PostgreSQL:`, err.message);
      });
    }

    return job;
  }

  getJob(jobId) {
    if (this.jobs.has(jobId)) {
      return this.jobs.get(jobId);
    }
    return null;
  }

  async getJobAsync(jobId) {
    if (this.jobs.has(jobId)) {
      return this.jobs.get(jobId);
    }
    try {
      if (db.isOnline && db.isOnline()) {
        const res = await db.query(
          "SELECT * FROM pipeline_jobs WHERE job_id = $1",
          [jobId]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          const job = {
            jobId: row.job_id,
            type: row.job_type,
            patientId: row.patient_id,
            ownerId: row.owner_id,
            studyId: row.study_id,
            status: row.status,
            stage: row.stage,
            progress: row.progress,
            metadata: row.metadata || {},
            result: row.result || null,
            error: row.error || null,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            failedAt: row.failed_at,
          };
          this.jobs.set(jobId, job);
          return job;
        }
      }
    } catch {}
    return null;
  }

  updateJob(jobId, updates = {}) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const now = new Date();
    Object.assign(job, updates, { updatedAt: now });

    // Persist updates to PostgreSQL asynchronously
    if (db.isOnline && db.isOnline()) {
      db.query(
        `UPDATE pipeline_jobs
         SET status = COALESCE($1, status),
             stage = COALESCE($2, stage),
             progress = COALESCE($3, progress),
             result = COALESCE($4, result),
             error = COALESCE($5, error),
             started_at = COALESCE($6, started_at),
             completed_at = COALESCE($7, completed_at),
             failed_at = COALESCE($8, failed_at),
             updated_at = CURRENT_TIMESTAMP
         WHERE job_id = $9`,
        [
          updates.status || null,
          updates.stage || null,
          updates.progress !== undefined ? updates.progress : null,
          updates.result ? JSON.stringify(updates.result) : null,
          updates.error || null,
          updates.startedAt || null,
          updates.completedAt || null,
          updates.failedAt || null,
          jobId,
        ]
      ).catch((err) => {
        console.warn(`[JobService] Warning: Failed to persist job update ${jobId} to PostgreSQL:`, err.message);
      });
    }

    return job;
  }

  startJob(jobId) {
    const now = new Date();
    return this.updateJob(jobId, { status: "processing", stage: "processing", progress: 10, startedAt: now });
  }

  completeJob(jobId, result) {
    const now = new Date();
    return this.updateJob(jobId, {
      status: "completed",
      progress: 100,
      result,
      error: null,
      completedAt: now,
    });
  }

  failJob(jobId, error) {
    const now = new Date();
    const errMsg = error ? (error.message || String(error)) : "Unknown failure";
    return this.updateJob(jobId, {
      status: "failed",
      stage: "failed",
      error: errMsg,
      failedAt: now,
    });
  }
}

export const jobService = new JobService();
export default jobService;
