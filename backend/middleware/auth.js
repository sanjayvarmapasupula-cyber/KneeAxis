import jwt from "jsonwebtoken";
import db from "../db/index.js";
import { sendError } from "../utils/response.js";
import config from "../config/env.js";

const JWT_SECRET = config.JWT_SECRET;

/**
 * Generate authenticated JWT token for user and session.
 * @param {object} user - User record from PostgreSQL
 * @param {string} sessionId - Associated session token identifier
 * @param {boolean} rememberMe - Whether user opted for prolonged session
 */
export const generateToken = (user, sessionId = null, rememberMe = false) => {
  const expiresIn = rememberMe ? "30d" : "24h";
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name,
      sessionId,
    },
    JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Authenticates user requests via HttpOnly cookie or Bearer header,
 * and enforces CSRF validation on mutating requests for cookie sessions.
 */
export const requireAuth = async (req, res, next) => {
  // 1. Extract session token: check HttpOnly cookie first, then Authorization header
  let token = null;
  let isCookieAuth = false;

  if (req.cookies && req.cookies.kneeaxis_session) {
    token = req.cookies.kneeaxis_session;
    isCookieAuth = true;
  } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return sendError(res, "Access denied. No authentication session or token provided.", null, 401);
  }

  // 2. Enforce Double-Submit Cookie CSRF validation on mutating operations when authenticated via cookie
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (isCookieAuth && mutatingMethods.includes(req.method.toUpperCase())) {
    const csrfHeader = req.headers["x-csrf-token"] || req.headers["x-xsrf-token"];
    const csrfCookie = req.cookies?.kneeaxis_csrf;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      return sendError(
        res,
        "CSRF validation failed: Missing or invalid X-CSRF-Token header. State-changing requests require valid CSRF proof.",
        null,
        403
      );
    }
  }

  try {
    let userId = null;
    let sessionId = null;
    let sessionToken = null;

    // Check if token is a JWT (has three dot-separated segments)
    if (token.includes(".")) {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
      sessionToken = decoded.sessionId;
    } else {
      // Direct raw session identifier
      sessionToken = token;
    }

    // If we have a session token, query sessions table joined with users
    if (sessionToken) {
      const sessionRes = await db.query(
        `SELECT s.id AS session_id, s.session_token, s.expires_at, s.revoked_at,
                u.id, u.email, u.full_name, u.role, u.department, u.avatar_url, u.account_status, u.is_active
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_token = $1`,
        [sessionToken]
      );

      if (sessionRes.rows.length === 0) {
        return sendError(res, "Session does not exist or has expired.", null, 401);
      }

      const session = sessionRes.rows[0];

      if (session.revoked_at) {
        return sendError(res, "Session has been revoked or logged out.", null, 401);
      }

      if (new Date(session.expires_at) < new Date()) {
        return sendError(res, "Session has expired. Please sign in again.", null, 401);
      }

      if (!session.is_active || session.account_status === "suspended") {
        return sendError(res, "This account is inactive or suspended.", null, 403);
      }

      // Update session last_used_at asynchronously
      db.query("UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1", [
        session.session_id,
      ]).catch(() => {});

      req.sessionId = session.session_id;
      req.sessionToken = session.session_token;
      req.user = {
        id: session.id,
        email: session.email,
        full_name: session.full_name,
        role: session.role,
        department: session.department,
        avatar_url: session.avatar_url,
        account_status: session.account_status,
        is_active: session.is_active,
      };

      return next();
    }

    // Fallback: direct JWT without session tracking
    if (userId) {
      const userRes = await db.query(
        `SELECT id, email, full_name, role, department, avatar_url, account_status, is_active
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (userRes.rows.length === 0) {
        return sendError(res, "User associated with token no longer exists.", null, 401);
      }

      const user = userRes.rows[0];
      if (!user.is_active || user.account_status === "suspended") {
        return sendError(res, "This account is inactive or suspended.", null, 403);
      }

      req.user = user;
      return next();
    }

    return sendError(res, "Invalid authentication session format.", null, 401);
  } catch (err) {
    return sendError(res, "Invalid or expired authentication session.", err, 401);
  }
};

export const optionalAuth = async (req, res, next) => {
  let token = null;
  if (req.cookies && req.cookies.kneeaxis_session) {
    token = req.cookies.kneeaxis_session;
  } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (token) {
    try {
      if (token.includes(".")) {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userRes = await db.query(
          `SELECT id, email, full_name, role, department, avatar_url, account_status, is_active
           FROM users
           WHERE id = $1`,
          [decoded.id]
        );
        if (userRes.rows.length > 0 && userRes.rows[0].is_active) {
          req.user = userRes.rows[0];
          if (decoded.sessionId) req.sessionToken = decoded.sessionId;
        }
      } else {
        const sessionRes = await db.query(
          `SELECT u.id, u.email, u.full_name, u.role, u.department, u.avatar_url, u.account_status, u.is_active, s.session_token
           FROM sessions s
           JOIN users u ON s.user_id = u.id
           WHERE s.session_token = $1 AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP`,
          [token]
        );
        if (sessionRes.rows.length > 0) {
          req.user = sessionRes.rows[0];
          req.sessionToken = sessionRes.rows[0].session_token;
        }
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
        `Forbidden: Role '${req.user.role}' does not have permission to perform this clinical action. Required: ${allowedRoles.join(
          ", "
        )}`,
        null,
        403
      );
    }

    next();
  };
};

export default {
  generateToken,
  requireAuth,
  optionalAuth,
  requireRole,
};
