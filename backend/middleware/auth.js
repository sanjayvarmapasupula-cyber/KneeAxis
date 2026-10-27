import jwt from "jsonwebtoken";
import db from "../db/index.js";
import { sendError } from "../utils/response.js";

const JWT_SECRET = process.env.JWT_SECRET || "clinical-atlas-super-secret-jwt-key-2026";

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, "Access denied. No authentication token provided.", null, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user record from PostgreSQL
    const userRes = await db.query(
      "SELECT id, email, full_name, role, department, avatar_url, is_active FROM users WHERE id = $1",
      [decoded.id]
    );

    if (userRes.rows.length === 0) {
      return sendError(res, "User associated with token no longer exists.", null, 401);
    }

    const user = userRes.rows[0];
    if (!user.is_active) {
      return sendError(res, "This clinical account is deactivated.", null, 403);
    }

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, "Invalid or expired authentication token.", err, 401);
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const userRes = await db.query(
        "SELECT id, email, full_name, role, department, avatar_url FROM users WHERE id = $1",
        [decoded.id]
      );
      if (userRes.rows.length > 0) {
        req.user = userRes.rows[0];
      }
    } catch {
      // Continue without user
    }
  }
  next();
};

export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Authentication required.", null, 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Forbidden: Role '${req.user.role}' does not have permission to perform this clinical action. Required: ${allowedRoles.join(", ")}`,
        null,
        403
      );
    }

    next();
  };
};
