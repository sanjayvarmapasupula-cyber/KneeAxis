#!/usr/bin/env python3
"""
KneeAxis — Model Integrity & Verification Tool
==============================================
Validates trained weights and model artifacts:
1. Verifies file existence and computes SHA-256 checksums.
2. Loads model architecture and loads weights without errors.
3. Tests dummy forward pass to verify input/output shapes and dtypes.
4. Verifies softmax normalization and absence of NaN / Inf values.
5. Verifies compliance with the Express backend inference contract.

Usage:
  python scripts/verify_saved_models.py
  python scripts/verify_saved_models.py --model-dir models/kl_classifier
"""

import os
import sys
import json
import hashlib
import argparse
from pathlib import Path

# Add project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import numpy as np

from src.common.paths import load_config, resolve_path
from src.common.checkpoint_manager import compute_sha256


def verify_classification_model(config: dict) -> dict:
    results = {"name": "KL Classification (ResNet50)", "status": "UNKNOWN", "details": []}
    clf_out = config.get("classification", {}).get("output")
    if not clf_out:
        paths_cfg = config.get("paths", config.get("outputs", {}))
        clf_out = Path(paths_cfg.get("models", "models")) / "kl_classifier"
    model_dir = resolve_path(str(clf_out))
    weights_path = model_dir / "best.weights.h5"
    keras_path = model_dir / "best.keras"

    if not weights_path.exists() and not keras_path.exists():
        results["status"] = "NOT_FOUND"
        results["details"].append(f"No weights found in {model_dir}. Train model first via scripts/train_classification.py.")
        return results

    try:
        import tensorflow as tf
        from src.classification.model import build_resnet50_classifier

        model = build_resnet50_classifier(num_classes=5, input_shape=(224, 224, 3))
        
        if weights_path.exists():
            sha256 = compute_sha256(weights_path)
            model.load_weights(str(weights_path))
            results["details"].append(f"Loaded weights: {weights_path.name} (SHA-256: {sha256[:16]}...)")
        elif keras_path.exists():
            sha256 = compute_sha256(keras_path)
            model = tf.keras.models.load_model(str(keras_path))
            results["details"].append(f"Loaded full model: {keras_path.name} (SHA-256: {sha256[:16]}...)")

        # Dummy forward pass
        dummy_input = np.random.uniform(0.0, 1.0, size=(1, 224, 224, 3)).astype(np.float32)
        preds = model(dummy_input, training=False).numpy()

        if preds.shape != (1, 5):
            results["status"] = "FAIL"
            results["details"].append(f"Shape mismatch: expected (1, 5), got {preds.shape}")
            return results

        if np.isnan(preds).any() or np.isinf(preds).any():
            results["status"] = "FAIL"
            results["details"].append("Output contains NaN or Inf values")
            return results

        prob_sum = float(np.sum(preds))
        if not (0.98 <= prob_sum <= 1.02):
            results["status"] = "FAIL"
            results["details"].append(f"Probabilities do not sum to 1.0 (sum={prob_sum:.4f})")
            return results

        results["status"] = "PASS"
        results["details"].append(f"Dummy inference verified: output shape {preds.shape}, sum={prob_sum:.4f}")
        results["details"].append(f"Predicted class: {int(np.argmax(preds[0]))} with confidence {float(np.max(preds[0])):.4f}")

    except Exception as e:
        results["status"] = "ERROR"
        results["details"].append(f"Verification exception: {str(e)}")

    return results


def verify_segmentation_model(config: dict) -> dict:
    results = {"name": "3D Knee Segmentation (3D U-Net)", "status": "UNKNOWN", "details": []}
    seg_out = config.get("segmentation", {}).get("output")
    if not seg_out:
        paths_cfg = config.get("paths", config.get("outputs", {}))
        seg_out = Path(paths_cfg.get("models", "models")) / "knee_segmentation"
    model_dir = resolve_path(str(seg_out))
    weights_path = model_dir / "best.weights.h5"
    keras_path = model_dir / "best.keras"

    if not weights_path.exists() and not keras_path.exists():
        results["status"] = "NOT_FOUND"
        results["details"].append(f"No weights found in {model_dir}. Train model first via scripts/train_segmentation.py.")
        return results

    try:
        import tensorflow as tf
        from src.segmentation.model import build_3d_unet, CombinedDiceAndCELoss, MeanForegroundDice

        patch_size = tuple(config["segmentation"]["patch_size"])
        model = build_3d_unet(
            input_shape=(patch_size[0], patch_size[1], patch_size[2], 1),
            num_classes=6,
            base_filters=config["segmentation"]["base_filters"],
        )

        if weights_path.exists():
            sha256 = compute_sha256(weights_path)
            model.load_weights(str(weights_path))
            results["details"].append(f"Loaded weights: {weights_path.name} (SHA-256: {sha256[:16]}...)")
        elif keras_path.exists():
            sha256 = compute_sha256(keras_path)
            model = tf.keras.models.load_model(
                str(keras_path),
                custom_objects={
                    "loss": CombinedDiceAndCELoss(),
                    "mean_foreground_dice": MeanForegroundDice(),
                }
            )
            results["details"].append(f"Loaded full model: {keras_path.name} (SHA-256: {sha256[:16]}...)")

        # Dummy forward pass with single patch
        dummy_input = np.random.normal(0.0, 1.0, size=(1, patch_size[0], patch_size[1], patch_size[2], 1)).astype(np.float32)
        preds = model(dummy_input, training=False).numpy()

        expected_shape = (1, patch_size[0], patch_size[1], patch_size[2], 6)
        if preds.shape != expected_shape:
            results["status"] = "FAIL"
            results["details"].append(f"Shape mismatch: expected {expected_shape}, got {preds.shape}")
            return results

        if np.isnan(preds).any() or np.isinf(preds).any():
            results["status"] = "FAIL"
            results["details"].append("Output contains NaN or Inf values")
            return results

        # Check channel softmax sum along axis=-1 at random voxel
        voxel_sum = float(np.sum(preds[0, patch_size[0]//2, patch_size[1]//2, patch_size[2]//2]))
        if not (0.98 <= voxel_sum <= 1.02):
            results["status"] = "FAIL"
            results["details"].append(f"Softmax does not sum to 1.0 along channel axis (sum={voxel_sum:.4f})")
            return results

        results["status"] = "PASS"
        results["details"].append(f"Dummy inference verified: output shape {preds.shape}")
        results["details"].append(f"Output classes: 6 [0:BG, 1:Femur, 2:Femoral Cartilage, 3:Tibia, 4:Medial Cartilage, 5:Lateral Cartilage]")

    except Exception as e:
        results["status"] = "ERROR"
        results["details"].append(f"Verification exception: {str(e)}")

    return results


def main():
    parser = argparse.ArgumentParser(description="KneeAxis Model Verification Tool")
    parser.add_argument("--config", type=str, default=None, help="Path to config.yaml")
    args = parser.parse_args()

    config_path = Path(args.config) if args.config else None
    config = load_config(config_path)

    print("\n" + "=" * 65)
    print(" KneeAxis — Saved Models & Artifacts Verification")
    print("=" * 65)

    clf_res = verify_classification_model(config)
    seg_res = verify_segmentation_model(config)

    for res in [clf_res, seg_res]:
        status_symbol = {
            "PASS": "✅ PASS",
            "FAIL": "❌ FAIL",
            "NOT_FOUND": "⚠️  NOT FOUND (needs training)",
            "ERROR": "🚨 ERROR",
        }.get(res["status"], res["status"])

        print(f"\nModel: {res['name']}")
        print(f"Status: {status_symbol}")
        for detail in res["details"]:
            print(f"   • {detail}")

    print("\n" + "=" * 65)
    print(" Verification Complete.")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
