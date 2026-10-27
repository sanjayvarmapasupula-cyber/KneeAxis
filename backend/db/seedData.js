import bcrypt from "bcryptjs";

export const getSeedUsers = async () => {
  const salt = await bcrypt.genSalt(10);
  const surgeonHash = await bcrypt.hash("Surgeon#2026!", salt);
  const researcherHash = await bcrypt.hash("Researcher#2026!", salt);

  return [
    {
      email: "lead.surgeon@kneeaxis.hospital",
      password_hash: surgeonHash,
      full_name: "Lead Orthopedic Surgeon",
      role: "surgeon",
      department: "Robotic Joint Replacement",
      avatar_url: "/avatars/lead-surgeon.png",
    },
    {
      email: "researcher@kneeaxis.ai",
      password_hash: researcherHash,
      full_name: "Clinical AI Researcher",
      role: "researcher",
      department: "Orthopedic AI Laboratory",
      avatar_url: null,
    },
  ];
};

/**
 * Baseline Model Registry definitions.
 * All deep learning models are registered with status: "Not Trained" and null accuracy metrics.
 */
export const seedModels = [
  {
    model_id: "resnet50-kl-classifier",
    name: "ResNet-50 KL Osteoarthritis Classifier",
    category: "classification",
    architecture: "ResNet-50 (Transfer Learning)",
    version: "v1.0.0-untrained",
    status: "Not Trained",
    weights_path: "../models/kl_classifier/best.weights.h5",
    config_path: "../models/kl_classifier/model_config.json",
    framework: "TensorFlow / Keras 3.x",
    input_shape: "224x224x3 (Float32 [0,1])",
    accuracy_metric: "AUC-ROC",
    accuracy_value: null,
    inference_latency_ms: null,
    parameters_count: "23.5M",
    description: "Deep convolutional network for multi-class Kellgren-Lawrence (KL 0-4) radiographic grading of knee osteoarthritis from standard bilateral standing AP radiographs.",
  },
  {
    model_id: "attention-unet-3d-segmentation",
    name: "Attention 3D U-Net Knee Segmenter",
    category: "segmentation",
    architecture: "3D Attention U-Net with Residual Connections",
    version: "v1.0.0-untrained",
    status: "Not Trained",
    weights_path: "../models/knee_segmentation/best.weights.h5",
    config_path: "../models/knee_segmentation/model_config.json",
    framework: "TensorFlow / Keras 3.x (SimpleITK Pipeline)",
    input_shape: "160x160x64 (NIfTI 1mm isotropic)",
    accuracy_metric: "Dice Coefficient",
    accuracy_value: null,
    inference_latency_ms: null,
    parameters_count: "31.2M",
    description: "Volumetric deep learning segmentation network designed for high-resolution 3D CT/MRI scans to delineate femoral bone, tibial bone, and articular cartilage surfaces.",
  },
  {
    model_id: "algorithmic-marching-cubes-reconstructor",
    name: "Marching Cubes + Taubin Surface Generator",
    category: "reconstruction",
    architecture: "Marching Cubes + Taubin Smoothing + Mesh QA",
    version: "v1.2.0-deterministic",
    status: "Ready",
    weights_path: null,
    config_path: "../reconstruction3d/labels.json",
    framework: "Python / scikit-image / Trimesh / SimpleITK",
    input_shape: "3D Labelmap (NIfTI / NRRD)",
    accuracy_metric: "Surface QA / Watertight Ratio",
    accuracy_value: 0.998,
    inference_latency_ms: 1250,
    parameters_count: "Algorithmic",
    description: "Deterministic geometric surface extraction pipeline with non-shrinking Taubin mesh fairing, topology validation, and watertight manifold QA checks.",
  },
  {
    model_id: "ika-kinematic-alignment-planner",
    name: "inverse Kinematic Alignment (iKA) Surgical Planner",
    category: "planning",
    architecture: "Kinematic Resection Optimization Algorithm",
    version: "v1.0.0-deterministic",
    status: "Ready",
    weights_path: null,
    config_path: null,
    framework: "Python / NumPy / ROSA Interface",
    input_shape: "3D Anatomical Landmarks & Joint Meshes",
    accuracy_metric: "Alignment Target Accuracy (HKA deviation)",
    accuracy_value: 0.995,
    inference_latency_ms: 350,
    parameters_count: "Algorithmic",
    description: "Pre-operative planning engine that restores constitutional joint lines and personal kinematics without non-anatomical ligament release.",
  },
];

/**
 * Isolated test fixture patients (FOR UNIT/INTEGRATION TESTS ONLY).
 * NEVER seeded into normal application operation.
 */
export const testFixturePatients = [
  {
    patient_id: "TEST-MRN-001",
    name: "Test Patient Alpha",
    date_of_birth: "1960-05-15",
    gender: "Female",
    affected_knee: "Right",
    clinical_notes: "Test patient for automated testing harness.",
  },
];
