import express from "express";
import { login, register, getMe, getTeam } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", requireAuth, getMe);
router.get("/team", requireAuth, getTeam);

export default router;
