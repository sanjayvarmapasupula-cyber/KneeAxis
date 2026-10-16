# KneeAxis — Model Training Guide

This guide describes how to train both AI models in the KneeAxis pipeline:
1. **Model A**: Kellgren-Lawrence (KL) Grade Classifier (ResNet50)
2. **Model B**: 3D Knee Volume Segmentation (3D U-Net)

---

## 0. Master One-Command Execution (Offline College GPU Server)

To run the complete automated pipeline end-to-end on your college JupyterHub server:

```bash
python run_all.py
```

Or open `Run_All_Training.ipynb` and select **Run All Cells**.

### Operational Modes:
- **Pre-Flight Inspection**: `python run_all.py --preflight`
  Verifies Python, TensorFlow, GPU availability, directory structure, offline pretrained weights, and datasets.
- **Technical Smoke Test**: `python run_all.py --smoke-test`
  Runs small forward-backward passes and verifies atomic checkpoint saving.
- **Resume After Disconnect**: `python run_all.py --resume`
  Resumes automatically from the latest saved checkpoint.
- **Session Time Limit**: `python run_all.py --max-minutes 90`
  Stops gracefully before the college GPU job quota expires.

---

## 1. Quick Verification (Smoke Test)

Before launching full training on large datasets, you can also execute the standalone synthetic smoke test:
```bash
python scripts/smoke_test.py
```
This runs 1 epoch of 2D classification and 1 epoch of 3D segmentation on synthetic in-memory data in under 30 seconds.

---

## 2. Model A: KL Grade Classifier Training

### Training Architecture & Strategy
- **Base Architecture**: ResNet50 initialized with ImageNet pretrained weights.
- **Top Head**: GlobalAveragePooling2D $\rightarrow$ BatchNormalization $\rightarrow$ Dense(256, ReLU) $\rightarrow$ Dropout(0.4) $\rightarrow$ Dense(5, Softmax).
- **Two-Stage Training**:
  - **Stage 1 (Warmup)**: Backbone frozen, learning rate $1 \times 10^{-3}$, trains top classification head (typically 5–10 epochs).
  - **Stage 2 (Fine-tuning)**: Top 30 layers of ResNet50 un-frozen, learning rate reduced to $1 \times 10^{-4}$ with Cosine Annealing decay.
- **Loss & Metrics**:
  - Balanced Class-Weighted Categorical Cross-Entropy (compensates for class imbalance across KL0–KL4).
  - **Primary Evaluation Metric**: Quadratic Weighted Kappa (QWK) and Macro-F1.

### Running via CLI:
```bash
# Standard training session
python scripts/train_classification.py

# Time-bounded session (e.g., college GPU time limit of 90 minutes)
python scripts/train_classification.py --max-minutes 90

# Resume from previous run
python scripts/train_classification.py --resume 20261013_140000
```

### Running via Jupyter Notebook:
Open `notebooks/02_ResNet50_Training.ipynb` and run the cells sequentially.

---

## 3. Model B: 3D U-Net Knee Segmentation Training

### Training Architecture & Strategy
- **Architecture**: 3D U-Net with 3 resolution levels, 4x downsampling, skip connections, and instance/batch normalization.
- **Input Channels**: 1 (MRI / CT volumetric density).
- **Output Classes**: 6 anatomical classes (0: BG, 1: Femur, 2: Femoral Cartilage, 3: Tibia, 4: Medial Cartilage, 5: Lateral Cartilage).
- **Loss Function**: Combined Dice Loss + Categorical Cross-Entropy:
  $$\mathcal{L}_{\text{total}} = 0.5 \cdot \mathcal{L}_{\text{Dice}} + 0.5 \cdot \mathcal{L}_{\text{CCE}}$$
- **Patch Extraction Strategy**: Full 3D MRI scans (typically $384 \times 384 \times 160$ voxels) exceed typical GPU VRAM if fed in one pass. KneeAxis uses **foreground-aware random patch sampling** ($64 \times 64 \times 64$ voxels), ensuring at least 70% of patches contain relevant bone/cartilage structures.

### Running via CLI:
```bash
# Standard segmentation training
python scripts/train_segmentation.py

# Time-bounded session (e.g. 120 minutes)
python scripts/train_segmentation.py --max-minutes 120

# Resume previous session
python scripts/train_segmentation.py --resume 20261013_153000
```

### Running via Jupyter Notebook:
Open `notebooks/03_3D_UNet_Training.ipynb`.

---

## 4. Hyperparameter Configuration

All training hyperparameters can be adjusted without code modifications in `config.yaml`:

```yaml
classification:
  image_size: [224, 224]
  batch_size: 32
  initial_lr: 0.001
  fine_tune_lr: 0.0001
  epochs_frozen: 5
  epochs_unfrozen: 25
  unfreeze_layers: 30

segmentation:
  patch_size: [64, 64, 64]
  batch_size: 2
  base_filters: 16
  initial_lr: 0.0005
  epochs: 50
  patches_per_volume: 16
```

---

## 5. Monitoring & Outputs

During training, real-time metrics and checkpoints are logged automatically:
- **Checkpoints**: Saved to `checkpoints/{task}/{run_id}/` (e.g., `checkpoint_state.json`, `best_model.weights.h5`, `last_model.weights.h5`).
- **Final Models**: Upon completion, the best weights are saved to `models/kl_classifier/best.weights.h5` and `models/knee_segmentation/best.weights.h5`.
- **Logs**: Training loss and validation history are logged to `logs/` and `outputs/`.
