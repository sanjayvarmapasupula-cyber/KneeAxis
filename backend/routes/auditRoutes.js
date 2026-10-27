import express from "express";
import { approvePatientMeshes, getPatientAuditHistory } from "../controllers/auditController.js";

const router = express.Router({ mergeParams: true });

router.post("/:patientId/approve", approvePatientMeshes);
router.get("/:patientId/audit", getPatientAuditHistory);

export default router;
