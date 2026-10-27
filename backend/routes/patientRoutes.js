import express from "express";
import {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} from "../controllers/patientController.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePatientAccess } from "../middleware/patientAuth.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", createPatient);
router.get("/", getAllPatients);
router.get("/:id", requirePatientAccess, getPatientById);
router.put("/:id", requirePatientAccess, updatePatient);
router.delete("/:id", requirePatientAccess, deletePatient);

export default router;
