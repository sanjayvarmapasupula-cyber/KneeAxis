import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, "Patient ID is required (e.g. P001)"],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Patient name is required"],
      trim: true,
    },
    age: {
      type: Number,
      min: 0,
      max: 130,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", "Unknown"],
      default: "Unknown",
    },
    affectedKnee: {
      type: String,
      enum: ["Left", "Right", "Bilateral", "Unspecified"],
      default: "Unspecified",
    },
    clinicalNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Patient = mongoose.model("Patient", patientSchema);
