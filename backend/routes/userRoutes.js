import express from "express";
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
} from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.patch("/me/password", changeMyPassword);

export default router;
