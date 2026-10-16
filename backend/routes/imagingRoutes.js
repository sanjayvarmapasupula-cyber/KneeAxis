import express from "express";
import { uploadImagingStudy, getPatientImagingStudies } from "../controllers/imagingController.js";
import { upload } from "../middleware/upload.js";
import { requireFile } from "../middleware/validateFile.js";

const router = express.Router({ mergeParams: true });

router.post("/", upload.single("image"), requireFile, uploadImagingStudy);
router.get("/", getPatientImagingStudies);

export default router;
