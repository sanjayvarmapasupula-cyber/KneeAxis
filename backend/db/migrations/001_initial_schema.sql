-- ============================================================================
-- Clinical Atlas: Patient-Specific 3D Knee Reconstruction & Arthroplasty Planning
-- PostgreSQL Relational Database Schema
-- Compatible with PostgreSQL 14+ and in-process pg-mem engine
-- ============================================================================

-- 1. Users & Clinical Staff
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'researcher',
    department VARCHAR(100) DEFAULT 'Orthopedic Surgery & Research',
    avatar_url TEXT,
    account_status VARCHAR(50) DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1b. User Authentication Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1c. Password Reset Tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1d. User Settings
CREATE TABLE IF NOT EXISTS user_settings (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    preferred_theme VARCHAR(50) DEFAULT 'light',
    notification_preferences JSONB DEFAULT '{"email": true, "system": true}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients Master Table
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20) NOT NULL,
    affected_knee VARCHAR(20) NOT NULL DEFAULT 'Right',
    clinical_notes TEXT,
    urgency VARCHAR(50) DEFAULT 'Routine',
    imaging_status VARCHAR(50) DEFAULT 'Completed',
    segmentation_status VARCHAR(50) DEFAULT 'Completed',
    reconstruction_status VARCHAR(50) DEFAULT 'Completed',
    review_status VARCHAR(50) DEFAULT 'Approved',
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Imaging Studies (DICOM CT & Radiographs)
CREATE TABLE IF NOT EXISTS imaging_studies (
    id SERIAL PRIMARY KEY,
    study_id VARCHAR(100) UNIQUE NOT NULL,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    modality VARCHAR(50) DEFAULT 'CT',
    study_type VARCHAR(100) DEFAULT 'Pre-Op Knee Protocol',
    slice_count INT DEFAULT 420,
    pixel_spacing VARCHAR(50) DEFAULT '0.625 x 0.625 mm',
    slice_thickness VARCHAR(50) DEFAULT '0.5 mm',
    kvp INT DEFAULT 120,
    ma INT DEFAULT 250,
    file_path TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Kellgren-Lawrence AI Grade Predictions
CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    model_name VARCHAR(100) NOT NULL DEFAULT 'ResNet50-KL-Classifier',
    grade INT NOT NULL,
    label VARCHAR(100) NOT NULL,
    confidence NUMERIC(6, 4) NOT NULL,
    probabilities JSONB NOT NULL,
    image_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bone Segmentation Jobs (Attention U-Net)
CREATE TABLE IF NOT EXISTS segmentation_jobs (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(100) UNIQUE NOT NULL,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    progress INT DEFAULT 100,
    input_file TEXT,
    output_mask TEXT,
    femur_volume_cm3 NUMERIC(8, 2) DEFAULT 218.4,
    tibia_volume_cm3 NUMERIC(8, 2) DEFAULT 164.2,
    patella_volume_cm3 NUMERIC(8, 2) DEFAULT 24.8,
    dice_score NUMERIC(6, 4) DEFAULT 0.942,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. 3D Anatomical Meshes (Femur, Tibia, Patella)
CREATE TABLE IF NOT EXISTS meshes (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    anatomical_structure VARCHAR(50) NOT NULL,
    file_path TEXT NOT NULL,
    surface_area_cm2 NUMERIC(10, 2) DEFAULT 340.5,
    volume_cm3 NUMERIC(10, 2) DEFAULT 218.4,
    vertices_count INT DEFAULT 48200,
    faces_count INT DEFAULT 96400,
    quality_score NUMERIC(6, 4) DEFAULT 0.985,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Pre-Operative Surgical Planning Records
CREATE TABLE IF NOT EXISTS planning_records (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50) UNIQUE NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Approved',
    resection_depth_femur_mm NUMERIC(5, 2) DEFAULT 8.5,
    resection_depth_tibia_mm NUMERIC(5, 2) DEFAULT 9.0,
    varus_valgus_angle_deg NUMERIC(5, 2) DEFAULT 0.0,
    flexion_extension_angle_deg NUMERIC(5, 2) DEFAULT 3.0,
    internal_external_rotation_deg NUMERIC(5, 2) DEFAULT 0.0,
    implant_size_femur VARCHAR(20) DEFAULT 'Size 5',
    implant_size_tibia VARCHAR(20) DEFAULT 'Size 4',
    poly_thickness_mm NUMERIC(4, 1) DEFAULT 10.0,
    joint_line_delta_mm NUMERIC(4, 1) DEFAULT 0.0,
    native_mldfa NUMERIC(5, 2) DEFAULT 88.5,
    native_mmpta NUMERIC(5, 2) DEFAULT 86.5,
    target_hip_knee_ankle_deg NUMERIC(5, 2) DEFAULT 180.0,
    planned_by VARCHAR(255) DEFAULT 'Dr. Sarah Mitchell',
    approved_by VARCHAR(255) DEFAULT 'Dr. Sarah Mitchell',
    approved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Clinical Audit Trail
CREATE TABLE IF NOT EXISTS audit_records (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    role VARCHAR(50),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Machine Learning Model Registry
CREATE TABLE IF NOT EXISTS ml_models (
    id SERIAL PRIMARY KEY,
    model_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    architecture VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    weights_path TEXT,
    config_path TEXT,
    framework VARCHAR(50) DEFAULT 'TensorFlow/PyTorch',
    input_shape VARCHAR(100) DEFAULT '224x224x3',
    accuracy_metric VARCHAR(50) DEFAULT 'Validation Accuracy',
    accuracy_value NUMERIC(6, 4) DEFAULT 0.9450,
    inference_latency_ms INT DEFAULT 42,
    parameters_count VARCHAR(50) DEFAULT '23.5M',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_imaging_patient_id ON imaging_studies(patient_id);
CREATE INDEX IF NOT EXISTS idx_seg_patient_id ON segmentation_jobs(patient_id);
CREATE INDEX IF NOT EXISTS idx_planning_patient_id ON planning_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_patient_id ON audit_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user_id ON password_reset_tokens(user_id);
