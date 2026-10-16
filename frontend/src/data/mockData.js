// --- Imaging Studies ---

export const mockImagingStudies = {
  'PT-001': {
    id: 'CT-2026-001',
    patientId: 'PT-001',
    studyDate: '2026-09-10',
    modality: 'CT',
    description: 'CT Knee Right - Thin Slice Protocol',
    sliceCount: 320,
    sliceThickness: 0.625,
    pixelSpacing: [0.488, 0.488],
    imageSize: [512, 512],
    status: 'Completed',
  },
  'PT-002': {
    id: 'CT-2026-002',
    patientId: 'PT-002',
    studyDate: '2026-09-12',
    modality: 'CT',
    description: 'CT Knee Left - Revision Protocol',
    sliceCount: 280,
    sliceThickness: 0.625,
    pixelSpacing: [0.488, 0.488],
    imageSize: [512, 512],
    status: 'Completed',
  },
  'PT-003': {
    id: 'CT-2026-003',
    patientId: 'PT-003',
    studyDate: '2026-09-14',
    modality: 'CT',
    description: 'CT Knee Right - Extended FOV',
    sliceCount: 350,
    sliceThickness: 0.5,
    pixelSpacing: [0.4, 0.4],
    imageSize: [512, 512],
    status: 'Completed',
  },
};

// --- Segmentation Results ---

export const mockSegmentationResults = {
  'PT-001': {
    id: 'SEG-001',
    patientId: 'PT-001',
    studyId: 'CT-2026-001',
    modelName: 'Attention U-Net (31.38M Params)',
    modelVersion: 'v2.4-Production',
    status: 'Completed',
    startedAt: '2026-09-10T14:30:00Z',
    completedAt: '2026-09-10T14:33:36Z',
    processingTime: 216,
    bones: [
      { boneType: 'Femur', status: 'Completed', dice: 0.9937, assd: 0.210, hd95: 0.520, confidence: 0.99, volume: 412.3, color: '#E8B960' },
      { boneType: 'Tibia', status: 'Completed', dice: 0.9938, assd: 0.205, hd95: 0.510, confidence: 0.99, volume: 298.7, color: '#60A8E8' },
      { boneType: 'Patella', status: 'Completed', dice: 0.9958, assd: 0.180, hd95: 0.440, confidence: 0.99, volume: 28.4, color: '#78D89E' },
      { boneType: 'Fibula', status: 'Completed', dice: 0.9890, assd: 0.290, hd95: 0.680, confidence: 0.98, volume: 45.2, color: '#D87878' },
    ],
  },
  'PT-002': {
    id: 'SEG-002',
    patientId: 'PT-002',
    studyId: 'CT-2026-002',
    modelName: '3D U-Net',
    modelVersion: 'v2.1.0',
    status: 'Completed',
    startedAt: '2026-09-12T10:15:00Z',
    completedAt: '2026-09-12T10:28:00Z',
    processingTime: 780,
    bones: [
      { boneType: 'Femur', status: 'Completed', dice: 0.979, assd: 0.342, hd95: 0.891, confidence: 0.96, volume: 378.5, color: '#E8B960' },
      { boneType: 'Tibia', status: 'Completed', dice: 0.972, assd: 0.398, hd95: 0.945, confidence: 0.95, volume: 275.2, color: '#60A8E8' },
      { boneType: 'Patella', status: 'Completed', dice: 0.958, assd: 0.445, hd95: 1.067, confidence: 0.93, volume: 25.8, color: '#78D89E' },
      { boneType: 'Fibula', status: 'Completed', dice: 0.945, assd: 0.512, hd95: 1.198, confidence: 0.91, volume: 42.1, color: '#D87878' },
    ],
  },
  'PT-006': {
    id: 'SEG-006',
    patientId: 'PT-006',
    studyId: 'CT-2026-006',
    modelName: '3D U-Net',
    modelVersion: 'v2.1.0',
    status: 'Completed',
    startedAt: '2026-09-17T09:00:00Z',
    completedAt: '2026-09-17T09:11:00Z',
    processingTime: 660,
    bones: [
      { boneType: 'Femur', status: 'Completed', dice: 0.981, assd: 0.328, hd95: 0.867, confidence: 0.96, volume: 395.1, color: '#E8B960' },
      { boneType: 'Tibia', status: 'Completed', dice: 0.975, assd: 0.371, hd95: 0.934, confidence: 0.95, volume: 288.4, color: '#60A8E8' },
      { boneType: 'Patella', status: 'Completed', dice: 0.960, assd: 0.435, hd95: 1.045, confidence: 0.94, volume: 27.1, color: '#78D89E' },
      { boneType: 'Fibula', status: 'Completed', dice: 0.948, assd: 0.505, hd95: 1.178, confidence: 0.92, volume: 43.6, color: '#D87878' },
    ],
  },
  'PT-008': {
    id: 'SEG-008',
    patientId: 'PT-008',
    studyId: 'CT-2026-008',
    modelName: '3D U-Net',
    modelVersion: 'v2.1.0',
    status: 'Completed',
    startedAt: '2026-09-19T15:20:00Z',
    completedAt: '2026-09-19T15:33:00Z',
    processingTime: 780,
    bones: [
      { boneType: 'Femur', status: 'Completed', dice: 0.976, assd: 0.356, hd95: 0.905, confidence: 0.95, volume: 389.8, color: '#E8B960' },
      { boneType: 'Tibia', status: 'Completed', dice: 0.968, assd: 0.412, hd95: 0.968, confidence: 0.94, volume: 271.5, color: '#60A8E8' },
      { boneType: 'Patella', status: 'Completed', dice: 0.955, assd: 0.458, hd95: 1.089, confidence: 0.93, volume: 26.3, color: '#78D89E' },
      { boneType: 'Fibula', status: 'Completed', dice: 0.942, assd: 0.525, hd95: 1.212, confidence: 0.91, volume: 41.8, color: '#D87878' },
    ],
  },
};

// --- Reconstructions ---

export const mockReconstructions = {
  'PT-001': {
    id: 'REC-001',
    patientId: 'PT-001',
    segmentationId: 'SEG-001',
    status: 'Completed',
    method: 'Marching Cubes',
    meshQuality: 'High',
    totalVertices: 245_832,
    totalFaces: 491_512,
    completedAt: '2026-09-10T15:05:00Z',
    bones: [
      { boneType: 'Femur', vertices: 124_512, faces: 248_890, volume: 412.3, surfaceArea: 285.6, color: '#E8B960' },
      { boneType: 'Tibia', vertices: 89_420, faces: 178_712, volume: 298.7, surfaceArea: 218.4, color: '#60A8E8' },
      { boneType: 'Patella', vertices: 31_900, faces: 63_910, volume: 28.4, surfaceArea: 42.8, color: '#78D89E' },
    ],
  },
  'PT-002': {
    id: 'REC-002',
    patientId: 'PT-002',
    segmentationId: 'SEG-002',
    status: 'Completed',
    method: 'Marching Cubes',
    meshQuality: 'High',
    totalVertices: 232_140,
    totalFaces: 464_120,
    completedAt: '2026-09-12T10:52:00Z',
    bones: [
      { boneType: 'Femur', vertices: 118_320, faces: 236_510, volume: 378.5, surfaceArea: 271.2, color: '#E8B960' },
      { boneType: 'Tibia', vertices: 84_600, faces: 169_080, volume: 275.2, surfaceArea: 205.8, color: '#60A8E8' },
      { boneType: 'Patella', vertices: 29_220, faces: 58_530, volume: 25.8, surfaceArea: 39.5, color: '#78D89E' },
    ],
  },
  'PT-006': {
    id: 'REC-006',
    patientId: 'PT-006',
    segmentationId: 'SEG-006',
    status: 'Completed',
    method: 'Marching Cubes',
    meshQuality: 'High',
    totalVertices: 238_450,
    totalFaces: 476_770,
    completedAt: '2026-09-17T09:35:00Z',
    bones: [
      { boneType: 'Femur', vertices: 121_200, faces: 242_280, volume: 395.1, surfaceArea: 278.3, color: '#E8B960' },
      { boneType: 'Tibia', vertices: 86_850, faces: 173_590, volume: 288.4, surfaceArea: 212.1, color: '#60A8E8' },
      { boneType: 'Patella', vertices: 30_400, faces: 60_900, volume: 27.1, surfaceArea: 41.2, color: '#78D89E' },
    ],
  },
  'PT-008': {
    id: 'REC-008',
    patientId: 'PT-008',
    segmentationId: 'SEG-008',
    status: 'Completed',
    method: 'Marching Cubes',
    meshQuality: 'High',
    totalVertices: 229_870,
    totalFaces: 459_610,
    completedAt: '2026-09-19T15:58:00Z',
    bones: [
      { boneType: 'Femur', vertices: 116_900, faces: 233_670, volume: 389.8, surfaceArea: 268.9, color: '#E8B960' },
      { boneType: 'Tibia', vertices: 83_750, faces: 167_390, volume: 271.5, surfaceArea: 202.4, color: '#60A8E8' },
      { boneType: 'Patella', vertices: 29_220, faces: 58_550, volume: 26.3, surfaceArea: 40.1, color: '#78D89E' },
    ],
  },
};

// --- Anatomical Measurements ---

export const mockMeasurements = {
  'PT-001': {
    id: 'MEAS-001',
    patientId: 'PT-001',
    mechanicalAxisAngle: 2.3,
    anatomicalAxisAngle: 5.8,
    femoralDimensionAP: 64.2,
    femoralDimensionML: 78.5,
    tibialDimensionAP: 48.3,
    tibialDimensionML: 74.1,
    tibialSlope: 7.2,
    jointLineOrientation: 2.1,
    transEpicondylarAxisLength: 82.4,
    femoralOffset: 38.5,
    hipKneeAnkleAngle: 178.2,
  },
  'PT-002': {
    id: 'MEAS-002',
    patientId: 'PT-002',
    mechanicalAxisAngle: 3.1,
    anatomicalAxisAngle: 6.2,
    femoralDimensionAP: 58.7,
    femoralDimensionML: 72.3,
    tibialDimensionAP: 44.1,
    tibialDimensionML: 68.9,
    tibialSlope: 8.1,
    jointLineOrientation: 1.8,
    transEpicondylarAxisLength: 76.2,
    femoralOffset: 35.2,
    hipKneeAnkleAngle: 176.9,
  },
};

// --- Surgical Plans ---

export const mockSurgicalPlans = {
  'PT-001': {
    id: 'PLAN-001',
    patientId: 'PT-001',
    status: 'Approved',
    createdAt: '2026-09-12T09:00:00Z',
    updatedAt: '2026-09-18T14:30:00Z',
    resection: {
      distalFemoralResection: 9.0,
      posteriorFemoralResection: 8.5,
      tibialResection: 10.0,
      tibialSlopeTarget: 3.0,
    },
    alignment: {
      mechanicalAxisTarget: 0.0,
      femoralValgus: 5.5,
      tibialVarus: 0.0,
      femoralRotation: 3.0,
    },
    gapBalance: {
      medialGapExtension: 18.5,
      lateralGapExtension: 19.0,
      medialGapFlexion: 19.0,
      lateralGapFlexion: 19.5,
    },
    implantSize: 'Size 4',
    reviewedBy: 'Dr. Sarah Mitchell',
    approvedBy: 'Dr. Sarah Mitchell',
  },
  'PT-002': {
    id: 'PLAN-002',
    patientId: 'PT-002',
    status: 'Draft',
    createdAt: '2026-09-14T11:00:00Z',
    updatedAt: '2026-09-19T10:00:00Z',
    resection: {
      distalFemoralResection: 8.5,
      posteriorFemoralResection: 8.0,
      tibialResection: 9.5,
      tibialSlopeTarget: 3.0,
    },
    alignment: {
      mechanicalAxisTarget: 0.0,
      femoralValgus: 5.0,
      tibialVarus: 0.0,
      femoralRotation: 3.0,
    },
    gapBalance: {
      medialGapExtension: 17.5,
      lateralGapExtension: 18.0,
      medialGapFlexion: 18.0,
      lateralGapFlexion: 18.5,
    },
    implantSize: 'Size 3',
  },
};

// --- Dashboard Stats ---

export const mockDashboardStats = {
  totalPatients: 8,
  pendingSegmentation: 2,
  completedReconstructions: 4,
  pendingReviews: 3,
};

// --- Activity ---

export const mockActivities = [
  { id: 'ACT-001', type: 'review', description: 'Plan approved for surgical review', timestamp: '2026-09-22T10:30:00Z', patientId: 'PT-001', patientName: 'James Harrison' },
  { id: 'ACT-002', type: 'reconstruction', description: '3D reconstruction completed', timestamp: '2026-09-22T09:15:00Z', patientId: 'PT-008', patientName: 'Catherine Liu' },
  { id: 'ACT-003', type: 'segmentation', description: 'AI segmentation in progress', timestamp: '2026-09-22T08:45:00Z', patientId: 'PT-004', patientName: 'Susan Park' },
  { id: 'ACT-004', type: 'imaging', description: 'CT scan uploaded and processing', timestamp: '2026-09-22T08:00:00Z', patientId: 'PT-007', patientName: 'Michael Foster' },
  { id: 'ACT-005', type: 'planning', description: 'Surgical plan created — draft', timestamp: '2026-09-21T16:20:00Z', patientId: 'PT-002', patientName: 'Margaret Chen' },
  { id: 'ACT-006', type: 'review', description: 'Segmentation requires review', timestamp: '2026-09-21T14:00:00Z', patientId: 'PT-008', patientName: 'Catherine Liu' },
  { id: 'ACT-007', type: 'reconstruction', description: '3D reconstruction completed', timestamp: '2026-09-21T11:30:00Z', patientId: 'PT-006', patientName: 'Elena Rodriguez' },
  { id: 'ACT-008', type: 'segmentation', description: 'AI segmentation completed — all bones', timestamp: '2026-09-20T15:45:00Z', patientId: 'PT-003', patientName: 'Robert Williams' },
];

// --- System Status ---

export const mockSystemStatus = {
  frontend: 'Online',
  backend: 'Online',
  aiService: 'Online',
  lastChecked: '2026-09-22T11:55:00Z',
};

// --- Chart Data ---

export const segmentationPerformanceData = [
  { bone: 'Femur', dice: 0.984, assd: 0.312, hd95: 0.845 },
  { bone: 'Tibia', dice: 0.978, assd: 0.385, hd95: 0.912 },
  { bone: 'Patella', dice: 0.962, assd: 0.421, hd95: 1.023 },
  { bone: 'Fibula', dice: 0.951, assd: 0.498, hd95: 1.156 },
];

export const processingTimeData = [
  { step: 'CT Preprocessing', time: 45 },
  { step: 'Segmentation', time: 720 },
  { step: 'Post-processing', time: 120 },
  { step: 'Mesh Generation', time: 180 },
  { step: 'Quality Check', time: 60 },
];

export const casesOverTimeData = [
  { month: 'Apr', completed: 12, pending: 3 },
  { month: 'May', completed: 15, pending: 4 },
  { month: 'Jun', completed: 18, pending: 2 },
  { month: 'Jul', completed: 22, pending: 5 },
  { month: 'Aug', completed: 25, pending: 3 },
  { month: 'Sep', completed: 28, pending: 6 },
];
