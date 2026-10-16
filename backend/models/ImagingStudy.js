import mongoose from "mongoose";

const imagingStudySchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
      ref: "Patient",
    },
    studyType: {
      type: String,
      enum: ["X-ray", "MRI", "CT", "Segmentation", "Other"],
      default: "Other",
    },
    originalFilename: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    sha256: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const ImagingStudy = mongoose.model("ImagingStudy", imagingStudySchema);
