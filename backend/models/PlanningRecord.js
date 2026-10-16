import mongoose from "mongoose";

const planningRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
    },
    meshId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mesh",
    },
    planningType: {
      type: String,
      enum: ["iKA", "KinematicAlignment", "MechanicalAlignment", "Custom"],
      default: "iKA",
    },
    parameters: {
      distalFemoralResectionMm: { type: Number, default: 0 },
      posteriorFemoralResectionMm: { type: Number, default: 0 },
      proximalTibialResectionMm: { type: Number, default: 0 },
      femoralVarusValgusDeg: { type: Number, default: 0 },
      tibialVarusValgusDeg: { type: Number, default: 0 },
      femoralFlexionDeg: { type: Number, default: 0 },
      tibialSlopeDeg: { type: Number, default: 0 },
      implantSizes: {
        femur: { type: String, default: "" },
        tibia: { type: String, default: "" },
        insertMm: { type: Number, default: 9 },
      },
      customLandmarks: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    status: {
      type: String,
      enum: ["draft", "finalized"],
      default: "draft",
    },
    clinicianNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const PlanningRecord = mongoose.model("PlanningRecord", planningRecordSchema);
