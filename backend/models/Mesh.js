import mongoose from "mongoose";

const structureMeshSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    label: { type: Number, required: true },
    stlPath: { type: String, default: null },
    objPath: { type: String, default: null },
    stlRawPath: { type: String, default: null },
    objRawPath: { type: String, default: null },
    volumeMm3: { type: Number, default: 0 },
    surfaceAreaMm2: { type: Number, default: 0 },
    watertight: { type: Boolean, default: false },
  },
  { _id: false }
);

const meshSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    segmentationJobId: {
      type: String,
      default: null,
    },
    segmentationPath: {
      type: String,
      required: true,
    },
    structures: [structureMeshSchema],
    manifestPath: {
      type: String,
      required: true,
    },
    qaReportPath: {
      type: String,
      required: true,
    },
    qaSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Mesh = mongoose.model("Mesh", meshSchema);
