import mongoose from "mongoose";

const auditRecordSchema = new mongoose.Schema(
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
    imageHash: {
      type: String,
      default: "",
    },
    segmentationHash: {
      type: String,
      default: "",
    },
    meshHash: {
      type: String,
      default: "",
    },
    approved: {
      type: Boolean,
      default: false,
      index: true,
    },
    reviewer: {
      type: String,
      required: true,
    },
    reviewNotes: {
      type: String,
      default: "",
    },
    approvalTimestamp: {
      type: Date,
      default: Date.now,
    },
    disclaimer: {
      type: String,
      default: "Research/Prototype Audit Mechanism - Not a certified legal medical device electronic signature.",
    },
  },
  {
    timestamps: true,
  }
);

export const AuditRecord = mongoose.model("AuditRecord", auditRecordSchema);
