# KneeAxis — Complete Offline College GPU Training Automation
**AI-Assisted 3D Knee Reconstruction & Arthroplasty Planning**

Welcome to the upgraded, self-contained, offline model training package for KneeAxis. Designed specifically for university GPU servers and JupyterHub nodes **without internet access**, this package allows you to complete the entire data preparation, validation, training, evaluation, verification, and artifact packaging workflow with **one master execution**.

---

## ⚡ Quick Start: One Master Execution

### Option A: Command Line (Recommended for Long Runs via `tmux`)
```bash
# 1. Preflight System & Dataset Check
python run_all.py --preflight

# 2. Rapid Technical Smoke Test (< 75 seconds)
python run_all.py --smoke-test

# 3. Master End-to-End Sequential Training
python run_all.py
```
*(If a session is interrupted or time expires, resume immediately with: `python run_all.py --resume`)*

### Option B: Interactive Jupyter Notebook
Open **`Run_All_Training.ipynb`** in JupyterHub and click:
**Kernel $\rightarrow$ Restart Kernel and Run All Cells**

---

## 🛡️ Complete Offline Operation Rules

1. **Zero External Internet Calls**:
   - ResNet50 initializes from local weights: `pretrained/resnet50_imagenet_notop.h5` (included in package).
   - No `wget`, `curl`, `pip` online downloads, Hugging Face, or Kaggle API calls.
2. **Offline Dependency Wheelhouse**:
   - If missing packages on the server, install from the local wheelhouse without accessing PyPI:
     ```bash
     python -m pip install --no-index --find-links=wheelhouse -r requirements-college.txt
     ```
3. **Decoupled from Web Backend**:
   - Runs self-contained on Linux/JupyterHub without Node.js or React dependencies.
4. **OAIZIB-CM 6 Anatomical Classes**:
   - `0: Background`, `1: Distal Femur`, `2: Femoral Cartilage`, `3: Proximal Tibia`, `4: Medial Tibial Cartilage`, `5: Lateral Tibial Cartilage`.
   - **Patella and Fibula are not annotated in OAIZIB-CM.** For external pre-annotation or baseline comparison, TotalSegmentator is documented in `guides/DATASET_DOWNLOADS.md`.
5. **Geometry Preservation for 3D Reconstruction**:
   - Predicted NIfTI masks (`prediction.nii.gz`) preserve the original MRI volume's spacing, origin, and direction cosine matrix, maintaining 100% compatibility with the KneeAxis Laplacian-Smoothed Marching Cubes 3D reconstruction engine.

---

## 📁 Package Directory Layout

```text
KneeAxis_College_Training/
├── README_FIRST.md                     # This master document
├── training_config.yaml                # Master configuration (paths, hyperparameters, limits)
├── run_all.py                          # Master one-click orchestrator script
├── Run_All_Training.ipynb              # Master one-click Jupyter notebook (13 cells)
├── environment_check.py                # Server diagnostic tool
├── requirements-college.txt            # Minimal dependencies for college GPU nodes
│
├── pretrained/                         # Offline pretrained weights
│   └── resnet50_imagenet_notop.h5      # Official Keras ResNet50 ImageNet weights (94.7 MB)
│
├── wheelhouse/                         # Local wheels directory for offline pip installs
├── datasets/                           # Target directory for raw imaging data
│   ├── OAI/                            # Bilateral radiographs (images/ and annotations/)
│   ├── MOST/                           # External validation radiographs
│   ├── OAIZIB_CM/                      # Zenodo 14934086 3D MRI scans (imagesTr, labelsTr, imagesTs, labelsTs)
│   └── TotalSegmentator/               # Optional baseline reference directory
│
├── manifests/                          # Verified subject-level split CSV manifests
├── checkpoints/                        # Atomic timestamped checkpoints
├── models/                             # Final exported weights (best.weights.h5, best.keras, metrics.json)
├── outputs/                            # Training curves, confusion matrices, prediction masks
├── logs/                               # Real-time persistent log traces
│
├── src/                                # Modular core source code
│   ├── common/                         # Paths, GPU growth, metrics (QWK, Dice), checkpoint manager
│   ├── classification/                 # ResNet50 model, subject split, train, eval, CLI predict
│   └── segmentation/                   # 3D U-Net model, patch generator, train, sliding-window eval
│
├── scripts/                            # Top-level CLI runners
│   ├── prepare_manifests.py            # Automated dataset discovery & manifest builder
│   ├── validate_datasets.py            # Rigorous medical imaging validation suite
│   ├── smoke_test.py                   # Verified synthetic end-to-end pipeline test
│   ├── train_classification.py         # ResNet50 training runner
│   ├── train_segmentation.py           # 3D U-Net training runner
│   ├── resume_training.py              # Resumption utility
│   ├── verify_saved_models.py          # Verifies trained models against Express contracts
│   └── export_artifacts.py             # Bundles weights and checksums for download
│
├── integration/                        # Fullstack integration documentation & test scripts
│   ├── model_contracts.json            # JSON contract schema of inference CLI & schemas
│   ├── MODEL_INTEGRATION_GUIDE.md      # Step-by-step weight drop-in and UI toggle instructions
│   └── inference_example.py            # Test script verifying trained weights locally
│
└── guides/                             # Comprehensive operational manuals
    ├── JUPYTERHUB_SETUP.md             # Offline setup, tmux session safety & quotas
    ├── DATASET_DOWNLOADS.md            # Acquisition links for OAI, MOST, OAIZIB-CM & TotalSeg
    ├── TRAINING_GUIDE.md               # Hyperparameters, transfer learning, streaming patches
    ├── RESUME_GUIDE.md                 # Checkpoint resumption & wall-clock time limit safety
    └── TROUBLESHOOTING.md              # Resolving CUDA OOM, killed processes, quotas, NaN losses
```

---

## 📦 After Training: Exporting Weights

When training completes, `run_all.py` automatically produces:
`KneeAxis_Trained_Artifacts.zip`

Download this ZIP to your laptop and extract into your KneeAxis application root:
- `models/kl_classifier/best.weights.h5`
- `models/knee_segmentation/best.weights.h5`

Toggle `use_trained_model: true` in `models/model_integration_config.json` (or toggle on the web dashboard under **AI Models $\rightarrow$ Custom Training Space**).
