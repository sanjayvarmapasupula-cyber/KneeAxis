import express from "express";
import { approvePatientMeshes, getPatientAuditHistory } from "../controllers/auditController.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePatientAccess } from "../middleware/patientAuth.js";

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.post("/:patientId/approve", requirePatientAccess, approvePatientMeshes);
router.get("/:patientId/audit", requirePatientAccess, getPatientAuditHistory);

export default router;
