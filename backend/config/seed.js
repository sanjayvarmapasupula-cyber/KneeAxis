import { Patient } from "../models/Patient.js";

const initialPatients = [
  {
    patientId: "MRN-ROSA-0568",
    name: "Eleanor Vance",
    age: 64,
    gender: "Female",
    affectedKnee: "Right",
    clinicalNotes: "Candidate for Robotic TKA. Severe medial compartment joint space narrowing with subchondral sclerosis.",
  },
  {
    patientId: "MRN-ROSA-0192",
    name: "Marcus Brody",
    age: 71,
    gender: "Male",
    affectedKnee: "Left",
    clinicalNotes: "Severe tricompartmental osteoarthritis (KL Grade 4). Varus malalignment requiring iKA robotic resection.",
  },
  {
    patientId: "MRN-ROSA-0441",
    name: "Clara Oswald",
    age: 52,
    gender: "Female",
    affectedKnee: "Right",
    clinicalNotes: "Mild joint space narrowing (KL Grade 1). Conservative management and routine follow-up.",
  },
  {
    patientId: "PT-001",
    name: "James Harrison",
    age: 62,
    gender: "Male",
    affectedKnee: "Right",
    clinicalNotes: "Primary TKA candidate. Moderate medial osteoarthritis.",
  },
  {
    patientId: "PT-002",
    name: "Margaret Chen",
    age: 58,
    gender: "Female",
    affectedKnee: "Left",
    clinicalNotes: "Revision TKA evaluation. Previous implant loosening assessment.",
  },
  {
    patientId: "PT-003",
    name: "Robert Williams",
    age: 71,
    gender: "Male",
    affectedKnee: "Right",
    clinicalNotes: "Severe valgus deformity. Complex robotic knee arthroplasty planning.",
  },
];

export async function seedInitialData() {
  try {
    const count = await Patient.countDocuments();
    if (count === 0) {
      console.log("[Seed] Seeding initial clinical patient records...");
      await Patient.insertMany(initialPatients);
      console.log(`[Seed] Seeded ${initialPatients.length} patient records successfully.`);
    }
  } catch (err) {
    console.warn(`[Seed] Skipping automatic database seed: ${err.message}`);
  }
}
