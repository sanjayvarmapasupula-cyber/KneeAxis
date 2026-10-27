import express from "express";
import {
  login,
  register,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  getActiveSessions,
  revokeSession,
  getTeam,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { loginLimiter, passwordResetLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, getMe);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);
router.get("/sessions", requireAuth, getActiveSessions);
router.delete("/sessions/:id", requireAuth, revokeSession);
router.get("/team", requireAuth, getTeam);

export default router;
