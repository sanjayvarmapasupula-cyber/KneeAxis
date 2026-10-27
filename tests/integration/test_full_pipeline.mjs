process.env.NODE_ENV = "test";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../../backend/app.js";
import db, { initDatabase } from "../../backend/db/index.js";
import { jobService } from "../../backend/services/jobService.js";
import { getOutputPaths } from "../../backend/services/livePipelineService.js";

let server;
let baseUrl;

async function request(method, endpoint, body = null, headers = {}) {
  const url = `${baseUrl}${endpoint}`;
  const options = {
    method,
    headers: { ...headers },
  };

  let payload = body;
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) {
    options.headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = null;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
          raw: data,
        });
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function buildMultipart(fieldName, filename, buffer) {
  const boundary = `--------------------------${Date.now()}${crypto.randomBytes(6).toString("hex")}`;
  const pre = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/gzip\r\n\r\n`
  );
  const post = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([pre, buffer, post]),
  };
}

async function loginUser(email, password) {
  const res = await request("POST", "/api/auth/login", { email, password });
  assert.equal(res.status, 200, `Login failed for ${email}`);
  const token = res.data.data.token;
  return {
    token,
    user: res.data.data.user,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
}

async function run() {
  console.log("==================================================");
  console.log(" KNEEAXIS RESEARCH PIPELINE INTEGRATION TEST SUITE");
  console.log("==================================================");

  await initDatabase();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Test Server] Running at ${baseUrl}`);
      resolve();
    });
  });

  const PATIENT_ALICE = `KA-RESEARCH-A-${Date.now()}`;
  const PATIENT_BOB = `KA-RESEARCH-B-${Date.now()}`;

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Authentication & Account Setup
    // -------------------------------------------------------------------------
    console.log("\n[Phase 1] Setting up Researcher Accounts (Alice & Bob)...");
    const regAlice = await request("POST", "/api/auth/register", {
      fullName: "Dr. Alice Research",
      email: `alice.${Date.now()}@kneeaxis-lab.org`,
      password: "AliceSecurePassword#2026!",
    });
    assert.equal(regAlice.status, 201);
    const aliceUser = regAlice.data.data.user;

    const regBob = await request("POST", "/api/auth/register", {
      fullName: "Dr. Bob Research",
      email: `bob.${Date.now()}@kneeaxis-lab.org`,
      password: "BobSecurePassword#2026!",
    });
    assert.equal(regBob.status, 201);
    const bobUser = regBob.data.data.user;

    const aliceAuth = await loginUser(aliceUser.email, "AliceSecurePassword#2026!");
    const bobAuth = await loginUser(bobUser.email, "BobSecurePassword#2026!");
    console.log("✓ Authenticated sessions established for Alice and Bob");

    // -------------------------------------------------------------------------
    // Phase 2: Authenticated Model Status Retrieval
    // -------------------------------------------------------------------------
    console.log("\n[Phase 2] Testing Authenticated Model Status (/api/research/model)...");
    const unauthModel = await request("GET", "/api/research/model");
    assert.equal(unauthModel.status, 401, "Unauthenticated model status must return 401");

    const authModel = await request("GET", "/api/research/model", null, aliceAuth.headers);
    assert.equal(authModel.status, 200, "Authenticated model status returns 200");
    assert.ok(authModel.data.success, "Success flag is true");
    const modelData = authModel.data.data;
    assert.equal(modelData.dataset, 922, "Dataset is 922");
    assert.ok(modelData.labels, "Labels map provided");
    assert.equal(modelData.labels[1], "Femur");
    assert.equal(modelData.labels[3], "Tibia");
    console.log(`✓ Model Status: Ready=${modelData.ready}, Checkpoint=${modelData.checkpoint || 'N/A'}, Epochs=${modelData.trainedEpochs}`);

    // -------------------------------------------------------------------------
    // Phase 3: Research Patient Creation & Authorization Verification
    // -------------------------------------------------------------------------
    console.log("\n[Phase 3] Creating Patient for Alice & Verifying Access Gates...");
    const createPatRes = await request("POST", "/api/patients", {
      patientId: PATIENT_ALICE,
      name: "Research Cohort Subject Alpha",
      age: 58,
      gender: "Male",
      affectedKnee: "Right",
      clinicalNotes: "Authorized OAI research subject.",
    }, aliceAuth.headers);
    assert.equal(createPatRes.status, 201, "Alice patient creation returned 201");

    // Negative authorization check: Bob cannot access Alice's patient
    const bobViewAlice = await request("GET", `/api/patients/${PATIENT_ALICE}`, null, bobAuth.headers);
    assert.equal(bobViewAlice.status, 403, "Bob viewing Alice's patient must return 403");
    console.log("✓ Patient created and IDOR protection confirmed (Bob blocked with 403)");

    // -------------------------------------------------------------------------
    // Phase 4: Authorized MRI Upload & Validation Gates
    // -------------------------------------------------------------------------
    console.log("\n[Phase 4] Testing MRI Upload Validation & Authorization...");

    // 4a. Unauthorized upload attempt (Bob uploading to Alice's patient)
    const mockNiftiBytes = Buffer.from("MOCK_NIFTI_GZ_VOLUME_HEADER_AND_VOXEL_DATA");
    const multipartBob = buildMultipart("image", "test_knee.nii.gz", mockNiftiBytes);
    const bobUploadRes = await request(
      "POST",
      `/api/research/${PATIENT_ALICE}/upload`,
      multipartBob.body,
      { ...bobAuth.headers, "Content-Type": multipartBob.contentType }
    );
    assert.equal(bobUploadRes.status, 403, "Bob uploading to Alice's patient must return 403");
    console.log("✓ Unauthorized upload rejected with 403 Forbidden");

    // 4b. Invalid file extension rejection (e.g. .png / .jpg)
    const invalidExtMultipart = buildMultipart("image", "xray.png", Buffer.from("PNG_DATA"));
    const invalidExtRes = await request(
      "POST",
      `/api/research/${PATIENT_ALICE}/upload`,
      invalidExtMultipart.body,
      { ...aliceAuth.headers, "Content-Type": invalidExtMultipart.contentType }
    );
    assert.equal(invalidExtRes.status, 400, "Non-NIfTI file must be rejected with 400");
    console.log("✓ Invalid non-NIfTI upload rejected with 400 Bad Request");

    // 4c. Authorized valid NIfTI upload by Alice
    const multipartAlice = buildMultipart("image", "valid_knee_scan.nii.gz", mockNiftiBytes);
    const aliceUploadRes = await request(
      "POST",
      `/api/research/${PATIENT_ALICE}/upload`,
      multipartAlice.body,
      { ...aliceAuth.headers, "Content-Type": multipartAlice.contentType }
    );
    assert.equal(aliceUploadRes.status, 201, "Authorized NIfTI upload returned 201");
    assert.ok(aliceUploadRes.data.data.studyId, "Study ID assigned");
    assert.ok(aliceUploadRes.data.data.sha256, "SHA-256 digest computed");
    console.log(`✓ Authorized MRI Upload Succeeded: Study=${aliceUploadRes.data.data.studyId}, SHA-256=${aliceUploadRes.data.data.sha256.substring(0, 16)}...`);

    // -------------------------------------------------------------------------
    // Phase 5: Durable Job Persistence & Orphan Recovery
    // -------------------------------------------------------------------------
    console.log("\n[Phase 5] Testing Durable Job Persistence in PostgreSQL...");
    const job = jobService.createJob("research_pipeline", PATIENT_ALICE, {
      studyId: aliceUploadRes.data.data.studyId,
      mockRun: true,
    }, aliceUser.id);
    assert.ok(job.jobId, "Job ID generated");

    // Verify persisted in PostgreSQL
    const dbJob = await db.query("SELECT * FROM pipeline_jobs WHERE job_id = $1", [job.jobId]);
    assert.equal(dbJob.rows.length, 1, "Job persisted in PostgreSQL pipeline_jobs table");
    assert.equal(dbJob.rows[0].status, "queued");
    assert.equal(dbJob.rows[0].owner_id, aliceUser.id);

    // Job stage progression
    jobService.startJob(job.jobId);
    jobService.updateJob(job.jobId, { progress: 45, stage: "nnunet_segmentation" });
    const polledJob = jobService.getJob(job.jobId);
    assert.equal(polledJob.status, "processing");
    assert.equal(polledJob.progress, 45);

    // Test Job authorization: Bob cannot view Alice's job
    const bobJobRes = await request("GET", `/api/research/jobs/${job.jobId}`, null, bobAuth.headers);
    assert.equal(bobJobRes.status, 403, "Bob cannot view Alice's job (403)");

    const aliceJobRes = await request("GET", `/api/research/jobs/${job.jobId}`, null, aliceAuth.headers);
    assert.equal(aliceJobRes.status, 200, "Alice can view her own job (200)");
    console.log("✓ Durable job tracking and owner access control verified");

    // Test Orphan Recovery
    console.log("\n[Phase 5b] Testing Orphan Job Reconciliation on Restart...");
    const recoveredCount = await jobService.reconcileOrphans(true);
    assert.equal(recoveredCount, 1, "1 running job recovered as interrupted");
    const reconciledJob = jobService.getJob(job.jobId);
    assert.equal(reconciledJob.status, "failed");
    assert.ok(reconciledJob.error.includes("Backend service restarted"), "Error reflects orphan recovery");
    console.log("✓ Orphan job safely transitioned to failed status with diagnostic note");

    // -------------------------------------------------------------------------
    // Phase 6: Mock 3D Reconstruction Manifest & Independent QA Fixture
    // -------------------------------------------------------------------------
    console.log("\n[Phase 6] Testing Mesh Manifest & Geometry QA Endpoints...");
    const outPaths = getOutputPaths(PATIENT_ALICE);
    fs.mkdirSync(outPaths.root, { recursive: true });

    // Create mock segmentation and STL files in meshes/
    fs.writeFileSync(outPaths.segmentation, "MOCK_SEGMENTATION_VOXELS");
    const meshDir = path.join(outPaths.root, "meshes");
    fs.mkdirSync(meshDir, { recursive: true });
    const mockStlNames = [
      "femur_raw.stl",
      "femoral_cartilage_raw.stl",
      "tibia_raw.stl",
      "medial_tibial_cartilage_raw.stl",
      "lateral_tibial_cartilage_raw.stl",
    ];
    for (const name of mockStlNames) {
      fs.writeFileSync(path.join(meshDir, name), "solid KneeAxisMockSTL\r\nendsolid KneeAxisMockSTL\r\n");
    }

    // Write independent mesh verification QA
    fs.writeFileSync(path.join(outPaths.root, "independent_mesh_check.json"), JSON.stringify({
      passed: true,
      structures: mockStlNames.map(s => ({ name: s.replace("_raw.stl", ""), watertight: true })),
    }));

    // Write mock manifest
    const mockManifest = {
      patientId: PATIENT_ALICE,
      studyId: aliceUploadRes.data.data.studyId,
      reconstructionTimestamp: new Date().toISOString(),
      geometryQAPassed: true,
      meshes: [
        { name: "femur", label: 1, stl: "femur_raw.stl", watertight: true, volume_mm3: 154230 },
        { name: "femoral_cartilage", label: 2, stl: "femoral_cartilage_raw.stl", watertight: true, volume_mm3: 14200 },
        { name: "tibia", label: 3, stl: "tibia_raw.stl", watertight: true, volume_mm3: 112450 },
        { name: "medial_tibial_cartilage", label: 4, stl: "medial_tibial_cartilage_raw.stl", watertight: true, volume_mm3: 4120 },
        { name: "lateral_tibial_cartilage", label: 5, stl: "lateral_tibial_cartilage_raw.stl", watertight: true, volume_mm3: 4980 },
      ],
    };
    fs.writeFileSync(outPaths.manifest, JSON.stringify(mockManifest, null, 2));

    // Write mock QA and pipeline completion record
    fs.writeFileSync(outPaths.qa, JSON.stringify({ passed: true, watertightCount: 5 }));
    const mockCheckpointSha = "mocksha256checkpoint";
    fs.writeFileSync(outPaths.provenance, JSON.stringify({
      study_id: aliceUploadRes.data.data.studyId,
      prediction_sha256: "predsha256",
      checkpoint_sha256: mockCheckpointSha,
    }));
    fs.writeFileSync(outPaths.pipeline, JSON.stringify({
      studyId: aliceUploadRes.data.data.studyId,
      reconstructionComplete: true,
      geometryQAPassed: true,
      predictionSha256: "predsha256",
      checkpointSha256: mockCheckpointSha,
      manifest: mockManifest,
    }));

    // Test status endpoint
    const statusRes = await request("GET", `/api/research/${PATIENT_ALICE}/status`, null, aliceAuth.headers);
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.data.data.segmentationReady, true);
    assert.equal(statusRes.data.data.reconstructionReady, true);
    console.log("✓ Patient pipeline status indicates reconstruction is ready");

    // Test manifest retrieval
    const manifestRes = await request("GET", `/api/research/${PATIENT_ALICE}/manifest`, null, aliceAuth.headers);
    assert.equal(manifestRes.status, 200);
    assert.equal(manifestRes.data.data.meshes.length, 5, "Manifest contains all 5 anatomical structures");
    console.log(`✓ Manifest retrieved: ${manifestRes.data.data.meshes.map(m => m.name).join(", ")}`);

    // -------------------------------------------------------------------------
    // Phase 7: Protected STL Download & MIME Type Validation
    // -------------------------------------------------------------------------
    console.log("\n[Phase 7] Testing Protected STL Streaming & Authorization...");

    // Unauthenticated download -> 401
    const unauthStl = await request("GET", `/api/research/${PATIENT_ALICE}/meshes/femur_raw.stl`);
    assert.equal(unauthStl.status, 401, "Unauthenticated STL download must be 401");

    // Bob downloading Alice's mesh -> 403
    const bobStl = await request("GET", `/api/research/${PATIENT_ALICE}/meshes/femur_raw.stl`, null, bobAuth.headers);
    assert.equal(bobStl.status, 403, "Bob downloading Alice's STL must be 403");

    // Alice downloading her mesh -> 200 OK
    const aliceStl = await request("GET", `/api/research/${PATIENT_ALICE}/meshes/femur_raw.stl`, null, aliceAuth.headers);
    assert.equal(aliceStl.status, 200, "Alice downloading her STL returns 200 OK");
    assert.equal(aliceStl.headers["content-type"], "model/stl");
    assert.equal(aliceStl.headers["cache-control"], "private, no-store");
    console.log("✓ Protected STL download verified: 401 for unauthenticated, 403 for cross-user, 200 for owner");

    // -------------------------------------------------------------------------
    // Phase 8: Pipeline Error State Handling
    // -------------------------------------------------------------------------
    console.log("\n[Phase 8] Testing Pipeline Error State Transitions...");
    const failingJob = jobService.createJob("research_pipeline", PATIENT_ALICE, {}, aliceUser.id);
    jobService.failJob(failingJob.jobId, "GPU out of memory or corrupted NIfTI geometry");
    const checkFailed = jobService.getJob(failingJob.jobId);
    assert.equal(checkFailed.status, "failed");
    assert.ok(checkFailed.error.includes("GPU out of memory"));
    console.log("✓ Error states handled cleanly without crashing server or leaving dangling jobs");

    console.log("\n==================================================");
    console.log(" ALL RESEARCH PIPELINE INTEGRATION TESTS PASSED!");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    // Cleanup temporary test files
    try {
      const pDir = getOutputPaths(PATIENT_ALICE).root;
      if (fs.existsSync(pDir)) fs.rmSync(pDir, { recursive: true, force: true });
    } catch {}
    process.exit(process.exitCode || 0);
  }
}

run();
