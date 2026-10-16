"""
KneeAxis — ResNet50 KL Classification Training Script
======================================================
Canonical training implementation called by notebooks and CLI.
Supports time-limited training, checkpointing, and resume.
"""

import os
import sys
import json
import time
import datetime
from pathlib import Path
from typing import Optional, Dict, Any

# Add parent paths for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import numpy as np
import tensorflow as tf

from src.common.paths import load_config, resolve_path, ensure_directories, PROJECT_ROOT
from src.common.gpu_utils import configure_gpu_memory_growth
from src.common.checkpoint_manager import CheckpointManager, generate_run_id
from src.classification.model import build_resnet50_classifier, unfreeze_backbone, get_model_config
from src.classification.preprocessing import (
    load_manifest, split_by_subject, compute_class_weights, build_tf_dataset,
)


class TimeLimitCallback(tf.keras.callbacks.Callback):
    """Stop training after a specified number of minutes."""

    def __init__(self, max_minutes: float):
        super().__init__()
        self.max_seconds = max_minutes * 60.0
        self.start_time = None

    def on_train_begin(self, logs=None):
        self.start_time = time.time()
        print(f"[TimeLimitCallback] Training will stop after {self.max_seconds / 60:.1f} minutes.")

    def on_epoch_end(self, epoch, logs=None):
        elapsed = time.time() - self.start_time
        remaining = self.max_seconds - elapsed
        print(f"[TimeLimitCallback] Elapsed: {elapsed/60:.1f} min | Remaining: {max(0, remaining/60):.1f} min")
        if elapsed >= self.max_seconds:
            print(f"[TimeLimitCallback] Time limit reached at epoch {epoch + 1}. Stopping.")
            self.model.stop_training = True


def train_classification(
    config_path: Optional[Path] = None,
    resume_run_id: Optional[str] = None,
    max_minutes: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Train the ResNet50 KL classifier.

    Parameters
    ----------
    config_path : Path, optional
        Path to config.yaml. Uses default if None.
    resume_run_id : str, optional
        Run ID to resume from. If None, starts a new run.
    max_minutes : float, optional
        Override MAX_MINUTES from config.

    Returns
    -------
    dict
        Training results including run_id, metrics, paths.
    """
    configure_gpu_memory_growth()

    cfg = load_config(config_path)
    ensure_directories(cfg)

    cls_cfg = cfg.get("classification", {})
    train_cfg = cfg.get("training", {})

    # Time limit
    time_limit = max_minutes or train_cfg.get("max_minutes", 60)
    seed = train_cfg.get("seed", 42)
    np.random.seed(seed)
    tf.random.set_seed(seed)

    # Load manifest
    manifest_path = resolve_path(cfg["manifests"]["oai"])
    records = load_manifest(manifest_path)
    if not records:
        raise ValueError(f"No valid records found in manifest: {manifest_path}")

    # Split by subject
    train_ratio = cls_cfg.get("split", {}).get("train_ratio", 0.7)
    val_ratio = cls_cfg.get("split", {}).get("val_ratio", 0.15)
    test_ratio = cls_cfg.get("split", {}).get("test_ratio", 0.15)

    train_records, val_records, test_records = split_by_subject(
        records, train_ratio, val_ratio, test_ratio, seed
    )

    # Class weights
    cw_setting = cls_cfg.get("class_weights", "balanced")
    if cw_setting == "balanced":
        class_weight = compute_class_weights(train_records, num_classes=5)
    elif isinstance(cw_setting, list):
        class_weight = {i: w for i, w in enumerate(cw_setting)}
    else:
        class_weight = None

    # Build datasets
    image_size = cls_cfg.get("image_size", 224)
    batch_size = cls_cfg.get("batch_size", 16)
    aug_config = cls_cfg.get("augmentation", {})

    train_ds = build_tf_dataset(
        train_records, image_size=image_size, batch_size=batch_size,
        augment=True, shuffle=True,
        shuffle_buffer=cls_cfg.get("shuffle_buffer", 1000),
        prefetch=cls_cfg.get("prefetch_buffer", 2),
        aug_config=aug_config,
    )
    val_ds = build_tf_dataset(
        val_records, image_size=image_size, batch_size=batch_size,
        augment=False, shuffle=False,
        prefetch=cls_cfg.get("prefetch_buffer", 2),
    )

    # Checkpoint manager
    ckpt_dir = resolve_path(cfg["outputs"]["checkpoints"]) / "classification"

    if resume_run_id:
        ckpt_mgr = CheckpointManager(ckpt_dir, run_id=resume_run_id)
        if not ckpt_mgr.can_resume():
            print(f"WARNING: Cannot resume from {resume_run_id}. Starting new run.")
            ckpt_mgr = CheckpointManager(ckpt_dir)
    else:
        ckpt_mgr = CheckpointManager(ckpt_dir)

    print(f"\n{'='*60}")
    print(f"  KneeAxis KL Classification Training")
    print(f"  Run ID: {ckpt_mgr.run_id}")
    print(f"  Time Limit: {time_limit} minutes")
    print(f"{'='*60}\n")

    # Build model
    freeze_backbone = True
    freeze_epochs = cls_cfg.get("freeze_backbone_epochs", 5)

    pretrained_weights = cls_cfg.get("pretrained_weights", "pretrained/resnet50_imagenet_notop.h5")
    offline = cfg.get("environment", {}).get("offline", True)
    initialization = cls_cfg.get("initialization", "local_pretrained")
    allow_random_fallback = cls_cfg.get("allow_random_init_fallback", True)

    model = build_resnet50_classifier(
        input_shape=(image_size, image_size, 3),
        num_classes=5,
        freeze_backbone=freeze_backbone,
        dropout_rate=cls_cfg.get("dropout_rate", 0.3),
        label_smoothing=cls_cfg.get("label_smoothing", 0.1),
        learning_rate=cls_cfg.get("learning_rate", 1e-4),
        pretrained_weights=pretrained_weights,
        offline=offline,
        initialization=initialization,
        allow_random_init_fallback=allow_random_fallback,
    )

    # Resume weights if available
    initial_epoch = 0
    prev_state = ckpt_mgr.load_training_state()
    if prev_state and ckpt_mgr.latest_path.is_file():
        print(f"Resuming from epoch {prev_state['epoch']} of run {ckpt_mgr.run_id}")
        print("NOTE: Optimizer state is NOT restored from weights-only checkpoint.")
        model.load_weights(str(ckpt_mgr.latest_path))
        initial_epoch = prev_state["epoch"]

    # Callbacks
    callbacks = [
        TimeLimitCallback(max_minutes=time_limit),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(ckpt_mgr.best_path),
            monitor="val_accuracy",
            save_best_only=True,
            save_weights_only=True,
            verbose=1,
        ),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(ckpt_mgr.latest_path),
            save_best_only=False,
            save_weights_only=True,
            verbose=0,
        ),
        tf.keras.callbacks.CSVLogger(
            str(ckpt_mgr.run_dir / "training_log.csv"), append=(initial_epoch > 0)
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=1e-7, verbose=1,
        ),
    ]

    max_epochs = cls_cfg.get("epochs", 100)

    # Phase 1: Frozen backbone
    if initial_epoch < freeze_epochs:
        print(f"\n--- Phase 1: Frozen backbone (epochs {initial_epoch+1}–{freeze_epochs}) ---")
        history1 = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=freeze_epochs,
            initial_epoch=initial_epoch,
            class_weight=class_weight,
            callbacks=callbacks,
        )
        initial_epoch = freeze_epochs

        # Save state after phase 1
        ckpt_mgr.save_training_state(
            epoch=freeze_epochs, global_step=0,
            best_val_metric=max(history1.history.get("val_accuracy", [0])),
            best_metric_name="val_accuracy", seed=seed,
        )

        if model.stop_training:
            print("Time limit reached during Phase 1.")
        else:
            # Phase 2: Unfreeze backbone
            print(f"\n--- Phase 2: Fine-tuning backbone (epochs {freeze_epochs+1}–{max_epochs}) ---")
            fine_tune_from = cls_cfg.get("fine_tune_from_layer", 100)
            model = unfreeze_backbone(
                model,
                fine_tune_from_layer=fine_tune_from,
                learning_rate=cls_cfg.get("learning_rate", 1e-4) * 0.1,
                label_smoothing=cls_cfg.get("label_smoothing", 0.1),
            )
    else:
        # Already past frozen phase
        fine_tune_from = cls_cfg.get("fine_tune_from_layer", 100)
        model = unfreeze_backbone(
            model,
            fine_tune_from_layer=fine_tune_from,
            learning_rate=cls_cfg.get("learning_rate", 1e-4) * 0.1,
            label_smoothing=cls_cfg.get("label_smoothing", 0.1),
        )

    if not model.stop_training:
        history2 = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=max_epochs,
            initial_epoch=initial_epoch,
            class_weight=class_weight,
            callbacks=callbacks,
        )

    # Save final state
    final_epoch = max_epochs
    ckpt_mgr.save_training_state(
        epoch=final_epoch, global_step=0,
        best_val_metric=0.0,  # will be overwritten by evaluate
        best_metric_name="val_accuracy",
        seed=seed,
        split_info={
            "train_subjects": len(set(r["subject_id"] for r in train_records)),
            "val_subjects": len(set(r["subject_id"] for r in val_records)),
            "test_subjects": len(set(r["subject_id"] for r in test_records)),
        },
    )

    # Copy best weights to final model dir
    model_dir = resolve_path(cfg["outputs"]["models"]) / "kl_classifier"
    ckpt_mgr.copy_best_to_final(model_dir)

    # Save model config
    model_cfg = get_model_config(model)
    with open(model_dir / "model_config.json", "w", encoding="utf-8") as f:
        json.dump(model_cfg, f, indent=2)

    # Save full Keras model
    try:
        model.save(str(model_dir / "best.keras"))
        print(f"Full Keras model saved to: {model_dir / 'best.keras'}")
    except Exception as e:
        print(f"Warning: Could not save full .keras model: {e}")

    # Export history to CSV
    try:
        import pandas as pd
        # ckpt_mgr.history is stored or read from training_history.json
        hist_path = ckpt_mgr.run_dir / "training_history.json"
        if hist_path.exists():
            with open(hist_path, "r") as hf:
                h_data = json.load(hf)
            hist_df = pd.DataFrame(h_data)
            hist_df.to_csv(model_dir / "history.csv", index=False)
            print(f"Classification training history saved to: {model_dir / 'history.csv'}")
    except Exception:
        pass

    print(f"\n✅ Classification training complete. Run ID: {ckpt_mgr.run_id}")
    print(f"   Best weights: {model_dir / 'best.weights.h5'}")

    return {
        "run_id": ckpt_mgr.run_id,
        "model_dir": str(model_dir),
        "checkpoint_dir": str(ckpt_mgr.run_dir),
    }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    import argparse
    parser = argparse.ArgumentParser(description="KneeAxis KL Classification Training")
    parser.add_argument("--config", type=str, default=None, help="Path to config.yaml")
    parser.add_argument("--resume", type=str, default=None, help="Run ID to resume")
    parser.add_argument("--max-minutes", type=float, default=None, help="Override time limit (minutes)")
    args = parser.parse_args()

    config_path = Path(args.config) if args.config else None
    train_classification(config_path, resume_run_id=args.resume, max_minutes=args.max_minutes)


if __name__ == "__main__":
    main()
