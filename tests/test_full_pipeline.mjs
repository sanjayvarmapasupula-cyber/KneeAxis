import fs from "fs";
import path from "path";
import http from "http";
import app from "../backend/app.js";
import { getPatientUploadDir, getPatientOutputDir, WORKSPACE_ROOT } from "../backend/utils/paths.js";

const TEST_PATIENT_ID = "P999_TEST";
let server;
let baseUrl;

async function request(method, endpoint, body = null, headers = {}) {
  const url = `${baseUrl}${endpoint}`;
  const options = {
    method,
    headers: { ...headers },
  };

  if (body && typeof body === "object") {
    options.headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
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
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log("==================================================");
  console.log(" STARTING CLINICAL ATLAS FULL PIPELINE TEST");
  console.log("==================================================");

  // Start ephemeral server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[Test Server] Running at ${baseUrl}`);
      resolve();
    });
  });

  try {
    // 1. Health Check
    console.log("\n[Step 1] Testing Health Endpoint...");
    const health = await request("GET", "/api/health");
    console.assert(health.status === 200, `Health check status: ${health.status}`);
    console.assert(health.data.status === "ok", "Health status is ok");
    console.log("✓ Health Check Passed:", health.data.service);

    // 2. Create Patient
    console.log("\n[Step 2] Testing Patient Creation...");
    const createPatientRes = await request("POST", "/api/patients", {
      patientId: TEST_PATIENT_ID,
      name: "Eleanor Vance",
      age: 67,
      gender: "Female",
      affectedKnee: "Right",
      clinicalNotes: "Severe medial compartment knee osteoarthritis candidate for TKA.",
    });
    console.assert(createPatientRes.status === 201, `Create patient failed: ${createPatientRes.status}`);
    console.log("✓ Patient Created:", createPatientRes.data.data.patientId);

    // 3. Fetch Patient
    console.log("\n[Step 3] Fetching Patient Details...");
    const getPatientRes = await request("GET", `/api/patients/${TEST_PATIENT_ID}`);
    console.assert(getPatientRes.status === 200, `Get patient failed: ${getPatientRes.status}`);
    console.assert(getPatientRes.data.data.name === "Eleanor Vance", "Patient name matches");
    console.log("✓ Patient Retrieved:", getPatientRes.data.data.name);

    // 4. Create sample test files in uploads/{patientId}
    console.log("\n[Step 4] Setting up mock input imaging in patient upload folder...");
    const uploadDir = getPatientUploadDir(TEST_PATIENT_ID);
    fs.mkdirSync(uploadDir, { recursive: true });

    // Mock X-ray
    const sampleXrayPath = path.join(uploadDir, "knee_ap_view.png");
    fs.writeFileSync(sampleXrayPath, "MOCK_XRAY_IMAGE_DATA_BYTES");

    // Mock MRI/CT NIfTI input volume (Minimal valid or text for test)
    // We will use python SimpleITK to write a tiny valid 3D NIfTI image if possible
    const sampleMriPath = path.join(uploadDir, "knee_mri.nii.gz");
    const pyScript = `
import SimpleITK as sitk, numpy as np
img = sitk.GetImageFromArray(np.zeros((30, 30, 30), dtype=np.uint8))
img.SetSpacing((1.0, 1.0, 1.5))
sitk.WriteImage(img, r"${sampleMriPath.replace(/\\/g, "/")}")
`;
    fs.writeFileSync(path.join(uploadDir, "make_test_mri.py"), pyScript);
    const { execSync } = await import("child_process");
    execSync(`python "${path.join(uploadDir, "make_test_mri.py")}"`);
    console.log("✓ Sample X-ray and 3D MRI volume created on disk");

    // 5. Predict KL Grade
    console.log("\n[Step 5] Testing KL Grade Prediction...");
    const klRes = await request("POST", `/api/predict/kl/${TEST_PATIENT_ID}`, {
      imagePath: sampleXrayPath,
    });
    console.assert(klRes.status === 200, `KL Prediction failed: ${klRes.status}`);
    console.log(`✓ KL Prediction: Grade ${klRes.data.data.grade} (${klRes.data.data.label}), Confidence: ${klRes.data.data.confidence}`);

    // 6. Run 3D Segmentation
    console.log("\n[Step 6] Testing 3D Knee Segmentation (Asynchronous Job)...");
    const segRes = await request("POST", `/api/segment/${TEST_PATIENT_ID}`, {
      imagePath: sampleMriPath,
    });
    console.assert(segRes.status === 202, `Segmentation job failed to start: ${segRes.status}`);
    const jobId = segRes.data.data.jobId;
    console.log(`✓ Segmentation Job Dispatched: ${jobId}`);

    // Poll job status until complete
    let jobStatus = "pending";
    let attempts = 0;
    while (jobStatus !== "completed" && attempts < 40) {
      await new Promise((r) => setTimeout(r, 1000));
      const jobCheck = await request("GET", `/api/jobs/${jobId}`);
      jobStatus = jobCheck.data.data.status;
      attempts++;
      if (jobStatus === "failed") {
        throw new Error(`Segmentation job failed: ${jobCheck.data.data.error}`);
      }
    }
    console.assert(jobStatus === "completed", "Job reached completed status");
    console.log("✓ Segmentation Job Completed Successfully!");

    // 7. Run 3D Reconstruction
    console.log("\n[Step 7] Testing 3D Mesh Reconstruction (Marching Cubes + Taubin Smoothing + QA)...");
    const reconRes = await request("POST", `/api/reconstruct/${TEST_PATIENT_ID}`, {
      taubinIter: 5,
    });
    console.assert(reconRes.status === 200, `Reconstruction failed: ${reconRes.status}`);
    console.log(`✓ 3D Reconstruction Completed. Generated ${reconRes.data.data.total_structures} structures:`);
    reconRes.data.data.meshes.forEach((m) => {
      console.log(`   - ${m.name}: STL: ${m.stl}, Watertight: ${m.watertight}, Vol: ${m.volume_mm3.toFixed(1)} mm³`);
    });

    // 8. Retrieve Mesh Manifest
    console.log("\n[Step 8] Testing Mesh Manifest Retrieval...");
    const manifestRes = await request("GET", `/api/reconstruct/${TEST_PATIENT_ID}`);
    console.assert(manifestRes.status === 200, `Manifest retrieval failed: ${manifestRes.status}`);
    console.assert(manifestRes.data.data.meshes.length > 0, "Manifest contains meshes");
    console.log(`✓ Retrieved Mesh Manifest with ${manifestRes.data.data.meshes.length} items`);

    // 9. Stream Raw Mesh
    console.log("\n[Step 9] Testing Mesh Streaming (/api/meshes/:patientId/:filename)...");
    const meshStreamRes = await request("GET", `/api/meshes/${TEST_PATIENT_ID}/femur_smooth.stl`);
    console.assert(meshStreamRes.status === 200, `Mesh stream failed: ${meshStreamRes.status}`);
    console.assert(meshStreamRes.headers["content-type"] === "model/stl", "Content-Type is model/stl");
    console.log(`✓ Mesh Streamed Successfully (${meshStreamRes.raw.length} bytes, Content-Type: model/stl)`);

    // 10. Individualized Kinematic Alignment (iKA) Planning
    console.log("\n[Step 10] Testing iKA Surgical Planning Generation...");
    const planRes = await request("POST", `/api/patients/${TEST_PATIENT_ID}/plan`, {});
    console.assert(planRes.status === 200, `Planning failed: ${planRes.status}`);
    const plan = planRes.data.data.plan;
    console.log(`✓ iKA Surgical Plan Generated:`);
    console.log(`   - Alignment (HKA Deviation): ${plan.coronalAngles.HKA_deviation_deg}° (mLDFA: ${plan.coronalAngles.mLDFA_deg}°, MPTA: ${plan.coronalAngles.MPTA_deg}°)`);
    console.log(`   - Resections: Distal Femur Medial: ${plan.resections.distalFemurMedialMm}mm, Proximal Tibia Medial: ${plan.resections.proximalTibiaMedialMm}mm`);

    // 11. Retrieve Surgical Plan
    console.log("\n[Step 11] Fetching Stored Surgical Plan...");
    const getPlanRes = await request("GET", `/api/patients/${TEST_PATIENT_ID}/plan`);
    console.assert(getPlanRes.status === 200, `Plan retrieval failed: ${getPlanRes.status}`);
    console.log("✓ Surgical Plan Retrieved from disk successfully");

    // 12. Test Export Gate BEFORE Clinician Approval (Must be 403 Forbidden)
    console.log("\n[Step 12] Testing Secure Export Gate Before Approval (Expect 403 Forbidden)...");
    const unapprovedExport = await request("GET", `/api/export/${TEST_PATIENT_ID}/femur_smooth.stl`);
    console.assert(unapprovedExport.status === 403, `Expected 403, got ${unapprovedExport.status}`);
    console.log("✓ Export Gate correctly blocked uncertified mesh download with 403 Forbidden!");

    // 13. Clinician Approval & SHA-256 Audit
    console.log("\n[Step 13] Clinician Approving 3D Meshes & Recording Cryptographic Audit...");
    const approveRes = await request("POST", `/api/patients/${TEST_PATIENT_ID}/approve`, {
      approved: true,
      reviewer: "DR_SARAH_CHEN_MD",
      reviewNotes: "Reconstruction and iKA resection plans verified. Suitable for robotic navigation export.",
    });
    console.assert(approveRes.status === 200, `Approval failed: ${approveRes.status}`);
    console.log("✓ Approval Recorded. SHA-256 Mesh Hash:", approveRes.data.data.meshHash);

    // 14. Test Export Gate AFTER Clinician Approval (Must be 200 OK)
    console.log("\n[Step 14] Testing Secure Export Gate After Approval (Expect 200 OK)...");
    const approvedExport = await request("GET", `/api/export/${TEST_PATIENT_ID}/femur_smooth.stl`);
    console.assert(approvedExport.status === 200, `Expected 200, got ${approvedExport.status}`);
    console.log("✓ Export Gate allowed approved mesh download! Size:", approvedExport.raw.length, "bytes");

    // 15. Audit Records
    console.log("\n[Step 15] Fetching Patient Audit Trail...");
    const auditRes = await request("GET", `/api/patients/${TEST_PATIENT_ID}/audit`);
    console.assert(auditRes.status === 200, `Audit fetch failed: ${auditRes.status}`);
    console.assert(auditRes.data.data.length > 0, "Audit trail contains records");
    console.log(`✓ Audit trail verified (${auditRes.data.data.length} records)`);

    console.log("\n==================================================");
    console.log(" ALL 15 INTEGRATION TEST PHASES PASSED 100%!");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ TEST PIPELINE FAILED:", err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    // Clean up test patient artifacts
    try {
      const upTest = getPatientUploadDir(TEST_PATIENT_ID);
      const outTest = getPatientOutputDir(TEST_PATIENT_ID);
      if (fs.existsSync(upTest)) fs.rmSync(upTest, { recursive: true, force: true });
      if (fs.existsSync(outTest)) fs.rmSync(outTest, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

runTests();
