# KneeAxis — AI-Assisted 3D Knee Reconstruction & Arthroplasty Planning

A comprehensive full-stack clinical platform for patient-specific knee segmentation, high-fidelity 3D anatomical surface reconstruction, Kellgren-Lawrence (KL) osteoarthritis classification, and Individualized Kinematic Alignment (iKA) surgical planning for robotic-assisted Total Knee Arthroplasty (TKA).

---

## 📁 Repository Directory Structure

```text
ROSA_NEW/
│
├── frontend/                            # React 19 + Vite Frontend Workspace
│   ├── package.json                     # Frontend dependencies & build scripts
│   ├── vite.config.js                   # Vite configuration (port 3000, API proxy to 5000)
│   ├── index.html                       # HTML application entry point
│   ├── components.json                  # shadcn/ui configuration
│   ├── tsconfig.json                    # Frontend TypeScript/JSX configuration
│   ├── public/                          # Static web assets
│   │   ├── logo/                        # KneeAxis logo assets
│   │   ├── images/                      # Static clinical iconography
│   │   └── models/                      # Benchmark visualization figures
│   └── src/
│       ├── App.jsx                      # Root application component & theme provider
│       ├── main.jsx                     # React DOM mount point
│       ├── index.css                    # Tailwind CSS v4 styling layers
│       ├── components/                  # UI, 3D, and layout components
│       │   ├── layout/                  # Header.jsx, Sidebar.jsx, Footer.jsx
│       │   ├── auth/                    # Password strength & inputs
│       │   ├── common/                  # PageHero, StatusPill, ModelStatusCard, etc.
│       │   ├── ui/                      # Radix UI / shadcn accessible primitives
│       │   └── 3d/                      # Three.js KneeViewer & resection plane models
│       ├── pages/                       # Clinical, Public, Legal & Auth views
│       │   ├── Dashboard.jsx            # Surgical KPI dashboard
│       │   ├── PatientRegistry.jsx      # Patient list & status table
│       │   ├── PatientDetails.jsx       # Single patient clinical dossier
│       │   ├── ImagingViewer.jsx        # Multi-slice DICOM/X-ray viewer
│       │   ├── AIModels.jsx             # AI model toggle & performance console
│       │   ├── Segmentation.jsx         # Anatomical segmentation viewer
│       │   ├── Reconstruction.jsx       # 3D surface mesh generation & QA
│       │   ├── SurgicalPlanning.jsx     # iKA resection planner & angle calculators
│       │   ├── Reports.jsx              # Clinical dossier export
│       │   ├── Analytics.jsx            # Cohort statistics & alignment trends
│       │   ├── Settings.jsx             # System configuration
│       │   ├── auth/                    # Register, ForgotPassword, ResetPassword
│       │   ├── public/                  # Home, Features, Workflow, About, Contact
│       │   └── legal/                   # MedicalDisclaimer, PrivacyPolicy, TermsOfUse
│       ├── layouts/                     # AppLayout, AuthLayout, PublicLayout
│       ├── routes/                      # Wouter routing system (AppRoutes.jsx)
│       ├── services/                    # Axios API client layer (api.js)
│       ├── store/                       # Zustand global stores (useAppStore.js)
│       ├── hooks/                       # Custom hooks (useMobile, etc.)
│       ├── contexts/                    # React Context providers (ThemeContext)
│       ├── styles/                      # Extra stylesheets
│       ├── utils/                       # Styling helpers (cn, clsx, twMerge)
│       └── assets/                      # Application media
│
├── backend/                             # Express.js REST API & AI Orchestration Server
│   ├── package.json                     # Backend dependencies (pg, pg-mem, bcryptjs, etc.)
│   ├── .env                             # Environment configuration (DATABASE_URL, etc.)
│   ├── .env.example                     # Environment template
│   ├── server.js                        # Node.js HTTP server entry point (port 5000)
│   ├── app.js                           # Express app, middleware, & route registry
│   ├── config/                          # Database connection pool & seed orchestration
│   ├── db/                              # Relational database schema & in-memory setup
│   │   ├── index.js                     # Unified db query interface
│   │   ├── schema.sql                   # PostgreSQL schema definition
│   │   └── migrations/                  # Versioned schema migrations
│   ├── routes/                          # REST API routes (auth, patients, jobs, meshes, etc.)
│   ├── controllers/                     # Controller layer handling HTTP requests
│   ├── services/                        # Business logic & Python subprocess runner
│   ├── middleware/                      # Auth guards, Multer upload, rate limiter, error handler
│   ├── models/                          # Database entity models
│   ├── utils/                           # File system path resolvers & unified JSON responses
│   └── scripts/                         # Backend operational scripts
│       └── verify_postgres.mjs          # PostgreSQL connection & table diagnostic
│
├── ml/                                  # Machine Learning & Deep Learning Inference
│   ├── training/                        # Training pipelines & scripts
│   │   ├── classification/              # KL osteoarthritis grade training
│   │   └── segmentation/                # 3D knee anatomical segmentation training
│   ├── inference/                       # Production inference runners
│   │   ├── predict_kl.py                # KL grading inference script
│   │   └── predict_segmentation.py      # Volumetric segmentation inference script
│   ├── evaluation/                      # Model validation & benchmark scripts
│   └── configs/                         # ML hyperparameters & training configs
│       └── training_config.yaml         # Architecture & training specifications
│
├── reconstruction3d/                    # 3D Surface Reconstruction Engine
│   ├── reconstruct_3d.py                # Main pipeline (Voxel Mask -> 3D Surface Meshes)
│   ├── mesh_utils.py                    # Marching Cubes, Taubin smoothing, STL/OBJ export
│   ├── mesh_qa.py                       # Automated mesh QA (manifoldness, volume, area)
│   ├── medical_image_utils.py           # NIfTI / DICOM I/O & coordinate transforms
│   ├── labels.json                      # Anatomical structure labels (femur, tibia, patella)
│   └── requirements_3d.txt              # Python requirements (trimesh, nibabel, scikit-image)
│
├── planning/                            # Surgical Planning & Biomechanical Kinematic Engine
│   ├── ika_planner.py                   # Individualized Kinematic Alignment (iKA) planner
│   ├── alignment_utils.py               # Biomechanical angles (HKA, mLDFA, MPTA) & safe bounds
│   └── landmark_utils.py                # Anatomical landmark detection from meshes
│
├── models/                              # Trained AI Weights & Benchmark Artifacts
│   ├── kl_classifier/                   # Classifier metadata and deployment config
│   ├── knee_segmentation/               # Segmentation metadata and deployment config
│   ├── attention-unet/                  # Attention U-Net checkpoints & validation curves
│   ├── resnet/                          # ResNet classification weights & ROC curves
│   ├── model_integration_config.json    # Toggle between simulated and user-trained weights
│   └── README.md                        # Model weights drop-in and integration guide
│
├── notebooks/                           # Jupyter Research Notebooks
│   ├── classification/                  # KL classification experimentation notebooks
│   ├── segmentation/                    # Volumetric segmentation training notebooks
│   └── reconstruction/                  # 3D surface mesh generation experimentation
│
├── datasets/                            # Clinical Datasets & Imaging Repositories
│   ├── OAI/                             # Osteoarthritis Initiative dataset
│   ├── MOST/                            # Multicenter Osteoarthritis Study
│   ├── OAIZIB_CM/                       # OAI ZIB Cartilage/Bone dataset
│   └── TotalSegmentator/                # TotalSegmentator CT/MRI reference
│
├── uploads/                             # Incoming Medical Imaging Storage
│   └── patients/                        # Organized by patient ID (DICOM, NIfTI, X-ray)
│
├── outputs/                             # Generated Clinical Dossiers & 3D Meshes
│   └── patients/                        # Organized by patient ID (segmentation, meshes, QA, plans)
│
├── tests/                               # Automated Test Suites
│   ├── frontend/                        # UI and component unit tests
│   ├── backend/                         # Database and auth integration tests (test_auth_database.mjs)
│   ├── integration/                     # Full pipeline end-to-end tests (test_full_pipeline.mjs)
│   └── e2e/                             # End-to-end surgical workflow tests
│
├── docs/                                # Technical Documentation & Research
│   ├── architecture/                    # System architecture & design system (DESIGN_SYSTEM.md)
│   ├── research/                        # Academic publications (IEEE_Research_Paper.docx)
│   ├── development/                     # Developer logs & milestone trackers
│   └── user-guide/                      # Viva guide, clinical demo scripts & reports
│
├── scripts/                             # Operational & Orchestration Scripts
│   ├── setup.ps1                        # Complete system setup & dependency installation
│   └── start.ps1                        # Concurrent backend and frontend launcher
│
├── shared/                              # Shared Constants
│   └── const.js                         # Session cookie keys & shared token lifespans
│
├── .gitignore                           # Git ignore rules (protects credentials & patient data)
├── .prettierrc                          # Code formatting rules
├── package.json                         # Root orchestration & workspace configuration
├── package-lock.json                    # Workspace lockfile
└── README.md                            # Primary documentation
```

---

## 🚀 Quickstart & Running the Application

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: Running locally or via Docker (`docker start kneeaxis-postgres`)
- **Python**: 3.10+ with `trimesh`, `nibabel`, `scikit-image`, `numpy`, `scipy`

### 2. Automated Setup
Run the setup script in Windows PowerShell:
```powershell
.\scripts\setup.ps1
```

### 3. Launching Services
Run the launcher script to start both backend and frontend:
```powershell
.\scripts\start.ps1
```
Or start them individually:
```bash
# Terminal 1: Backend Express Server (Port 5000)
npm run dev:backend
# or from backend/: cd backend && npm run dev

# Terminal 2: Frontend React Application (Port 3000)
npm run dev
# or from frontend/: cd frontend && npm run dev
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🧪 Running Automated Tests

Run the full automated test suite:
```bash
# Verify PostgreSQL database connection
npm run verify:db

# Run backend database & authentication test suite (14 test cases)
npm run test:auth

# Run complete end-to-end surgical pipeline integration test (15 test phases)
npm run test:backend

# Run all test suites
npm test
```
