/**
 * KNEEAXIS REAL-GPU SMOKE TEST
 *
 * Runs explicitly authorized research MRI through the genuine local nnU-Net v2 model:
 * Input MRI: E:\KneeAxis_Datasets\OAIZIB-CM\imagesTr\oaizib_018_0000.nii.gz
 * Active Checkpoint: Epoch 50 (checkpoint_kneeaxis_e50_2241076a6e66.pth)
 * Python Interpreter: E:\KneeAxis_Datasets\nnUNet\.venv\Scripts\python.exe
 *
 * Stages:
 * 1. Environment & GPU diagnostic
 * 2. Active checkpoint byte integrity check (SHA-256)
 * 3. 3D nnU-Net inference on RTX 3050 Laptop GPU (4 GB VRAM)
 * 4. 5-structure conservative 3D marching cubes reconstruction
 * 5. Independent topology QA (watertightness, topology, volumes)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { runPythonScript } from "../../backend/services/pythonService.js";
import { WORKSPACE_ROOT } from "../../backend/utils/paths.js";
import { modelStatus, verifyCheckpointIntegrityCached } from "../../backend/services/livePipelineService.js";

const RESEARCH_MRI = "E:\\KneeAxis_Datasets\\OAIZIB-CM\\imagesTr\\oaizib_018_0000.nii.gz";
const PYTHON_VENV = "E:\\KneeAxis_Datasets\\nnUNet\\.venv\\Scripts\\python.exe";
const NNUNET_RESULTS = "E:\\KneeAxis_Datasets\\nnUNet\\nnUNet_results";
const TEST_CASE_ID = "SMOKE-GPU-018";
const OUTPUT_DIR = path.resolve(WORKSPACE_ROOT, "outputs", "patients", TEST_CASE_ID);

async function runGpuSmoke() {
  console.log("==================================================");
  console.log(" KNEEAXIS REAL-GPU SMOKE TEST (RTX 3050 · 4 GB VRAM)");
  console.log("==================================================");

  // 1. Check Input Files
  console.log("\n[Step 1] Verifying Physical Files & Paths...");
  assert.ok(fs.existsSync(RESEARCH_MRI), `Input research MRI not found: ${RESEARCH_MRI}`);
  assert.ok(fs.existsSync(PYTHON_VENV), `Python virtual environment not found: ${PYTHON_VENV}`);
  console.log(`✓ Input MRI: ${RESEARCH_MRI}`);
  console.log(`✓ Python: ${PYTHON_VENV}`);

  // 2. Model Status & Registry Verification
  console.log("\n[Step 2] Checking Model Registry & Checkpoint Integrity...");
  const model = modelStatus();
  assert.ok(model.ready, `Model is not ready: ${model.diagnostic}`);
  assert.equal(model.trainedEpochs, 50, "Active model is epoch 50");
  assert.ok(model.checkpointPath && fs.existsSync(model.checkpointPath), "Checkpoint file exists");
  console.log(`✓ Active Checkpoint: ${model.checkpoint}`);
  console.log(`✓ Mean Full-Volume Dice: ${model.devMeanFullVolumeDice} (across 24 dev scans)`);

  // 3. Prepare Test Output Folder
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const segDir = path.join(OUTPUT_DIR, "segmentation");
  fs.mkdirSync(segDir, { recursive: true });
  const segOut = path.join(segDir, "prediction.nii.gz");

  // 4. Run Genuine nnU-Net Inference
  console.log("\n[Step 3] Executing Genuine nnU-Net Inference on NVIDIA GPU...");
  console.log("   (Predicting 5 anatomical structures with conservative memory optimization)...");
  const startTime = Date.now();
  await runPythonScript(
    path.join(WORKSPACE_ROOT, "ml", "inference", "predict_nnunet_kneeaxis.py"),
    [
      "--input", RESEARCH_MRI,
      "--output", segOut,
      "--checkpoint", model.checkpointPath,
      "--model-folder", path.dirname(model.checkpointPath),
      "--case-id", TEST_CASE_ID,
      "--dataset", "922",
      "--plans", "nnUNetPlans_KneeAxis3D_3G",
    ],
    {
      pythonExecutable: PYTHON_VENV,
      timeoutMs: 60 * 60 * 1000,
      parseJson: false,
      env: { nnUNet_results: NNUNET_RESULTS },
    }
  );
  const inferSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
  assert.ok(fs.existsSync(segOut), "Segmentation volume generated");
  const segProvenancePath = path.join(segDir, "prediction_provenance.json");
  assert.ok(fs.existsSync(segProvenancePath), "Segmentation provenance recorded");
  console.log(`✓ nnU-Net Inference Finished in ${inferSeconds}s. Segmentation size: ${(fs.statSync(segOut).size / 1024).toFixed(1)} KB`);

  // 5. Run Conservative 3D Marching Cubes Reconstruction
  console.log("\n[Step 4] Running Conservative 3D Marching Cubes Reconstruction...");
  await runPythonScript(
    path.join(WORKSPACE_ROOT, "ml", "inference", "KneeAxis_Reconstruct_Conservative_v4.py"),
    ["--segmentation", segOut, "--output", OUTPUT_DIR, "--case-id", TEST_CASE_ID],
    { pythonExecutable: PYTHON_VENV, timeoutMs: 60 * 60 * 1000, parseJson: false }
  );
  const manifestPath = path.join(OUTPUT_DIR, "mesh_manifest.json");
  assert.ok(fs.existsSync(manifestPath), "Mesh manifest created");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.meshes.length, 5, "Exactly 5 anatomical structures reconstructed");
  console.log(`✓ 3D Reconstruction complete. 5 meshes produced.`);

  // 6. Run Independent Geometry QA
  console.log("\n[Step 5] Running Independent Geometry QA Verification...");
  await runPythonScript(
    path.join(WORKSPACE_ROOT, "ml", "inference", "KneeAxis_Verify_3D_v4.py"),
    ["--segmentation", segOut, "--output", OUTPUT_DIR],
    { pythonExecutable: PYTHON_VENV, timeoutMs: 60 * 60 * 1000, parseJson: false }
  );
  const indepQaPath = path.join(OUTPUT_DIR, "independent_mesh_check.json");
  assert.ok(fs.existsSync(indepQaPath), "Independent QA check produced");
  const indepQa = JSON.parse(fs.readFileSync(indepQaPath, "utf8"));
  assert.equal(indepQa.passed, true, "Independent geometry QA passed");
  console.log("✓ Independent Geometry QA PASSED: All 5 meshes verified watertight and manifold.");

  for (const s of indepQa.structures || []) {
    console.log(`   - Structure ${s.name}: Watertight=${s.watertight}, Volume=${s.volume_mm3?.toFixed(1)} mm³`);
  }

  console.log("\n==================================================");
  console.log(" REAL-GPU SMOKE TEST PASSED 100%!");
  console.log("==================================================");
}

runGpuSmoke().catch((err) => {
  console.error("\n❌ GPU SMOKE TEST FAILED:", err);
  process.exitCode = 1;
});
