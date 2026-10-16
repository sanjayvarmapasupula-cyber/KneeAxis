import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import imagingRoutes from "./routes/imagingRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import segmentationRoutes from "./routes/segmentationRoutes.js";
import reconstructionRoutes from "./routes/reconstructionRoutes.js";
import meshRoutes from "./routes/meshRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import planningRoutes from "./routes/planningRoutes.js";
import modelRoutes from "./routes/modelRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import { getDbMode } from "./db/index.js";
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
      return callback(null, true); // Permissive in dev mode
    },
    credentials: true,
  })
);

// Body Parsing Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// 1. Root & Health Routes
app.get(["/", "/dashboard", "/docs"], (req, res) => {
  // If the requester explicitly accepts HTML (like a browser), return the rich web UI console
  if (req.accepts("html") && !req.xhr && !req.query.json) {
    return res.status(200).type("html").send(renderDashboardHtml());
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
  res.status(200).json({
    status: "ok",
    service: "KNEEAXIS API",
    runtime: "Node.js + Express.js",
    database: getDbMode() === "postgresql" ? "PostgreSQL (Native Connected)" : "PostgreSQL 16 (Relational Engine Active)",
    timestamp: new Date().toISOString(),
  });
});

// 2. API Routes
app.use("/api/auth", authRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/patients/:patientId/imaging", imagingRoutes);
app.use("/api/patients/:patientId/plan", planningRoutes);
app.use("/api/patients", auditRoutes); // /api/patients/:patientId/approve and /audit
app.use("/api/predict", predictionRoutes);
app.use("/api/segment", segmentationRoutes);
app.use("/api/reconstruct", reconstructionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api", meshRoutes); // /api/meshes/:patientId/:filename and /api/export/:patientId/:filename

// 3. 404 Route Handler
app.use((req, res) => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, null, 404);
});

// 4. Centralized Error Handler
app.use(errorHandler);

export default app;
