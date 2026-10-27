import "./config/env.js";
import config from "./config/env.js";
import app from "./app.js";
import { initDatabase, getDbMode } from "./db/index.js";
import { getUploadDir, getOutputDir } from "./utils/paths.js";
import { jobService } from "./services/jobService.js";

const PORT = config.PORT;

const startServer = async () => {
  // Ensure storage directories exist
  getUploadDir();
  getOutputDir();

  // Initialize PostgreSQL database layer & seed initial clinical data
  await initDatabase();

  // Reconcile any interrupted or orphan jobs from prior runs
  await jobService.reconcileOrphans();

  const server = app.listen(PORT, () => {
    console.log("=================================================");
    console.log(` KNEEAXIS Backend Server Running`);
    console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(` Port:        http://localhost:${PORT}`);
    console.log(` Health:      http://localhost:${PORT}/api/health`);
    console.log(` Python Path: ${process.env.PYTHON_PATH || "python"}`);
    console.log("=================================================");
  });

  // Graceful shutdown
  const handleExit = (signal) => {
    console.log(`\nReceived ${signal}. Gracefully closing HTTP server...`);
    server.close(() => {
      console.log("KNEEAXIS server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => handleExit("SIGINT"));
  process.on("SIGTERM", () => handleExit("SIGTERM"));
};

startServer();
