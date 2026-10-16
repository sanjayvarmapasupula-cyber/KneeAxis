"""
KneeAxis — Classification Inference (Standalone)
==================================================
Predict KL grade for a single knee radiograph.
Compatible with the Express backend integration contract.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Optional

import numpy as np


def predict_kl(
    image_path: str,
    weights_path: str,
    image_size: int = 224,
) -> dict:
    """
    Run KL grade inference on a single image.

    Returns
    -------
    dict with grade, label, confidence, probabilities
    """
    import tensorflow as tf
    from PIL import Image

    weights = Path(weights_path)
    if not weights.is_file():
        raise FileNotFoundError(f"Weights file not found: {weights}")

    img = Image.open(image_path).convert("RGB").resize((image_size, image_size))
    arr = np.expand_dims(np.array(img, dtype=np.float32), axis=0)
    # Note: preprocess_input is applied inside the model architecture

    # Try loading as full model first, then as weights
    try:
        model = tf.keras.models.load_model(str(weights))
    except Exception:
        from src.classification.model import build_resnet50_classifier
        model = build_resnet50_classifier(
            input_shape=(image_size, image_size, 3),
            num_classes=5,
            freeze_backbone=False,
        )
        model.load_weights(str(weights))

    preds = model.predict(arr, verbose=0)[0]
    grade = int(np.argmax(preds))
    confidence = float(preds[grade])

    kl_labels = {
        0: "KL 0 - Normal",
        1: "KL 1 - Doubtful",
        2: "KL 2 - Minimal",
        3: "KL 3 - Moderate",
        4: "KL 4 - Severe",
    }

    return {
        "grade": grade,
        "label": kl_labels[grade],
        "confidence": round(confidence, 4),
        "probabilities": {f"KL{i}": round(float(preds[i]), 4) for i in range(5)},
        "mode": "user_trained_weights",
    }


def main():
    parser = argparse.ArgumentParser(description="KneeAxis KL Grade Prediction")
    parser.add_argument("--image", required=True, help="Path to knee radiograph")
    parser.add_argument("--weights", required=True, help="Path to model weights (.h5 or .keras)")
    parser.add_argument("--image-size", type=int, default=224)
    args = parser.parse_args()

    try:
        result = predict_kl(args.image, args.weights, args.image_size)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
