import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { WORKSPACE_ROOT, BACKEND_ROOT } from "../utils/paths.js";

/**
 * Execute a Python script safely using child_process.spawn() with an argument array.
 * 
 * @param {string} scriptRelativeOrAbsPath - Path to the Python script
 * @param {Array<string>} args - Array of command-line arguments
 * @param {Object} options - Optional configuration (timeoutMs, cwd, parseJson)
 * @returns {Promise<{ stdout: string, stderr: string, data?: any }>}
 */
export const runPythonScript = (scriptRelativeOrAbsPath, args = [], options = {}) => {
  return new Promise((resolve, reject) => {
    const pythonExecutable = options.pythonExecutable || process.env.PYTHON_PATH || "python";
    const timeoutMs = options.timeoutMs || parseInt(process.env.PYTHON_TIMEOUT_MS, 10) || 180000;
    const parseJson = options.parseJson !== false; // default true

    // Resolve script path relative to workspace or backend
    let scriptPath = scriptRelativeOrAbsPath;
    if (!path.isAbsolute(scriptPath)) {
      const fromBackend = path.resolve(BACKEND_ROOT, scriptPath);
      const fromWorkspace = path.resolve(WORKSPACE_ROOT, scriptPath);
      if (fs.existsSync(fromBackend)) {
        scriptPath = fromBackend;
      } else if (fs.existsSync(fromWorkspace)) {
        scriptPath = fromWorkspace;
      } else {
        scriptPath = fromWorkspace; // default fallback
      }
    }

    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Python script not found at path: ${scriptPath}`));
    }

    const cwd = options.cwd || path.dirname(scriptPath);

    console.log(`[PythonService] Spawning: ${pythonExecutable} ${scriptPath} with ${args.length} args (CWD: ${cwd})`);

    const child = spawn(pythonExecutable, [scriptPath, ...args], {
      cwd,
      env: { ...process.env, ...(options.env || {}) },
      windowsHide: true,
    });

    let stdoutData = "";
    let stderrData = "";
    let isTimedOut = false;

    const timer = setTimeout(() => {
      isTimedOut = true;
      child.kill("SIGTERM");
      const timeoutErr = new Error(`Python process timed out after ${timeoutMs}ms: ${scriptPath}`);
      timeoutErr.statusCode = 504;
      reject(timeoutErr);
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      if (isTimedOut) return;
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (isTimedOut) return;

      if (code !== 0) {
        const errorMsg = `Python script exited with code ${code}. Stderr: ${stderrData.trim() || "No stderr output."}`;
        const execErr = new Error(errorMsg);
        execErr.statusCode = 500;
        execErr.stdout = stdoutData;
        execErr.stderr = stderrData;
        return reject(execErr);
      }

      let parsedData = null;
      if (parseJson) {
        const trimmed = stdoutData.trim();
        try {
          parsedData = JSON.parse(trimmed);
        } catch {
          // If logs precede or follow JSON, extract JSON block
          const firstBrace = trimmed.indexOf("{");
          const lastBrace = trimmed.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            try {
              parsedData = JSON.parse(trimmed.substring(firstBrace, lastBrace + 1));
            } catch {
              parsedData = null;
            }
          }
        }
      }

      resolve({
        stdout: stdoutData,
        stderr: stderrData,
        data: parsedData,
      });
    });
  });
};
