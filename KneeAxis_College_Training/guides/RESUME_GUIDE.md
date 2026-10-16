# KneeAxis — Checkpoint Management and Safe Resumption Guide

University and shared GPU clusters enforce strict wall-clock time limits (often 1 to 4 hours per session), and interactive JupyterHub sessions can be abruptly killed if disconnected. 

KneeAxis includes an **atomic, session-aware checkpointing architecture** specifically engineered to prevent progress loss under these conditions.

---

## 1. How Checkpointing Works

For every training run, a dedicated run directory is created under:
```text
checkpoints/{classification|segmentation}/{YYYYMMDD_HHMMSS}/
├── checkpoint_state.json     # Metadata, last epoch, best metric, history
├── best_model.weights.h5     # Weights from epoch with best validation score
├── last_model.weights.h5     # Weights from the most recent completed epoch
└── training_history.json     # Epoch-by-epoch loss and validation metrics
```

### Atomic File Writes
To prevent corrupted checkpoint files if the server kills the process while saving weights:
1. State metadata is written to `checkpoint_state.json.tmp`.
2. The file is flushed and synced to disk.
3. The temporary file is atomically renamed to `checkpoint_state.json`.

---

## 2. Setting Time Limits to Prevent Hard Kills

Rather than allowing the college server scheduler to hard-kill (`SIGKILL`) your process mid-epoch, configure a proactive time limit. The KneeAxis `TimeLimitCallback` gracefully halts training at the end of the current epoch, saves the final checkpoint, and exits cleanly:

### Option A: Via Command Line
```bash
# Gracefully stop after 110 minutes on a 2-hour university job:
python scripts/train_classification.py --max-minutes 110
```

### Option B: Via `config.yaml`
```yaml
training:
  max_minutes: 110
  save_every_n_epochs: 1
```

---

## 3. Resuming Training After Interruption

### Listing Previous Runs:
```bash
python scripts/resume_training.py --task classification --list
```
**Output:**
```text
========================================================
 Available Checkpoint Runs for Task: CLASSIFICATION
========================================================
  • Run ID: 20261013_140000
    - Epochs Completed: 14
    - Best val_qwk: 0.8142
    - Last Updated: 2026-10-13T14:45:12
```

### Resuming the Most Recent Run:
```bash
python scripts/resume_training.py --task classification --latest
```

### Resuming a Specific Run:
```bash
python scripts/resume_training.py --task classification --run-id 20261013_140000 --max-minutes 90
```

### Resuming 3D Segmentation:
```bash
python scripts/resume_training.py --task segmentation --latest --max-minutes 120
```

---

## 4. What Happens on Resume?

When you resume:
1. `CheckpointManager` reads `checkpoint_state.json` to identify the last completed epoch (e.g. Epoch 14).
2. The model architecture is reconstructed.
3. Weights are reloaded from `best_model.weights.h5` or `last_model.weights.h5`.
4. Initial training starts from `initial_epoch = 14`, ensuring learning rate schedulers and epoch counters continue seamlessly.
5. Previous metrics in `training_history.json` are preserved and appended to.
