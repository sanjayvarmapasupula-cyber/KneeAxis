import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    imagingStudyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ImagingStudy",
    },
    type: {
      type: String,
      default: "KL_GRADE",
    },
    grade: {
      type: Number,
      required: true,
      min: 0,
      max: 4,
    },
    label: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
    },
    probabilities: {
      KL0: { type: Number, default: 0 },
      KL1: { type: Number, default: 0 },
      KL2: { type: Number, default: 0 },
      KL3: { type: Number, default: 0 },
      KL4: { type: Number, default: 0 },
    },
    modelWeightsPath: {
      type: String,
      default: "",
    },
    inferenceDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export const Prediction = mongoose.model("Prediction", predictionSchema);
