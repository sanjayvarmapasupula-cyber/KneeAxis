import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import imagingRoutes from "./routes/imagingRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import segmentationRoutes from "./routes/segmentationRoutes.js";
import reconstructionRoutes from "./routes/reconstructionRoutes.js";
import meshRoutes from "./routes/meshRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import livePipelineRoutes from "./routes/livePipelineRoutes.js";
import { requireAuth } from "./middleware/auth.js";
import auditRoutes from "./routes/auditRoutes.js";
import planningRoutes from "./routes/planningRoutes.js";
import modelRoutes from "./routes/modelRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import crypto from "crypto";
import db, { getDbMode } from "./db/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { sendError } from "./utils/response.js";
import { renderDashboardHtml } from "./views/dashboard.js";

const app = express();

// CORS configuration for React frontend
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin not allowed"), false);
    },
    credentials: true,
  })
);

// Cookie & Body Parsing Middleware
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 1. Root & Health Routes
app.get(["/", "/dashboard", "/docs"], async (req, res) => {
  // If the requester explicitly accepts HTML (like a browser), return the rich web UI console
  if (req.accepts("html") && !req.xhr && !req.query.json) {
    let csrfToken = req.cookies?.kneeaxis_csrf;
    let sessionToken = req.cookies?.kneeaxis_session;

    // In development mode, automatically provision a supervisory session so console telemetry and registration work seamlessly
    if (!sessionToken && process.env.NODE_ENV !== "production") {
      try {
        const staffRes = await db.query(
          "SELECT id, email, full_name, role FROM users WHERE role = 'surgeon' OR role = 'admin' ORDER BY id ASC LIMIT 1"
        );
        if (staffRes.rows.length > 0) {
          const staffUser = staffRes.rows[0];
          sessionToken = crypto.randomBytes(32).toString("hex");
          csrfToken = crypto.randomBytes(24).toString("hex");
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          await db.query(
            "INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at) VALUES ($1, $2, $3, $4, $5)",
            [staffUser.id, sessionToken, req.ip || "127.0.0.1", "KneeAxis Console Browser", expiresAt]
          );

          res.cookie("kneeaxis_session", sessionToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
          });

          res.cookie("kneeaxis_csrf", csrfToken, {
            httpOnly: false,
            secure: false,
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
          });
        }
      } catch (err) {
        console.warn("[Console Session] Notice establishing console session:", err.message);
      }
    }

    return res.status(200).type("html").send(renderDashboardHtml(csrfToken));
  }

  // Otherwise return JSON API directory
  return res.status(200).json({
    status: "ok",
    service: "KNEEAXIS API",
    version: "1.0.0",
    database: getDbMode() === "postgresql" ? "PostgreSQL (Native)" : "PostgreSQL (Relational Engine)",
    message: "KNEEAXIS Backend API is running successfully.",
    endpoints: {
      auth: "/api/auth",
      models: "/api/models",
      dashboard: "/api/dashboard",
      health: "/api/health",
      patients: "/api/patients",
      predictKl: "/api/predict/kl",
      segment: "/api/segment",
      reconstruct: "/api/reconstruct",
      jobs: "/api/jobs",
    },
    webAppUrl: "http://localhost:3000",
  });
});

app.get("/api/health", (req, res) => {
  const mode = getDbMode();
  const isHealthy = mode !== "disconnected";
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    service: "KNEEAXIS API",
    runtime: "Node.js + Express.js",
    database: {
      connected: isHealthy,
      mode: mode,
      description:
        mode === "postgresql"
          ? "PostgreSQL Server (Active Connected)"
          : mode === "pg-mem"
          ? "PostgreSQL (pg-mem in-process engine)"
          : "PostgreSQL Server Disconnected",
    },
    timestamp: new Date().toISOString(),
  });
});

// 2. API Routes
app.use("/api/auth", authRoutes);
app.use("/api/research", livePipelineRoutes);
app.use("/api/users", userRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/patients/:patientId/imaging", requireAuth, imagingRoutes);
app.use("/api/patients/:patientId/plan", requireAuth, (req,res,next) => {
  if (process.env.ENABLE_UNVALIDATED_PLANNING === "true") return next();
  return res.status(403).json({ success: false, error: "Planning blocked: full-leg alignment/landmarks and surgical measurements are not clinically validated from the available knee MRI data." });
}, planningRoutes);
app.use("/api/patients", auditRoutes); // /api/patients/:patientId/approve and /audit
app.use("/api/predict", predictionRoutes);
app.use("/api/segment", requireAuth, (req, res) => res.status(410).json({ success: false, error: "Legacy 3D segmentation is disabled. Use /api/research/:patientId/run for real nnU-Net inference." }));
app.use("/api/reconstruct", requireAuth, (req, res) => res.status(410).json({ success: false, error: "Legacy reconstruction is disabled. Use the authenticated real MRI → nnU-Net → mesh pipeline." }));
app.use("/api/jobs", requireAuth, jobRoutes);
app.use("/api", requireAuth, meshRoutes); // /api/meshes/:patientId/:filename and /api/export/:patientId/:filename

// 3. 404 Route Handler
app.use((req, res) => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, null, 404);
});

// 4. Centralized Error Handler
app.use(errorHandler);

export default app;
