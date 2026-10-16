# KneeAxis — Model Weight Integration Guide

This guide walks you through the exact process of transferring your trained weights from your college GPU server into your local KneeAxis application and enabling real-model inference.

---

## 1. Overview of Artifacts to Download

When training finishes or is stopped on the college GPU server, execute:
```bash
python scripts/export_artifacts.py
```
This produces `KneeAxis_Trained_Artifacts.zip` in your training root. Download this zip file to your local machine.

Inside `KneeAxis_Trained_Artifacts.zip`, you will find:
```text
KneeAxis_Trained_Artifacts/
├── kl_classifier/
│   ├── best.weights.h5          # Best KL ResNet50 checkpoint weights
│   ├── model_config.json        # Architecture and class mapping metadata
│   └── evaluation_results.json  # OAI test & MOST validation metrics
├── knee_segmentation/
│   ├── best.weights.h5          # Best 3D U-Net checkpoint weights
│   ├── model_config.json        # 3D U-Net patch & label definitions
│   └── evaluation_results.json  # Mean foreground Dice & per-class Dice
├── CHECKSUMS_SHA256.txt         # Cryptographic verification hashes
└── export_manifest.json         # Timestamp, system info, training summary
```

---

## 2. Placing Artifacts in the KneeAxis Main Project

Copy the extracted folders into your KneeAxis project root (`ROSA_NEW`):

1. **KL Classifier**:
   - Destination: `models/kl_classifier/best.weights.h5`
   - Config: `models/kl_classifier/model_config.json`
2. **Knee Segmentation**:
   - Destination: `models/knee_segmentation/best.weights.h5`
   - Config: `models/knee_segmentation/model_config.json`

---

## 3. Enabling Trained Models in KneeAxis

Open `models/model_integration_config.json` in your KneeAxis workspace. Toggle `use_trained_model` to `true`:

```json
{
  "_comment": "KNEEAXIS — User Model Training & Custom Integration Space.",
  "kl_classifier": {
    "use_trained_model": true,
    "weights_path": "models/kl_classifier/best.weights.h5",
    "config_path": "models/kl_classifier/model_config.json",
    "framework": "TensorFlow/Keras",
    "input_shape": [224, 224, 3]
  },
  "knee_segmentation": {
    "use_trained_model": true,
    "weights_path": "models/knee_segmentation/best.weights.h5",
    "config_path": "models/knee_segmentation/model_config.json",
    "framework": "TensorFlow/Keras",
    "input_shape": [64, 64, 64, 1]
  }
}
```
*(Alternatively, you can toggle this switch directly from the KneeAxis web dashboard under **AI Models -> Custom Training Space**.)*

---

## 4. Validating Inference Before Launching Full-Stack

Run the provided integration verification script:
```bash
python integration/inference_example.py --model all
```
Or test via the Express backend CLI contracts directly:

### A. Test KL Inference:
```bash
python ml/inference/predict_kl.py \
  --image test_knee.png \
  --weights models/kl_classifier/best.weights.h5 \
  --config models/kl_classifier/model_config.json
```
**Expected Output (stdout):**
```json
{
  "grade": 2,
  "label": "KL 2 - Minimal",
  "confidence": 0.884,
  "probabilities": {
    "KL0": 0.03,
    "KL1": 0.07,
    "KL2": 0.884,
    "KL3": 0.012,
    "KL4": 0.004
  },
  "mode": "user_trained_weights"
}
```

### B. Test 3D Segmentation Inference:
```bash
python ml/inference/predict_segmentation.py \
  --image sample_mri.nii.gz \
  --weights models/knee_segmentation/best.weights.h5 \
  --output storage/predictions/output_mask.nii.gz
```

---

## 5. Dataset Label Mappings & Caveats

### OAIZIB-CM (Zenodo Record 14934086)
The OAIZIB-CM dataset contains **6 classes**:
- `0`: Background
- `1`: Femur
- `2`: Femoral Cartilage
- `3`: Tibia
- `4`: Medial Tibial Cartilage
- `5`: Lateral Tibial Cartilage

> [!IMPORTANT]
> **Patella and Fibula are NOT annotated in OAIZIB-CM.**
> If your surgical planning pipeline requires patella or fibula segmentation, use the optional external TotalSegmentator pipeline (see `guides/DATASET_DOWNLOADS.md`) for pre-annotation.
