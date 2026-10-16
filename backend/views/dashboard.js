/**
 * KNEEAXIS - Backend Web Console & Interactive Telemetry Dashboard
 * Styled in clean medical white theme matching the frontend clinical workstation.
 * Rendered when visiting http://localhost:5000 in a web browser.
 */
export function renderDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KNEEAXIS — Robotic Knee Surgical Intelligence & 3D Planning Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-page: #f8fafc;
      --bg-card: #ffffff;
      --bg-card-hover: #f1f5f9;
      --border-color: #e2e8f0;
      --border-subtle: #f1f5f9;
      --primary: #0284c7;
      --primary-light: #0284c7;
      --accent-cyan: #0284c7;
      --accent-emerald: #10b981;
      --accent-purple: #7c3aed;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --text-dim: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #f0fdf4 0%, #f8fafc 65%);
      color: var(--text-main);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      padding: 24px;
      line-height: 1.5;
    }

    .container {
      max-width: 1240px;
      margin: 0 auto;
    }

    /* Top Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      margin-bottom: 24px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
    }
    .logo-icon svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: white;
      stroke-width: 2.2;
    }
    .brand h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0f172a;
    }
    .brand p {
      font-size: 13px;
      color: var(--text-muted);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      color: #059669;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    /* Primary Launch Banner */
    .launch-banner {
      background: linear-gradient(135deg, #eff6ff, #f0fdf4);
      border: 1px solid #bfdbfe;
      border-radius: 16px;
      padding: 22px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.08);
    }
    .launch-info h2 {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #1e3a8a;
    }
    .launch-info p {
      font-size: 13.5px;
      color: #475569;
      max-width: 680px;
    }
    .launch-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 13px 26px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: white;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .launch-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(2, 132, 199, 0.4);
      background: linear-gradient(135deg, #0369a1, #1d4ed8);
    }

    /* Architectural Pipeline Flow Diagram Section */
    .arch-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
    }
    .arch-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }
    .arch-header h3 {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .arch-header svg {
      width: 20px;
      height: 20px;
      stroke: var(--primary);
    }

    .pipeline-diagram {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    .pipe-step {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      transition: all 0.2s ease;
      position: relative;
    }
    .pipe-step:hover {
      border-color: #93c5fd;
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.08);
      background: #ffffff;
    }
    .pipe-step-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      color: #0284c7;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .pipe-step-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .pipe-step-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .pipe-tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
    }
    .pipe-tag-green { background: #dcfce7; color: #15803d; }
    .pipe-tag-blue { background: #dbeafe; color: #1e40af; }
    .pipe-tag-purple { background: #f3e8ff; color: #6b21a8; }
    .pipe-tag-amber { background: #fef3c7; color: #b45309; }

    /* Grid layout */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }

    /* Card styling */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
      transition: all 0.2s ease;
    }
    .card:hover {
      border-color: #cbd5e1;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }
    .card-title svg {
      width: 20px;
      height: 20px;
      stroke: var(--primary);
    }

    .telemetry-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 13px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .telemetry-row:last-child {
      border-bottom: none;
    }
    .telemetry-label {
      color: var(--text-muted);
    }
    .telemetry-value {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #0f172a;
    }
    .badge-pill {
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-green { background: #dcfce7; color: #15803d; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-amber { background: #fef3c7; color: #b45309; }

    /* Interactive Console Section */
    .console-section {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .section-header h2 {
      font-size: 18px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #0f172a;
    }

    .api-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 16px;
    }
    .api-btn {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s ease;
      font-family: 'JetBrains Mono', monospace;
    }
    .api-btn:hover {
      background: #e0f2fe;
      border-color: #7dd3fc;
      color: #0369a1;
    }
    .api-btn.active {
      background: #0284c7;
      border-color: #0284c7;
      color: white;
    }
    .method-tag {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .method-get { background: #dcfce7; color: #15803d; }
    .method-post { background: #dbeafe; color: #1e40af; }

    /* Output Console */
    .terminal-window {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      overflow: hidden;
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    }
    .terminal-header {
      background: #1e293b;
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #334155;
    }
    .terminal-dots {
      display: flex;
      gap: 6px;
    }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }
    .terminal-url {
      color: #94a3b8;
      font-size: 12px;
    }
    .terminal-body {
      padding: 16px;
      max-height: 380px;
      overflow-y: auto;
      color: #38bdf8;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* Patient Table Preview */
    .patient-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 12px;
    }
    .patient-table th {
      text-align: left;
      padding: 10px 12px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
      background: #f8fafc;
    }
    .patient-table td {
      padding: 12px;
      border-bottom: 1px solid var(--border-subtle);
      color: #334155;
    }
    .patient-table tr:hover {
      background: #f8fafc;
    }

    /* Footer */
    .footer {
      text-align: center;
      font-size: 13px;
      color: var(--text-dim);
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color);
    }
    .footer a {
      color: #0284c7;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="brand">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        </div>
        <div>
          <h1>KNEEAXIS Backend Server</h1>
          <p>Autonomous 3D Knee Reconstruction & Robotic TKA Planning Engine</p>
        </div>
      </div>
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>SYSTEM ONLINE & HEALTHY</span>
      </div>
    </header>

    <!-- App Launch Callout -->
    <div class="launch-banner">
      <div class="launch-info">
        <h2>Launch Main KNEEAXIS 3D Web Application</h2>
        <p>You are viewing the backend API, telemetry, and integration engine on <strong>Port 5000</strong>. The complete interactive React 19 + Three.js application with 3D knee model visualization, AI segmentation viewer, and surgical planning console is live on <strong>Port 3000</strong>.</p>
      </div>
      <a href="http://localhost:3000" target="_blank" class="launch-btn">
        <span>Open Web App (Port 3000)</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>
    </div>

    <!-- Architectural Pipeline Flow (Diagram Alignment) -->
    <div class="arch-card">
      <div class="arch-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          KNEEAXIS End-to-End System Architecture
        </h3>
        <span class="badge-pill badge-green">Pipeline Operational</span>
      </div>
      <div class="pipeline-diagram">
        <div class="pipe-step">
          <div class="pipe-step-num"><span>01</span><span class="pipe-tag pipe-tag-blue">React</span></div>
          <div class="pipe-step-title">Frontend UI</div>
          <div class="pipe-step-desc">React 19 + Three.js 3D viewport, patient dashboard, and resection controls.</div>
        </div>
        <div class="pipe-step">
          <div class="pipe-step-num"><span>02</span><span class="pipe-tag pipe-tag-green">Express.js</span></div>
          <div class="pipe-step-title">API Gateway</div>
          <div class="pipe-step-desc">PostgreSQL database, patient uploads, authentication, and job orchestration.</div>
        </div>
        <div class="pipe-step">
          <div class="pipe-step-num"><span>03</span><span class="pipe-tag pipe-tag-amber">Subprocess</span></div>
          <div class="pipe-step-title">Python Engine</div>
          <div class="pipe-step-desc">Async runner driving deep learning inference and scientific mesh extraction.</div>
        </div>
        <div class="pipe-step">
          <div class="pipe-step-num"><span>04</span><span class="pipe-tag pipe-tag-purple">Now</span></div>
          <div class="pipe-step-title">3D Reconstruction</div>
          <div class="pipe-step-desc">reconstruct_3d.py generating watertight STL / OBJ meshes with QA metrics.</div>
        </div>
        <div class="pipe-step">
          <div class="pipe-step-num"><span>05</span><span class="pipe-tag pipe-tag-blue">Later</span></div>
          <div class="pipe-step-title">AI Inference</div>
          <div class="pipe-step-desc">predict_segmentation.py producing prediction.nii.gz (custom weight hook ready).</div>
        </div>
        <div class="pipe-step">
          <div class="pipe-step-num"><span>06</span><span class="pipe-tag pipe-tag-green">Robotic</span></div>
          <div class="pipe-step-title">Knee Planning & Export</div>
          <div class="pipe-step-desc">ika_planner.py calculating varus/valgus cuts, implant sizes, and clinical report export.</div>
        </div>
      </div>
    </div>

    <!-- Telemetry Cards -->
    <div class="grid-3">
      <!-- Card 1: Server Runtime -->
      <div class="card">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
          Express.js HTTP Server
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Status</span>
          <span class="badge-pill badge-green">RUNNING</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Listening Port</span>
          <span class="telemetry-value">5000</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Frontend Proxy</span>
          <span class="telemetry-value">http://localhost:3000</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Environment</span>
          <span class="badge-pill badge-blue">development</span>
        </div>
      </div>

      <!-- Card 2: PostgreSQL Database -->
      <div class="card">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
          PostgreSQL Database
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Connection</span>
          <span class="badge-pill badge-green">ACTIVE & CONNECTED</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Engine / Schema</span>
          <span class="telemetry-value">kneeaxis_clinical_db (pg)</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Live Patient Cohort</span>
          <span class="telemetry-value" id="patientCount">6 Records</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Audit Engine</span>
          <span class="badge-pill badge-purple">SHA-256 Enabled</span>
        </div>
      </div>

      <!-- Card 3: AI & 3D Python Subprocesses -->
      <div class="card">
        <div class="card-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><path d="M12 6v6l4 2"></path></svg>
          AI Pipeline & 3D Mesh
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">ResNet-50 KL</span>
          <span class="badge-pill badge-blue">predict_kl.py</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">Attention U-Net</span>
          <span class="badge-pill badge-blue">predict_segmentation.py</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">3D Reconstruction (now)</span>
          <span class="badge-pill badge-purple">reconstruct_3d.py</span>
        </div>
        <div class="telemetry-row">
          <span class="telemetry-label">iKA Planner</span>
          <span class="badge-pill badge-green">ika_planner.py</span>
        </div>
      </div>
    </div>

    <!-- Interactive API Console -->
    <div class="console-section">
      <div class="section-header">
        <h2>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          Live API Endpoint Explorer
        </h2>
        <span style="font-size: 13px; color: var(--text-muted);">Click an endpoint to test live responses</span>
      </div>

      <div class="api-buttons">
        <button class="api-btn active" onclick="callApi('/api/health', this)">
          <span class="method-tag method-get">GET</span> /api/health
        </button>
        <button class="api-btn" onclick="callApi('/api/patients', this)">
          <span class="method-tag method-get">GET</span> /api/patients
        </button>
        <button class="api-btn" onclick="callApi('/api/patients/MRN-ROSA-0568', this)">
          <span class="method-tag method-get">GET</span> /api/patients/MRN-ROSA-0568
        </button>
        <button class="api-btn" onclick="callApi('/api/models/custom-config/get', this)">
          <span class="method-tag method-get">GET</span> /api/models/custom-config/get
        </button>
        <button class="api-btn" onclick="testKlInference(this)">
          <span class="method-tag method-post">POST</span> /api/predict/kl (Eleanor Vance)
        </button>
        <button class="api-btn" onclick="callApi('/api/jobs', this)">
          <span class="method-tag method-get">GET</span> /api/jobs
        </button>
      </div>

      <div class="terminal-window">
        <div class="terminal-header">
          <div class="terminal-dots">
            <div class="dot dot-red"></div>
            <div class="dot dot-yellow"></div>
            <div class="dot dot-green"></div>
          </div>
          <span class="terminal-url" id="endpointLabel">GET http://localhost:5000/api/health</span>
          <span id="responseStatus" style="color: #34d399; font-size: 11px; font-weight: 600;">200 OK</span>
        </div>
        <pre class="terminal-body" id="consoleOutput">Loading system status...</pre>
      </div>
    </div>

    <!-- Seeded Patients Preview -->
    <div class="console-section">
      <div class="section-header">
        <h2>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          Active Clinical Cohort in PostgreSQL
        </h2>
      </div>
      <div style="overflow-x: auto;">
        <table class="patient-table">
          <thead>
            <tr>
              <th>Patient MRN</th>
              <th>Name</th>
              <th>Age / Gender</th>
              <th>Affected Knee</th>
              <th>Clinical Summary</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="patientTableBody">
            <tr><td colspan="6" style="text-align: center; color: var(--text-dim);">Loading patient cohort...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      KNEEAXIS &copy; 2026 — Autonomous 3D Knee Reconstruction & Arthroplasty Planning Platform.
      <br>
      Frontend URL: <a href="http://localhost:3000">http://localhost:3000</a> | Backend API: <a href="http://localhost:5000">http://localhost:5000</a>
    </div>
  </div>

  <script>
    async function callApi(endpoint, btn) {
      if (btn) {
        document.querySelectorAll('.api-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      const label = document.getElementById('endpointLabel');
      const output = document.getElementById('consoleOutput');
      const status = document.getElementById('responseStatus');

      label.innerText = 'GET http://localhost:5000' + endpoint;
      output.innerText = 'Calling API...';

      try {
        const start = performance.now();
        const res = await fetch(endpoint);
        const elapsed = (performance.now() - start).toFixed(0);
        status.innerText = res.status + ' ' + res.statusText + ' (' + elapsed + 'ms)';
        status.style.color = res.ok ? '#34d399' : '#ef4444';
        const json = await res.json();
        output.innerText = JSON.stringify(json, null, 2);
      } catch (err) {
        status.innerText = 'ERROR';
        status.style.color = '#ef4444';
        output.innerText = 'Fetch error: ' + err.message;
      }
    }

    async function testKlInference(btn) {
      if (btn) {
        document.querySelectorAll('.api-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      const label = document.getElementById('endpointLabel');
      const output = document.getElementById('consoleOutput');
      const status = document.getElementById('responseStatus');

      label.innerText = 'POST http://localhost:5000/api/predict/kl';
      output.innerText = 'Dispatching inference request for Eleanor Vance (MRN-ROSA-0568)...';

      try {
        const res = await fetch('/api/predict/kl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId: 'MRN-ROSA-0568' })
        });
        status.innerText = res.status + ' ' + res.statusText;
        status.style.color = res.ok ? '#34d399' : '#ef4444';
        const json = await res.json();
        output.innerText = JSON.stringify(json, null, 2);
      } catch (err) {
        status.innerText = 'ERROR';
        status.style.color = '#ef4444';
        output.innerText = 'Fetch error: ' + err.message;
      }
    }

    async function loadPatients() {
      try {
        const res = await fetch('/api/patients');
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          document.getElementById('patientCount').innerText = json.data.length + ' Records';
          const tbody = document.getElementById('patientTableBody');
          tbody.innerHTML = json.data.map(function(p) {
            var kneeClass = p.affectedKnee === 'Right' ? 'badge-blue' : 'badge-purple';
            return '<tr>' +
              '<td><strong style="color: #0284c7; font-family: JetBrains Mono, monospace;">' + p.patientId + '</strong></td>' +
              '<td>' + p.name + '</td>' +
              '<td>' + (p.age || 'N/A') + ' yo / ' + (p.gender || 'Unknown') + '</td>' +
              '<td><span class="badge-pill ' + kneeClass + '">' + (p.affectedKnee || 'Right') + '</span></td>' +
              '<td style="color: #64748b; font-size: 12px; max-width: 320px;">' + (p.clinicalNotes || 'None') + '</td>' +
              '<td><button class="api-btn" style="padding: 4px 10px; font-size: 11px;" onclick="callApi(\\'/api/patients/' + p.patientId + '\\', null)">Inspect</button></td>' +
              '</tr>';
          }).join('');
        }
      } catch (e) {
        console.error('Failed to load patient cohort:', e);
      }
    }

    // Initialize on load
    callApi('/api/health');
    loadPatients();
  </script>
</body>
</html>
`;
}
