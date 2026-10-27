process.env.NODE_ENV = "test";
process.env.USE_ISOLATED_TEST_DB = "true";

import assert from "node:assert/strict";
import http from "http";
import app from "../../backend/app.js";
import { initDatabase } from "../../backend/db/index.js";

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

function parseCookie(setCookieHeaders, cookieName) {
  if (!setCookieHeaders) return null;
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const h of headers) {
    const match = h.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function loginUser(email, password) {
  const res = await request("POST", "/api/auth/login", { email, password });
  assert.equal(res.status, 200, `Login for ${email} should succeed`);
  const setCookies = res.headers["set-cookie"];
  const sessionToken = parseCookie(setCookies, "kneeaxis_session");
  const csrfToken = parseCookie(setCookies, "kneeaxis_csrf");
  return {
    headers: {
      Cookie: `kneeaxis_session=${sessionToken}; kneeaxis_csrf=${csrfToken}`,
      "X-CSRF-Token": csrfToken,
    },
  };
}

async function run() {
  console.log("==================================================");
  console.log(" PATIENT SECURITY & AUTHORIZATION TEST SUITE (C1/C2)");
  console.log("==================================================");

  await initDatabase();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------------------
    // 1. Unauthenticated Requests Must Fail with 401
    // -------------------------------------------------------------------------
    console.log("\n[Test 1] Unauthenticated Access Gates (401 Unauthorized)...");
    const unauthGet = await request("GET", "/api/patients");
    assert.equal(unauthGet.status, 401, "GET /api/patients without auth must return 401");

    const unauthPost = await request("POST", "/api/patients", { name: "Test" });
    assert.equal(unauthPost.status, 401, "POST /api/patients without auth must return 401");

    const unauthId = await request("GET", "/api/patients/KA-9999");
    assert.equal(unauthId.status, 401, "GET /api/patients/:id without auth must return 401");

    const unauthPut = await request("PUT", "/api/patients/KA-9999", { name: "Test" });
    assert.equal(unauthPut.status, 401, "PUT /api/patients/:id without auth must return 401");

    const unauthDel = await request("DELETE", "/api/patients/KA-9999");
    assert.equal(unauthDel.status, 401, "DELETE /api/patients/:id without auth must return 401");

    const unauthUpload = await request("POST", "/api/research/KA-9999/upload");
    assert.equal(unauthUpload.status, 401, "POST /api/research/:patientId/upload without auth must return 401");

    const unauthRun = await request("POST", "/api/research/KA-9999/run");
    assert.equal(unauthRun.status, 401, "POST /api/research/:patientId/run without auth must return 401");

    const unauthStatus = await request("GET", "/api/research/KA-9999/status");
    assert.equal(unauthStatus.status, 401, "GET /api/research/:patientId/status without auth must return 401");

    const unauthManifest = await request("GET", "/api/research/KA-9999/manifest");
    assert.equal(unauthManifest.status, 401, "GET /api/research/:patientId/manifest without auth must return 401");

    const unauthMesh = await request("GET", "/api/research/KA-9999/meshes/femur_raw.stl");
    assert.equal(unauthMesh.status, 401, "GET /api/research/:patientId/meshes/:filename without auth must return 401");
    console.log("✓ All 10 unauthenticated patient endpoints correctly return 401 Unauthorized");

    // -------------------------------------------------------------------------
    // 2. Prevent Privileged Role Self-Assignment on Registration (C2)
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Rejecting Privileged Role Self-Assignment (C2)...");
    const adminSignup = await request("POST", "/api/auth/register", {
      fullName: "Attacker Admin",
      email: "attacker.admin@malicious.com",
      password: "Password#2026!",
      role: "admin",
    });
    assert.equal(adminSignup.status, 400, "Self-assigned admin role must be rejected with 400");

    const surgeonSignup = await request("POST", "/api/auth/register", {
      fullName: "Fake Surgeon",
      email: "fake.surgeon@malicious.com",
      password: "Password#2026!",
      role: "surgeon",
    });
    assert.equal(surgeonSignup.status, 400, "Self-assigned surgeon role must be rejected with 400");
    console.log("✓ Privileged roles (admin, surgeon) cannot be self-assigned on public registration");

    // -------------------------------------------------------------------------
    // 3. Register Two Legitimate Researchers: User A and User B
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Registering User A and User B as Researchers...");
    const regA = await request("POST", "/api/auth/register", {
      fullName: "Researcher Alice",
      email: "alice.researcher@lab-a.org",
      password: "AlicePassword#2026!",
    });
    assert.equal(regA.status, 201, "Alice registration should return 201");
    assert.equal(regA.data.data.user.role, "researcher", "Alice role must be researcher");

    const regB = await request("POST", "/api/auth/register", {
      fullName: "Researcher Bob",
      email: "bob.researcher@lab-b.org",
      password: "BobPassword#2026!",
    });
    assert.equal(regB.status, 201, "Bob registration should return 201");
    assert.equal(regB.data.data.user.role, "researcher", "Bob role must be researcher");
    console.log("✓ Researchers Alice and Bob registered with default 'researcher' role");

    // -------------------------------------------------------------------------
    // 4. Authenticate Users and Create Distinct Patient Records
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Creating Independent Patient Records for Alice and Bob...");
    const aliceAuth = await loginUser("alice.researcher@lab-a.org", "AlicePassword#2026!");
    const bobAuth = await loginUser("bob.researcher@lab-b.org", "BobPassword#2026!");

    const patARes = await request("POST", "/api/patients", {
      patientId: "PAT-ALICE-100",
      name: "Patient Alice One",
      age: 52,
      gender: "Female",
      affectedKnee: "Left",
      clinicalNotes: "Research MRI cohort A.",
    }, aliceAuth.headers);
    assert.equal(patARes.status, 201, "Alice creating her patient should return 201");
    console.log("✓ Alice created Patient PAT-ALICE-100");

    const patBRes = await request("POST", "/api/patients", {
      patientId: "PAT-BOB-200",
      name: "Patient Bob Two",
      age: 61,
      gender: "Male",
      affectedKnee: "Right",
      clinicalNotes: "Research MRI cohort B.",
    }, bobAuth.headers);
    assert.equal(patBRes.status, 201, "Bob creating his patient should return 201");
    console.log("✓ Bob created Patient PAT-BOB-200");

    // -------------------------------------------------------------------------
    // 5. Patient Isolation & IDOR Negative Tests: Alice cannot access Bob's patient
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Negative IDOR Tests: Alice attempting to access Bob's patient...");
    const aliceAccessBobGet = await request("GET", "/api/patients/PAT-BOB-200", null, aliceAuth.headers);
    assert.equal(aliceAccessBobGet.status, 403, "Alice reading Bob's patient must return 403 Forbidden");

    const aliceAccessBobPut = await request("PUT", "/api/patients/PAT-BOB-200", { name: "Compromised Name" }, aliceAuth.headers);
    assert.equal(aliceAccessBobPut.status, 403, "Alice modifying Bob's patient must return 403 Forbidden");

    const aliceAccessBobDel = await request("DELETE", "/api/patients/PAT-BOB-200", null, aliceAuth.headers);
    assert.equal(aliceAccessBobDel.status, 403, "Alice deleting Bob's patient must return 403 Forbidden");

    const aliceAccessBobUpload = await request("POST", "/api/research/PAT-BOB-200/upload", null, aliceAuth.headers);
    assert.equal(aliceAccessBobUpload.status, 403, "Alice uploading to Bob's patient must return 403 Forbidden");

    const aliceAccessBobRun = await request("POST", "/api/research/PAT-BOB-200/run", null, aliceAuth.headers);
    assert.equal(aliceAccessBobRun.status, 403, "Alice running pipeline on Bob's patient must return 403 Forbidden");

    const aliceAccessBobStatus = await request("GET", "/api/research/PAT-BOB-200/status", null, aliceAuth.headers);
    assert.equal(aliceAccessBobStatus.status, 403, "Alice fetching Bob's pipeline status must return 403 Forbidden");

    const aliceAccessBobManifest = await request("GET", "/api/research/PAT-BOB-200/manifest", null, aliceAuth.headers);
    assert.equal(aliceAccessBobManifest.status, 403, "Alice fetching Bob's manifest must return 403 Forbidden");

    const aliceAccessBobMesh = await request("GET", "/api/research/PAT-BOB-200/meshes/femur_raw.stl", null, aliceAuth.headers);
    assert.equal(aliceAccessBobMesh.status, 403, "Alice downloading Bob's mesh must return 403 Forbidden");
    console.log("✓ Alice blocked with 403 Forbidden across all 8 endpoints for Bob's patient");

    // -------------------------------------------------------------------------
    // 6. Negative IDOR Tests: Bob cannot access Alice's patient
    // -------------------------------------------------------------------------
    console.log("\n[Test 6] Negative IDOR Tests: Bob attempting to access Alice's patient...");
    const bobAccessAliceGet = await request("GET", "/api/patients/PAT-ALICE-100", null, bobAuth.headers);
    assert.equal(bobAccessAliceGet.status, 403, "Bob reading Alice's patient must return 403 Forbidden");

    const bobAccessAlicePut = await request("PUT", "/api/patients/PAT-ALICE-100", { name: "Bob Overwrite" }, bobAuth.headers);
    assert.equal(bobAccessAlicePut.status, 403, "Bob updating Alice's patient must return 403 Forbidden");

    const bobAccessAliceDel = await request("DELETE", "/api/patients/PAT-ALICE-100", null, bobAuth.headers);
    assert.equal(bobAccessAliceDel.status, 403, "Bob deleting Alice's patient must return 403 Forbidden");
    console.log("✓ Bob blocked with 403 Forbidden across all endpoints for Alice's patient");

    // -------------------------------------------------------------------------
    // 7. Scoped Patient Listing Verification
    // -------------------------------------------------------------------------
    console.log("\n[Test 7] Scoped Patient Listing (GET /api/patients)...");
    const aliceList = await request("GET", "/api/patients", null, aliceAuth.headers);
    assert.equal(aliceList.status, 200);
    assert.equal(aliceList.data.data.length, 1, "Alice should only see her 1 patient");
    assert.equal(aliceList.data.data[0].patientId, "PAT-ALICE-100");

    const bobList = await request("GET", "/api/patients", null, bobAuth.headers);
    assert.equal(bobList.status, 200);
    assert.equal(bobList.data.data.length, 1, "Bob should only see his 1 patient");
    assert.equal(bobList.data.data[0].patientId, "PAT-BOB-200");
    console.log("✓ Scoped listing verified: Alice sees only PAT-ALICE-100; Bob sees only PAT-BOB-200");

    // -------------------------------------------------------------------------
    // 8. Lead Surgeon Supervisory Access
    // -------------------------------------------------------------------------
    console.log("\n[Test 8] Supervisory Role Access (Lead Orthopedic Surgeon)...");
    const surgeonAuth = await loginUser("lead.surgeon@kneeaxis.hospital", "Surgeon#2026!");

    const surgeonViewA = await request("GET", "/api/patients/PAT-ALICE-100", null, surgeonAuth.headers);
    assert.equal(surgeonViewA.status, 200, "Surgeon can access Alice's patient");

    const surgeonViewB = await request("GET", "/api/patients/PAT-BOB-200", null, surgeonAuth.headers);
    assert.equal(surgeonViewB.status, 200, "Surgeon can access Bob's patient");

    const surgeonList = await request("GET", "/api/patients", null, surgeonAuth.headers);
    assert.equal(surgeonList.status, 200);
    assert.equal(surgeonList.data.data.length, 2, "Surgeon can view all patients across all researchers");
    console.log("✓ Lead Orthopedic Surgeon has legitimate supervisory access to all patients");

    console.log("\n==================================================");
    console.log(" ALL PATIENT SECURITY & AUTHORIZATION TESTS PASSED!");
    console.log("==================================================");
  } catch (err) {
    console.error("\n❌ TEST FAILED:", err);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    process.exit(process.exitCode || 0);
  }
}

run();
