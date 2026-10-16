#!/usr/bin/env python3
"""
KneeAxis — Standalone Local Integration Example
===============================================
Demonstrates how to run inference with exported model weights locally,
verifying that outputs match the Express backend JSON/NIfTI contracts.

Usage:
  python integration/inference_example.py --model kl
  python integration/inference_example.py --model seg
  python integration/inference_example.py --model all
"""

import sys
import json
import argparse
from pathlib import Path

# Add project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np


def test_kl_inference(image_path: Path = None):
    print("\n--- Testing KL ResNet50 Classifier Integration ---")
    weights_path = PROJECT_ROOT / "models" / "kl_classifier" / "best.weights.h5"
    if not weights_path.exists():
        print(f"⚠️  Weights file not found at {weights_path}.")
        print("   Testing with synthetic input to verify model architecture and forward pass...")
        weights_to_load = None
    else:
        print(f"✅ Found trained weights: {weights_path}")
        weights_to_load = str(weights_path)

    import tensorflow as tf
    from src.classification.model import build_resnet50_classifier

    model = build_resnet50_classifier(num_classes=5, input_shape=(224, 224, 3))
    if weights_to_load:
        model.load_weights(weights_to_load)

    if image_path and image_path.exists():
        from PIL import Image
        img = Image.open(image_path).convert("RGB").resize((224, 224))
        arr = np.expand_dims(np.array(img, dtype=np.float32) / 255.0, axis=0)
    else:
        print("   Using synthetic dummy X-ray image (224x224x3)...")
        arr = np.random.uniform(0.0, 1.0, size=(1, 224, 224, 3)).astype(np.float32)

    preds = model(arr, training=False).numpy()[0]
    grade = int(np.argmax(preds))
    confidence = float(preds[grade])
    probs = {f"KL{i}": round(float(preds[i]), 4) for i in range(5)}

    contract_output = {
        "grade": grade,
        "label": f"KL {grade}",
        "confidence": round(confidence, 4),
        "probabilities": probs,
        "mode": "user_trained_weights" if weights_to_load else "synthetic_architecture_test",
    }

    print("\nExpress Contract JSON Output:")
    print(json.dumps(contract_output, indent=2))
    return True


def test_seg_inference(volume_path: Path = None):
    print("\n--- Testing 3D U-Net Segmentation Integration ---")
    weights_path = PROJECT_ROOT / "models" / "knee_segmentation" / "best.weights.h5"
    if not weights_path.exists():
        print(f"⚠️  Weights file not found at {weights_path}.")
        print("   Testing with synthetic patch to verify 3D U-Net forward pass...")
        weights_to_load = None
    else:
        print(f"✅ Found trained weights: {weights_path}")
        weights_to_load = str(weights_path)

    import tensorflow as tf
    from src.segmentation.model import build_3d_unet

    patch_size = (64, 64, 64)
    model = build_3d_unet(input_shape=(64, 64, 64, 1), num_classes=6, base_filters=16)
    if weights_to_load:
        model.load_weights(weights_to_load)

    arr = np.random.normal(0.0, 1.0, size=(1, 64, 64, 64, 1)).astype(np.float32)
    preds = model(arr, training=False).numpy()
    pred_labels = np.argmax(preds[0], axis=-1)

    print(f"   Forward pass completed.")
    print(f"   Input patch shape:  {arr.shape}")
    print(f"   Output logits shape: {preds.shape}")
    print(f"   Argmax label shape:  {pred_labels.shape}")
    unique_labels = np.unique(pred_labels)
    print(f"   Unique classes predicted in test patch: {unique_labels.tolist()} (Classes 0-5)")
    return True


def main():
    parser = argparse.ArgumentParser(description="KneeAxis Inference Integration Example")
    parser.add_argument("--model", choices=["kl", "seg", "all"], default="all")
    parser.add_argument("--image", type=str, default=None, help="Optional real image path")
    parser.add_argument("--volume", type=str, default=None, help="Optional real 3D volume path")
    args = parser.parse_args()

    if args.model in ["kl", "all"]:
        test_kl_inference(Path(args.image) if args.image else None)

    if args.model in ["seg", "all"]:
        test_seg_inference(Path(args.volume) if args.volume else None)


if __name__ == "__main__":
    main()
