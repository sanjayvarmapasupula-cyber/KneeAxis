"""
KneeAxis — 3D U-Net Segmentation Training Script
==================================================
Canonical training implementation for 3D knee MRI segmentation.
Supports time-limited training, patch-based input, checkpointing, and resume.
"""

import os
import sys
import json
import time
from pathlib import Path
from typing import Optional, Dict, Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import numpy as np
import tensorflow as tf

from src.common.paths import load_config, resolve_path, ensure_directories
from src.common.gpu_utils import configure_gpu_memory_growth
from src.common.checkpoint_manager import CheckpointManager
from src.segmentation.model import build_3d_unet, get_model_config, validate_patch_size
from src.segmentation.preprocessing import (
    load_oaizib_manifest, build_tf_dataset_3d,
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


def train_segmentation(
    config_path: Optional[Path] = None,
    resume_run_id: Optional[str] = None,
    max_minutes: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Train the 3D U-Net segmentation model on OAIZIB-CM data.
    """
    configure_gpu_memory_growth()

    cfg = load_config(config_path)
    ensure_directories(cfg)

    seg_cfg = cfg.get("segmentation", {})
    train_cfg = cfg.get("training", {})

    time_limit = max_minutes or train_cfg.get("max_minutes", 60)
    seed = train_cfg.get("seed", 42)
    np.random.seed(seed)
    tf.random.set_seed(seed)

    # Load manifest
    manifest_path = resolve_path(cfg["manifests"]["oaizib"])
    records = load_oaizib_manifest(manifest_path)
    if not records:
        raise ValueError(f"No valid records found in manifest: {manifest_path}")

    # OAIZIB-CM provides its own train/test split via imagesTr/imagesTs
    # The manifest should reflect this. We use imagesTr for train+val, imagesTs for test.
    train_records = [r for r in records if "Tr" in r["image"] or "train" in r["image"].lower()]
    test_records = [r for r in records if "Ts" in r["image"] or "test" in r["image"].lower()]

    # If the naming convention doesn't match, use all records and split 80/20
    if not train_records:
        print("NOTE: Could not detect Tr/Ts split from filenames. Using 80/20 split.")
        np.random.shuffle(records)
        split_idx = int(len(records) * 0.8)
        train_records = records[:split_idx]
        test_records = records[split_idx:]

    # Further split training into train/val (90/10)
    np.random.shuffle(train_records)
    val_split = int(len(train_records) * 0.9)
    val_records = train_records[val_split:]
    train_records = train_records[:val_split]

    print(f"Data split: Train={len(train_records)}, Val={len(val_records)}, Test={len(test_records)}")

    # Patch and model config
    patch_size = tuple(seg_cfg.get("patch_size", [96, 96, 96]))
    num_classes = seg_cfg.get("num_classes", 6)
    batch_size = seg_cfg.get("batch_size", 2)
    encoder_filters = seg_cfg.get("encoder_filters", [32, 64, 128, 256])
    bottleneck = seg_cfg.get("bottleneck_filters", 512)

    # Validate patch dimensions
    num_pools = len(encoder_filters)
    if not validate_patch_size(list(patch_size), num_pools):
        raise ValueError(
            f"Patch size {patch_size} is incompatible with {num_pools}-level U-Net. "
            f"Each dimension must be divisible by {2**num_pools}."
        )

    # Build datasets
    normalisation = seg_cfg.get("normalisation", "z_score")
    clip_pct = seg_cfg.get("clip_percentile", [0.5, 99.5])
    clip_pct = tuple(clip_pct) if clip_pct else None

    train_ds = build_tf_dataset_3d(
        train_records, patch_size, batch_size=batch_size,
        patches_per_volume=seg_cfg.get("patches_per_volume", 8),
        foreground_ratio=seg_cfg.get("foreground_ratio", 0.5),
        num_classes=num_classes,
        normalisation=normalisation, clip_percentile=clip_pct,
        prefetch=seg_cfg.get("prefetch_buffer", 2),
    )
    val_ds = build_tf_dataset_3d(
        val_records, patch_size, batch_size=batch_size,
        patches_per_volume=seg_cfg.get("patches_per_volume", 8),
        foreground_ratio=0.5, num_classes=num_classes,
        normalisation=normalisation, clip_percentile=clip_pct,
        prefetch=seg_cfg.get("prefetch_buffer", 2),
    )

    # Checkpoint manager
    ckpt_dir = resolve_path(cfg["outputs"]["checkpoints"]) / "segmentation"

    if resume_run_id:
        ckpt_mgr = CheckpointManager(ckpt_dir, run_id=resume_run_id)
        if not ckpt_mgr.can_resume():
            print(f"WARNING: Cannot resume from {resume_run_id}. Starting new run.")
            ckpt_mgr = CheckpointManager(ckpt_dir)
    else:
        ckpt_mgr = CheckpointManager(ckpt_dir)

    print(f"\n{'='*60}")
    print(f"  KneeAxis 3D U-Net Segmentation Training")
    print(f"  Run ID: {ckpt_mgr.run_id}")
    print(f"  Patch Size: {patch_size}")
    print(f"  Batch Size: {batch_size}")
    print(f"  Time Limit: {time_limit} minutes")
    print(f"{'='*60}\n")

    # Build model
    model = build_3d_unet(
        input_shape=(*patch_size, 1),
        num_classes=num_classes,
        encoder_filters=encoder_filters,
        bottleneck_filters=bottleneck,
        learning_rate=seg_cfg.get("learning_rate", 1e-4),
    )
    model.summary(print_fn=lambda x: print(x))

    # Resume if available
    initial_epoch = 0
    prev_state = ckpt_mgr.load_training_state()
    if prev_state and ckpt_mgr.latest_path.is_file():
        print(f"Resuming from epoch {prev_state['epoch']} of run {ckpt_mgr.run_id}")
        print("NOTE: Optimizer state is NOT restored from weights-only checkpoint.")
        model.load_weights(str(ckpt_mgr.latest_path))
        initial_epoch = prev_state["epoch"]

    # Callbacks
    steps_per_epoch = seg_cfg.get("steps_per_epoch", 50)
    validation_steps = seg_cfg.get("validation_steps", 10)

    callbacks = [
        TimeLimitCallback(max_minutes=time_limit),
        tf.keras.callbacks.ModelCheckpoint(
            filepath=str(ckpt_mgr.best_path),
            monitor="val_mean_fg_dice",
            mode="max",
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
            monitor="val_loss", factor=0.5, patience=10, min_lr=1e-7, verbose=1,
        ),
    ]

    max_epochs = seg_cfg.get("epochs", 200)

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=max_epochs,
        initial_epoch=initial_epoch,
        steps_per_epoch=steps_per_epoch,
        validation_steps=validation_steps,
        callbacks=callbacks,
    )

    # Save final state
    ckpt_mgr.save_training_state(
        epoch=len(history.history.get("loss", [])) + initial_epoch,
        global_step=0,
        best_val_metric=max(history.history.get("val_mean_fg_dice", [0])),
        best_metric_name="val_mean_fg_dice",
        seed=seed,
        split_info={
            "train_cases": len(train_records),
            "val_cases": len(val_records),
            "test_cases": len(test_records),
        },
    )
    ckpt_mgr.save_history(history.history)

    # Copy best weights to model dir
    model_dir = resolve_path(cfg["outputs"]["models"]) / "knee_segmentation"
    ckpt_mgr.copy_best_to_final(model_dir)

    # Save config
    model_cfg = get_model_config(model)
    with open(model_dir / "model_config.json", "w", encoding="utf-8") as f:
        json.dump(model_cfg, f, indent=2)

    # Save full Keras model
    try:
        model.save(str(model_dir / "best.keras"))
        print(f"Full Keras model saved to: {model_dir / 'best.keras'}")
    except Exception as e:
        print(f"Notice: Could not serialize full .keras architecture directly: {e}")

    # Export history to CSV
    try:
        import pandas as pd
        hist_df = pd.DataFrame(history.history)
        hist_df.to_csv(model_dir / "history.csv", index=False)
        print(f"Training history saved to: {model_dir / 'history.csv'}")
    except Exception:
        pass

    print(f"\n✅ Segmentation training complete. Run ID: {ckpt_mgr.run_id}")
    print(f"   Best weights: {model_dir / 'best.weights.h5'}")

    return {
        "run_id": ckpt_mgr.run_id,
        "model_dir": str(model_dir),
        "checkpoint_dir": str(ckpt_mgr.run_dir),
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="KneeAxis 3D Segmentation Training")
    parser.add_argument("--config", type=str, default=None)
    parser.add_argument("--resume", type=str, default=None)
    parser.add_argument("--max-minutes", type=float, default=None)
    args = parser.parse_args()

    config_path = Path(args.config) if args.config else None
    train_segmentation(config_path, resume_run_id=args.resume, max_minutes=args.max_minutes)


if __name__ == "__main__":
    main()
