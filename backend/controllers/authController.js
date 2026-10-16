import bcrypt from "bcryptjs";
import db from "../db/index.js";
import { generateToken } from "../middleware/auth.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * Log in clinical user with email and password against PostgreSQL
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required.", null, 400);
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query user from PostgreSQL
    const result = await db.query(
      "SELECT id, email, password_hash, full_name, role, department, avatar_url, is_active FROM users WHERE LOWER(email) = $1",
      [trimmedEmail]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Invalid email or password.", null, 401);
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return sendError(res, "This clinical account has been suspended.", null, 403);
    }

    // Verify bcrypt password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, "Invalid email or password.", null, 401);
    }

    const token = generateToken(user);

    // Record login in audit trail
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES (NULL, 'CLINICAL_USER_LOGIN', $1, $2, $3, 'Clinician signed into Clinical Atlas system')`,
        [user.email, user.full_name, user.role]
      );
    } catch (auditErr) {
      // Non-blocking
    }

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatar_url,
      },
    }, "Authentication successful.");
  } catch (err) {
    return sendError(res, "Login failed due to a server error.", err, 500);
  }
};

/**
 * Register new clinical staff member in PostgreSQL
 */
export const register = async (req, res) => {
  try {
    const { email, password, fullName, role, department } = req.body;

    if (!email || !password || !fullName) {
      return sendError(res, "Full name, email, and password are required.", null, 400);
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await db.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [trimmedEmail]
    );

    if (existing.rows.length > 0) {
      return sendError(res, "An account with this email address already exists.", null, 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const clinicalRole = role || "surgeon";
    const dept = department || "Orthopedic Surgery";

    const insertRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, department)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, department, avatar_url, created_at`,
      [trimmedEmail, passwordHash, fullName.trim(), clinicalRole, dept]
    );

    const newUser = insertRes.rows[0];
    const token = generateToken(newUser);

    // Record in audit log
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES (NULL, 'CLINICAL_USER_REGISTER', $1, $2, $3, 'New clinical account created')`,
        [newUser.email, newUser.full_name, newUser.role]
      );
    } catch {}

    return sendSuccess(res, {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.full_name,
        role: newUser.role,
        department: newUser.department,
        avatarUrl: newUser.avatar_url,
      },
    }, "Clinical account created successfully.", 201);
  } catch (err) {
    return sendError(res, "Failed to register clinical staff.", err, 500);
  }
};

/**
 * Get current authenticated user profile
 */
export const getMe = async (req, res) => {
  try {
    return sendSuccess(res, {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.full_name,
        role: req.user.role,
        department: req.user.department,
        avatarUrl: req.user.avatar_url,
      },
    }, "Current user profile retrieved.");
  } catch (err) {
    return sendError(res, "Failed to retrieve user profile.", err, 500);
  }
};

/**
 * List all clinical staff members
 */
export const getTeam = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, email, full_name, role, department, avatar_url, created_at FROM users WHERE is_active = TRUE ORDER BY full_name ASC"
    );

    return sendSuccess(res, result.rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.full_name,
      role: u.role,
      department: u.department,
      avatarUrl: u.avatar_url,
      joinedAt: u.created_at,
    })), "Clinical team list retrieved.");
  } catch (err) {
    return sendError(res, "Failed to retrieve clinical team.", err, 500);
  }
};
