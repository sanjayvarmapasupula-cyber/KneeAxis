import crypto from "crypto";

/**
 * In-Memory Job Service for Long-Running Asynchronous Tasks
 * (Segmentation, 3D Reconstruction)
 * 
 * Implements clean interface so BullMQ / Redis can be swapped in seamlessly later.
 */
class JobService {
  constructor() {
    this.jobs = new Map();
  }

  createJob(type, patientId, metadata = {}) {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const job = {
      jobId,
      type,
      patientId,
      status: "queued", // 'queued' | 'processing' | 'completed' | 'failed'
      progress: 0,
      metadata,
      result: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  updateJob(jobId, updates = {}) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    Object.assign(job, updates, { updatedAt: new Date() });
    return job;
  }

  startJob(jobId) {
    return this.updateJob(jobId, { status: "processing", progress: 10 });
  }

  completeJob(jobId, result) {
    return this.updateJob(jobId, {
      status: "completed",
      progress: 100,
      result,
      error: null,
      completedAt: new Date(),
    });
  }

  failJob(jobId, error) {
    return this.updateJob(jobId, {
      status: "failed",
      error: error ? (error.message || String(error)) : "Unknown failure",
      failedAt: new Date(),
    });
  }
}

export const jobService = new JobService();
