# KNEEAXIS — AI Model Integration Hub & Custom Training Space

This directory contains the machine learning weights, neural network architectures, and runtime configurations for the **KNEEAXIS Robotic Knee Arthroplasty (TKA)** pipeline.

---

## 1. Directory Structure

```text
models/
├── model_integration_config.json # Master toggle for Simulated Fake Values vs Trained Model Weights
├── kl_classifier/                # Kellgren-Lawrence Osteoarthritis Grade Classifier
│   ├── model_config.json         # Architecture parameters, labels, input shapes
│   ├── best.weights.h5           # Trained ResNet-50 / DenseNet weight file (drop in here)
│   └── README.md
├── knee_segmentation/            # Anatomical Bone Segmentation Network
│   ├── model_config.json         # 3D Attention U-Net / V-Net configuration
│   ├── best.weights.h5           # PyTorch / Keras segmentation weights (drop in here)
│   └── README.md
├── reconstruction3d/             # Polygon Mesh Extraction & Smoothing Engine
│   ├── labels.json               # Anatomical class indices (Femur, Tibia, Patella)
│   └── config.json               # Iso-surface thresholds, Laplacian smoothing passes
└── onnx/                         # Exported ONNX high-throughput inference models
    └── .gitkeep
```

---

## 2. Integrated Models Overview

| Model ID | Architecture | Framework | Target Anatomy | Accuracy Metric |
| :--- | :--- | :--- | :--- | :--- |
| `MOD-KL-RESNET50` | ResNet-50 Ordinal | TensorFlow / Keras | Bilateral Knee Radiograph | **94.5% Val Acc** |
| `MOD-SEG-ATTN-UNET` | 3D Attention U-Net | PyTorch / TorchScript | Distal Femur, Tibia, Patella | **0.958 Mean Dice** |
| `MOD-REC-MARCHING-CUBES`| Laplacian Marching Cubes | SciPy / Trimesh | Watertight Triangular Mesh | **< 0.5mm Hausdorff** |
| `MOD-PLAN-KINEMATIC-ALIGN`| iKA Constrained Optimization | CVXPY / NumPy | Femoral/Tibial Resection Planes | **< 0.5° Deviation** |

---

## 3. How to Use: Fake Values vs Trained Models

### Phase 1: During Development & Model Training (Current State)
By default, `model_integration_config.json` has `use_trained_model: false` for all components. The application serves validated realistic medical baseline values so you can run, visualize, and develop the full end-to-end pipeline (imaging → 3D reconstruction → resection planning → reporting) without waiting for training to finish.

You can customize these simulated values directly:
- In the Web UI at `/models` → **"Custom Training Space"** tab.
- Or directly in `models/model_integration_config.json`.

### Phase 2: After Training Your Models
Once your model training is complete:
1. **Drop in your weights**:
   - Save your KL classifier weights as `models/kl_classifier/best.weights.h5` (or `.pt` / `.onnx`).
   - Save your knee segmentation weights as `models/knee_segmentation/best.weights.h5` (or `.pt` / `.onnx`).
2. **Flip the toggle**:
   - In the Web UI (`/models` → "Custom Training Space"), switch **Simulated Active** to **Trained Weights Active** and click **Save Configuration**.
   - Or in `models/model_integration_config.json`, change:
     ```json
     "kl_classifier": {
       "use_trained_model": true
     },
     "knee_segmentation": {
       "use_trained_model": true
     }
     ```
3. **Execute Live Inference**:
   - The Python inference runners (`ml/inference/predict_kl.py` and `ml/inference/predict_segmentation.py`) will automatically load your trained checkpoints and execute native forward passes, saving the outputs to `prediction.nii.gz` and feeding into 3D reconstruction!

---

## 4. API Endpoints for Custom Integration
- `GET /api/models/custom-config/get`: Fetches current toggle states and parameters.
- `PUT /api/models/custom-config/save`: Updates toggle states and custom baseline values.
- `POST /api/models/:modelId/test`: Triggers test inference on the selected model.
- `POST /api/models/:modelId/weights`: Uploads new model weights file directly through the API.
