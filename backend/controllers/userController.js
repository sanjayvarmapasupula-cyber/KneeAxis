import bcrypt from "bcryptjs";
import db from "../db/index.js";
import { sendSuccess, sendError } from "../utils/response.js";

/**
 * Get profile and settings of currently authenticated user
 */
export const getMyProfile = async (req, res) => {
  try {
    const userRes = await db.query(
      `SELECT id, email, full_name, role, department, avatar_url, account_status, is_active, created_at, last_login_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return sendError(res, "User not found.", null, 404);
    }

    const settingsRes = await db.query(
      "SELECT preferred_theme, notification_preferences FROM user_settings WHERE user_id = $1",
      [req.user.id]
    );

    const user = userRes.rows[0];
    const settings = settingsRes.rows[0] || {
      preferred_theme: "light",
      notification_preferences: { email: true, system: true },
    };

    return sendSuccess(
      res,
      {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        settings: {
          preferredTheme: settings.preferred_theme,
          notificationPreferences: settings.notification_preferences,
        },
      },
      "Profile retrieved successfully."
    );
  } catch (err) {
    return sendError(res, "Failed to retrieve user profile.", err, 500);
  }
};

/**
 * Update authenticated user's profile and settings
 */
export const updateMyProfile = async (req, res) => {
  try {
    const { fullName, department, avatarUrl, preferredTheme, notificationPreferences } = req.body;

    const updates = [];
    const values = [];

    if (fullName && fullName.trim()) {
      values.push(fullName.trim());
      updates.push(`full_name = $${values.length}`);
    }

    if (department !== undefined) {
      values.push(department.trim());
      updates.push(`department = $${values.length}`);
    }

    if (avatarUrl !== undefined) {
      values.push(avatarUrl);
      updates.push(`avatar_url = $${values.length}`);
    }

    let updatedUser = req.user;

    if (updates.length > 0) {
      values.push(req.user.id);
      const queryText = `
        UPDATE users
        SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${values.length}
        RETURNING id, email, full_name, role, department, avatar_url
      `;
      const result = await db.query(queryText, values);
      updatedUser = result.rows[0];
    }

    // Update settings if provided
    if (preferredTheme || notificationPreferences) {
      await db.query(
        `INSERT INTO user_settings (user_id, preferred_theme, notification_preferences, updated_at)
         VALUES ($1, COALESCE($2, 'light'), COALESCE($3, '{"email": true, "system": true}'::jsonb), CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           preferred_theme = COALESCE(EXCLUDED.preferred_theme, user_settings.preferred_theme),
           notification_preferences = COALESCE(EXCLUDED.notification_preferences, user_settings.notification_preferences),
           updated_at = CURRENT_TIMESTAMP`,
        [
          req.user.id,
          preferredTheme || null,
          notificationPreferences ? JSON.stringify(notificationPreferences) : null,
        ]
      );
    }

    return sendSuccess(
      res,
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.full_name,
        role: updatedUser.role,
        department: updatedUser.department,
        avatarUrl: updatedUser.avatar_url,
      },
      "Profile updated successfully."
    );
  } catch (err) {
    return sendError(res, "Failed to update profile.", err, 500);
  }
};

/**
 * Change authenticated user's password
 */
export const changeMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, "Current password and new password are required.", null, 400);
    }

    if (newPassword.length < 8) {
      return sendError(res, "New password must be at least 8 characters long.", null, 400);
    }

    // Verify current password against database
    const userRes = await db.query("SELECT password_hash FROM users WHERE id = $1", [
      req.user.id,
    ]);

    if (userRes.rows.length === 0) {
      return sendError(res, "User not found.", null, 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return sendError(res, "Current password is incorrect.", null, 401);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newHash, req.user.id]
    );

    // Audit log
    try {
      await db.query(
        `INSERT INTO audit_records (patient_id, action, user_email, user_name, role, notes)
         VALUES (NULL, 'PASSWORD_CHANGE', $1, $2, $3, 'User updated their account password')`,
        [req.user.email, req.user.full_name, req.user.role]
      );
    } catch {}

    return sendSuccess(res, null, "Password changed successfully.");
  } catch (err) {
    return sendError(res, "Failed to change password.", err, 500);
  }
};
