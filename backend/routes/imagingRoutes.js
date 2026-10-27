import express from "express";
import { uploadImagingStudy, getPatientImagingStudies } from "../controllers/imagingController.js";
import { upload } from "../middleware/upload.js";
import { requireFile, receiveFile } from "../middleware/validateFile.js";
import { requireAuth } from "../middleware/auth.js";
import { requirePatientAccess } from "../middleware/patientAuth.js";

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(requirePatientAccess);
router.post("/", receiveFile(upload, "image"), requireFile, uploadImagingStudy);
router.get("/", getPatientImagingStudies);

export default router;
