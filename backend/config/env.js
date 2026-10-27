import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_DIR = path.resolve(__dirname, "..");

// 1. Immediately load environment variables before any other imports evaluate
dotenv.config({ path: path.join(BACKEND_DIR, ".env") });

const NODE_ENV = process.env.NODE_ENV || "development";
const isTest = NODE_ENV === "test" || process.env.USE_ISOLATED_TEST_DB === "true";
const isProduction = NODE_ENV === "production";

// 2. Validate JWT Secret
let jwtSecret = process.env.JWT_SECRET;
const INSECURE_DEFAULTS = [
  "kneeaxis-super-secret-jwt-key-2026",
  "secret",
  "changeme",
  "password",
  "123456",
];

if (isTest) {
  jwtSecret = jwtSecret || "test-environment-isolated-jwt-secret-at-least-32-chars-long";
} else if (isProduction) {
  if (!jwtSecret || jwtSecret.length < 32 || INSECURE_DEFAULTS.includes(jwtSecret)) {
    throw new Error(
      "[Security Startup Failure] JWT_SECRET must be configured in environment with at least 32 characters in production."
    );
  }
} else {
  // Development mode: require non-empty JWT secret
  if (!jwtSecret) {
    throw new Error(
      "[Security Startup Failure] JWT_SECRET is missing. Please set JWT_SECRET in backend/.env"
    );
  }
  if (INSECURE_DEFAULTS.includes(jwtSecret)) {
    console.warn(
      "[Security Warning] Using a known default JWT_SECRET in development. Set a strong unique secret before exposing over a network."
    );
  }
}

// 3. Database URL Helper with Password Masking
export const maskDatabaseUrl = (url) => {
  if (!url || typeof url !== "string") return "[unset]";
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "******";
    }
    return parsed.toString();
  } catch {
    return url.replace(/:([^:@]+)@/, ":******@");
  }
};

export const config = Object.freeze({
  NODE_ENV,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  JWT_SECRET: jwtSecret,
  DATABASE_URL: process.env.DATABASE_URL || "",
  isTest,
  isProduction,
  UPLOAD_DIR: process.env.UPLOAD_DIR || "../uploads",
  OUTPUT_DIR: process.env.OUTPUT_DIR || "../outputs",
  NNUNET_MODEL_REGISTRY: process.env.NNUNET_MODEL_REGISTRY || "",
  NNUNET_MODEL_FOLDER: process.env.NNUNET_MODEL_FOLDER || "",
  NNUNET_RESULTS: process.env.NNUNET_RESULTS || "",
  NNUNET_PYTHON: process.env.NNUNET_PYTHON || "python",
  RECONSTRUCTION_PYTHON: process.env.RECONSTRUCTION_PYTHON || process.env.NNUNET_PYTHON || "python",
  ENABLE_UNVALIDATED_PLANNING: process.env.ENABLE_UNVALIDATED_PLANNING === "true",
});

export default config;
