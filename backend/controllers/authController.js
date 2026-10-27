import crypto from "crypto";
import bcrypt from "bcryptjs";
import db from "../db/index.js";
import { generateToken } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * Register a new clinical or research user in PostgreSQL
 */
export const register = async (req, res) => {
  try {
    const { email, password, fullName, role, department } = req.body;

    if (!email || !password || !fullName) {
      return sendError(res, "Full name, email address, and password are required.", null, 400);
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Enforce email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return sendError(res, "Please provide a valid email address.", null, 400);
    }

    // Enforce password requirements (minimum 8 characters)
    if (password.length < 8) {
      return sendError(res, "Password must be at least 8 characters long.", null, 400);
    }

    // Check if user already exists
    const existing = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [trimmedEmail]
    );

    if (existing.rows.length > 0) {
      return sendError(res, "An account with this email address already exists.", null, 409);
    }

    // Public registration: privileged roles (surgeon, clinician, radiologist, admin) cannot be self-assigned
    if (role && role.toLowerCase() !== "researcher") {
      return sendError(
        res,
        "Privileged clinical or administrative roles cannot be self-assigned during registration. All new accounts are assigned 'researcher' by default.",
        null,
        400
      );
    }
    const assignedRole = "researcher";

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const dept = department ? department.trim() : "Orthopedic Surgery & Research";

    // Insert user into PostgreSQL
    const insertRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, department, account_status, is_active)
       VALUES ($1, $2, $3, $4, $5, 'active', true)
       RETURNING id, email, full_name, role, department, avatar_url, created_at`,
      [trimmedEmail, passwordHash, fullName.trim(), assignedRole, dept]
    );

    const newUser = insertRes.rows[0];

    // Create default user settings
    await db.query(
      `INSERT INTO user_settings (user_id, preferred_theme, notification_preferences)
       VALUES ($1, 'light', '{"email": true, "system": true}')
       ON CONFLICT (user_id) DO NOTHING`,
      [newUser.id]
    );

    // Create session record
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown Client";

    await db.query(
      `INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [newUser.id, sessionToken, ip, userAgent, expiresAt]
    );

    const token = generateToken(newUser, sessionToken, false);
    const csrfToken = crypto.randomBytes(24).toString("hex");
    const isProd = process.env.NODE_ENV === "production";
    const cookieMaxAge = 24 * 60 * 60 * 1000;

    // Set session and CSRF cookies on registration so new user is immediately authenticated
    res.cookie("kneeaxis_session", sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    res.cookie("kneeaxis_csrf", csrfToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    // Record in audit log
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES (NULL, 'USER_REGISTERED', $1, $2, $3, 'Registered new user account in KneeAxis')`,
        [newUser.email, newUser.full_name, newUser.role]
      );
    } catch {}

    console.log(`[AUTH] User registered and authenticated: ${newUser.email} (Role: ${newUser.role})`);

    return sendSuccess(
      res,
      {
        token,
        sessionToken,
        csrfToken,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.full_name,
          role: newUser.role,
          department: newUser.department,
          avatarUrl: newUser.avatar_url,
        },
      },
      "Account registered successfully.",
      201
    );
  } catch (err) {
    console.error("[AUTH] Registration error:", err);
    return sendError(res, "Failed to register user.", err, 500);
  }
};

/**
 * Log in user with email, password, and remember-me preference
 */
export const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required.", null, 400);
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query user from PostgreSQL
    const result = await db.query(
      `SELECT id, email, password_hash, full_name, role, department, avatar_url, account_status, is_active
       FROM users
       WHERE LOWER(email) = $1`,
      [trimmedEmail]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Invalid email or password.", null, 401);
    }

    const user = result.rows[0];

    if (!user.is_active || user.account_status === "suspended") {
      return sendError(res, "This account is currently deactivated or suspended.", null, 403);
    }

    // Verify bcrypt password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, "Invalid email or password.", null, 401);
    }

    // Determine session duration (30 days for Remember Me, 24 hours otherwise)
    const sessionDays = rememberMe ? 30 : 1;
    const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown Client";

    // Store active session in PostgreSQL
    await db.query(
      `INSERT INTO sessions (user_id, session_token, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, sessionToken, ip, userAgent, expiresAt]
    );

    // Update last login timestamp on user
    await db.query("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1", [
      user.id,
    ]);

    const token = generateToken(user, sessionToken, Boolean(rememberMe));

    // Configure HttpOnly Session Cookie & Anti-CSRF Cookie
    const isProd = process.env.NODE_ENV === "production";
    const cookieMaxAge = (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000;
    const csrfToken = crypto.randomBytes(24).toString("hex");

    res.cookie("kneeaxis_session", sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    res.cookie("kneeaxis_csrf", csrfToken, {
      httpOnly: false, // Accessible to frontend client to attach as X-CSRF-Token header
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    // Record login in audit trail
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES (NULL, 'USER_LOGIN', $1, $2, $3, 'User authenticated successfully')`,
        [user.email, user.full_name, user.role]
      );
    } catch {}

    return sendSuccess(
      res,
      {
        token,
        sessionToken,
        csrfToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
          department: user.department,
          avatarUrl: user.avatar_url,
        },
      },
      "Authentication successful."
    );
  } catch (err) {
    return sendError(res, "Login failed due to a server error.", err, 500);
  }
};

/**
 * Log out and revoke active server-side session
 */
export const logout = async (req, res) => {
  try {
    if (req.sessionToken) {
      await db.query(
        "UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE session_token = $1",
        [req.sessionToken]
      );
    }

    if (req.user) {
      try {
        await db.query(
          `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
           VALUES (NULL, 'USER_LOGOUT', $1, $2, $3, 'User session terminated')`,
          [req.user.email, req.user.full_name, req.user.role]
        );
      } catch {}
    }

    // Clear session and CSRF cookies on client
    res.clearCookie("kneeaxis_session", { path: "/" });
    res.clearCookie("kneeaxis_csrf", { path: "/" });

    return sendSuccess(res, null, "Signed out successfully.");
  } catch (err) {
    return sendError(res, "Failed to terminate session.", err, 500);
  }
};

/**
 * Get current authenticated user profile + settings
 */
export const getMe = async (req, res) => {
  try {
    const settingsRes = await db.query(
      "SELECT preferred_theme, notification_preferences FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );

    const settings = settingsRes.rows[0] || {
      preferred_theme: "light",
      notification_preferences: { email: true, system: true },
    };

    return sendSuccess(
      res,
      {
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.full_name,
          role: req.user.role,
          department: req.user.department,
          avatarUrl: req.user.avatar_url,
          settings: {
            preferredTheme: settings.preferred_theme,
            notificationPreferences: settings.notification_preferences,
          },
        },
      },
      "User profile retrieved."
    );
  } catch (err) {
    return sendError(res, "Failed to retrieve user profile.", err, 500);
  }
};

/**
 * Initiate password reset workflow
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, "Email address is required.", null, 400);
    }

    const trimmedEmail = email.trim().toLowerCase();

    const userRes = await db.query(
      "SELECT id, email, full_name FROM users WHERE LOWER(email) = $1",
      [trimmedEmail]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];

      // Invalidate existing unused tokens for this user
      await db.query(
        "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND used_at IS NULL",
        [user.id]
      );

      // Generate secure 32-byte reset token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
      );

      // Secure token handling: never expose plaintext reset tokens in production logs.
      // If an email service is configured, dispatch here.
      if (process.env.NODE_ENV !== "production" && process.env.DEBUG_AUTH_TOKENS === "true") {
        console.log(`[DEV/TEST ONLY] Password reset token hash recorded for: ${user.email}`);
      }
    }

    // Always return generic confirmation to protect against email enumeration
    return sendSuccess(
      res,
      {
        emailDispatched: true,
      },
      "If an account with that email address exists, password reset instructions have been dispatched."
    );
  } catch (err) {
    return sendError(res, "Failed to process password reset request.", err, 500);
  }
};

/**
 * Reset password using valid, unexpired reset token
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return sendError(res, "Token and new password are required.", null, 400);
    }

    if (password.length < 8) {
      return sendError(res, "Password must be at least 8 characters long.", null, 400);
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    // Look up valid token
    const tokenRes = await db.query(
      `SELECT id, user_id, expires_at, used_at
       FROM password_reset_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (tokenRes.rows.length === 0) {
      return sendError(res, "Invalid or expired password reset link.", null, 400);
    }

    const tokenRecord = tokenRes.rows[0];

    if (tokenRecord.used_at) {
      return sendError(res, "This password reset link has already been used.", null, 400);
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return sendError(res, "This password reset link has expired. Please request a new one.", null, 400);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update user's password
    await db.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [passwordHash, tokenRecord.user_id]
    );

    // Mark token as used
    await db.query(
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1",
      [tokenRecord.id]
    );

    // Revoke all existing sessions for this user for security
    await db.query(
      "UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL",
      [tokenRecord.user_id]
    );

    // Audit log
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES (NULL, 'PASSWORD_RESET_SUCCESS', NULL, NULL, NULL, 'User password was reset successfully via secure token')`
      );
    } catch {}

    return sendSuccess(
      res,
      null,
      "Password has been reset successfully. You may now sign in with your new password."
    );
  } catch (err) {
    return sendError(res, "Failed to reset password.", err, 500);
  }
};

/**
 * List active sessions for authenticated user
 */
export const getActiveSessions = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, session_token, ip_address, user_agent, expires_at, created_at, last_used_at
       FROM sessions
       WHERE user_id = $1 AND revoked_at IS NULL
       ORDER BY last_used_at DESC`,
      [req.user.id]
    );

    const now = new Date();
    const activeRows = result.rows.filter((s) => !s.expires_at || new Date(s.expires_at) > now);

    const sessions = activeRows.map((s) => ({
      id: s.id,
      ipAddress: s.ip_address || "127.0.0.1",
      userAgent: s.user_agent || "Browser Client",
      createdAt: s.created_at,
      lastUsedAt: s.last_used_at,
      isCurrent: s.id === req.sessionId,
    }));

    return sendSuccess(res, sessions, "Active sessions retrieved.");
  } catch (err) {
    console.error("[getActiveSessions Error]:", err.message, err);
    return sendError(res, "Failed to retrieve active sessions.", err, 500);
  }
};

/**
 * Revoke a specific session
 */
export const revokeSession = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Session not found or already revoked.", null, 404);
    }

    return sendSuccess(res, { revokedId: id }, "Session revoked successfully.");
  } catch (err) {
    return sendError(res, "Failed to revoke session.", err, 500);
  }
};

/**
 * List all clinical staff members (clinical directory)
 */
export const getTeam = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, full_name, role, department, avatar_url, created_at
       FROM users
       WHERE is_active = TRUE
       ORDER BY full_name ASC`
    );

    return sendSuccess(
      res,
      result.rows.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.full_name,
        role: u.role,
        department: u.department,
        avatarUrl: u.avatar_url,
        joinedAt: u.created_at,
      })),
      "Clinical team list retrieved."
    );
  } catch (err) {
    return sendError(res, "Failed to retrieve clinical team.", err, 500);
  }
};
