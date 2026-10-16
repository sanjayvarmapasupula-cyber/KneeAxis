"""
KneeAxis — Volumetric Segmentation Inference (Standalone)
==========================================================
Predict segmentation for a single MRI volume.
Outputs prediction.nii.gz preserving source spatial metadata.
Compatible with the Express backend integration contract.
"""

import sys
import json
import argparse
from pathlib import Path

import numpy as np


def predict_volume(
    image_path: str,
    weights_path: str,
    output_path: str,
    patch_size: tuple = (96, 96, 96),
    num_classes: int = 6,
    normalisation: str = "z_score",
) -> dict:
    """
    Run full-volume segmentation inference.

    Returns
    -------
    dict with case metadata and per-class voxel counts.
    """
    import tensorflow as tf
    import SimpleITK as sitk

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
    from src.segmentation.model import build_3d_unet
    from src.segmentation.preprocessing import normalise_volume
    from src.segmentation.evaluate import predict_full_volume

    # Load source image
    src_img = sitk.ReadImage(image_path)
    img_arr = sitk.GetArrayFromImage(src_img).astype(np.float32)
    img_norm = normalise_volume(img_arr, method=normalisation)

    # Build and load model
    encoder_filters = [32, 64, 128, 256]
    model = build_3d_unet(
        input_shape=(*patch_size, 1),
        num_classes=num_classes,
        encoder_filters=encoder_filters,
    )
    model.load_weights(weights_path)

    # Predict
    pred = predict_full_volume(model, img_norm, patch_size, num_classes)

    # Save prediction preserving spatial metadata
    pred_img = sitk.GetImageFromArray(pred.astype(np.uint8))
    pred_img.SetSpacing(src_img.GetSpacing())
    pred_img.SetOrigin(src_img.GetOrigin())
    pred_img.SetDirection(src_img.GetDirection())

    output_p = Path(output_path)
    output_p.parent.mkdir(parents=True, exist_ok=True)
    sitk.WriteImage(pred_img, str(output_p))

    # Compute per-class stats
    class_names = {
        0: "background", 1: "femur", 2: "femoral_cartilage",
        3: "tibia", 4: "medial_tibial_cartilage", 5: "lateral_tibial_cartilage",
    }
    spacing = src_img.GetSpacing()
    voxel_vol = float(spacing[0] * spacing[1] * spacing[2])

    structures = {}
    for cls_id, name in class_names.items():
        if cls_id == 0:
            continue
        count = int(np.sum(pred == cls_id))
        structures[name] = {
            "voxel_count": count,
            "volume_mm3": round(count * voxel_vol, 2),
        }

    return {
        "output_file": str(output_p),
        "shape": list(pred.shape),
        "spacing_mm": list(spacing),
        "structures": structures,
        "mode": "user_trained_weights",
    }


def main():
    parser = argparse.ArgumentParser(description="KneeAxis Volume Segmentation Prediction")
    parser.add_argument("--image", required=True, help="Path to input MRI volume (NIfTI)")
    parser.add_argument("--weights", required=True, help="Path to model weights (.h5)")
    parser.add_argument("--output", required=True, help="Path for prediction.nii.gz")
    parser.add_argument("--patch-size", type=int, nargs=3, default=[96, 96, 96])
    parser.add_argument("--num-classes", type=int, default=6)
    args = parser.parse_args()

    try:
        result = predict_volume(
            args.image, args.weights, args.output,
            patch_size=tuple(args.patch_size),
            num_classes=args.num_classes,
        )
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
