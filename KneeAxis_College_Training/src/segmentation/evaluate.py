"""
KneeAxis — Segmentation Evaluation
=====================================
Evaluate a trained 3D U-Net on OAIZIB-CM test volumes.
Computes per-class Dice and mean foreground Dice on full volumes.
"""

import sys
import json
from pathlib import Path
from typing import Optional, Dict, Any

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.common.paths import load_config, resolve_path
from src.common.gpu_utils import configure_gpu_memory_growth
from src.common.metrics import segmentation_report
from src.segmentation.preprocessing import (
    load_oaizib_manifest, load_volume_pair, normalise_volume,
)


def predict_full_volume(
    model,
    image: np.ndarray,
    patch_size: tuple,
    num_classes: int = 6,
    overlap: float = 0.5,
) -> np.ndarray:
    """
    Predict on a full volume using a sliding-window approach with overlap.

    Parameters
    ----------
    model : keras Model
    image : (D, H, W) float32 normalised volume
    patch_size : (pd, ph, pw)
    num_classes : int
    overlap : float
        Fraction of patch overlap (0.5 = 50%).

    Returns
    -------
    prediction : (D, H, W) int32 label map
    """
    D, H, W = image.shape
    pd, ph, pw = patch_size
    stride = [int(s * (1 - overlap)) for s in patch_size]

    # Pad volume if needed
    pad_d = max(0, pd - D)
    pad_h = max(0, ph - H)
    pad_w = max(0, pw - W)
    if pad_d > 0 or pad_h > 0 or pad_w > 0:
        image = np.pad(image, ((0, pad_d), (0, pad_h), (0, pad_w)), mode="constant")
    D_p, H_p, W_p = image.shape

    # Accumulate softmax probabilities
    prob_vol = np.zeros((D_p, H_p, W_p, num_classes), dtype=np.float32)
    count_vol = np.zeros((D_p, H_p, W_p), dtype=np.float32)

    for z0 in range(0, D_p - pd + 1, stride[0]):
        for y0 in range(0, H_p - ph + 1, stride[1]):
            for x0 in range(0, W_p - pw + 1, stride[2]):
                patch = image[z0:z0+pd, y0:y0+ph, x0:x0+pw]
                patch_input = patch[np.newaxis, ..., np.newaxis]  # (1, D, H, W, 1)

                pred = model.predict(patch_input, verbose=0)[0]  # (D, H, W, C)
                prob_vol[z0:z0+pd, y0:y0+ph, x0:x0+pw] += pred
                count_vol[z0:z0+pd, y0:y0+ph, x0:x0+pw] += 1.0

    # Average overlapping predictions
    count_vol = np.maximum(count_vol, 1.0)
    prob_vol /= count_vol[..., np.newaxis]

    # Argmax to get label map
    prediction = np.argmax(prob_vol, axis=-1).astype(np.int32)

    # Remove padding
    prediction = prediction[:D_p - pad_d, :H_p - pad_h, :W_p - pad_w]

    return prediction


def evaluate_segmentation(
    config_path: Optional[Path] = None,
    weights_path: Optional[Path] = None,
    save_predictions: bool = True,
) -> Dict[str, Any]:
    """
    Evaluate the 3D U-Net on OAIZIB-CM test volumes.
    """
    configure_gpu_memory_growth()
    import tensorflow as tf

    cfg = load_config(config_path)
    seg_cfg = cfg.get("segmentation", {})

    # Resolve weights
    if weights_path is None:
        weights_path = resolve_path(cfg["outputs"]["models"]) / "knee_segmentation" / "best.weights.h5"
    weights_path = Path(weights_path)

    if not weights_path.is_file():
        raise FileNotFoundError(
            f"Model weights not found: {weights_path}\n"
            "Train the model first or provide a valid --weights path."
        )

    # Load manifest (test set only)
    manifest_path = resolve_path(cfg["manifests"]["oaizib"])
    all_records = load_oaizib_manifest(manifest_path)

    test_records = [r for r in all_records if "Ts" in r["image"] or "test" in r["image"].lower()]
    if not test_records:
        # Fallback: use last 20% of records
        split_idx = int(len(all_records) * 0.8)
        test_records = all_records[split_idx:]

    if not test_records:
        raise ValueError("No test records found.")

    # Build model and load weights
    patch_size = tuple(seg_cfg.get("patch_size", [96, 96, 96]))
    num_classes = seg_cfg.get("num_classes", 6)

    from src.segmentation.model import build_3d_unet
    model = build_3d_unet(
        input_shape=(*patch_size, 1),
        num_classes=num_classes,
        encoder_filters=seg_cfg.get("encoder_filters", [32, 64, 128, 256]),
        bottleneck_filters=seg_cfg.get("bottleneck_filters", 512),
    )
    model.load_weights(str(weights_path))
    print(f"Loaded weights from: {weights_path}")

    normalisation = seg_cfg.get("normalisation", "z_score")
    clip_pct = seg_cfg.get("clip_percentile", [0.5, 99.5])
    clip_pct = tuple(clip_pct) if clip_pct else None

    class_names = {int(k): v for k, v in seg_cfg.get("class_names", {
        0: "background", 1: "femur", 2: "femoral_cartilage",
        3: "tibia", 4: "medial_tibial_cartilage", 5: "lateral_tibial_cartilage"
    }).items()}

    all_reports = []
    output_dir = resolve_path(cfg["outputs"]["segmentation"])
    output_dir.mkdir(parents=True, exist_ok=True)

    for rec in test_records:
        print(f"\nEvaluating: {rec['case_id']}")
        try:
            img, lbl, metadata = load_volume_pair(rec["image"], rec["label"])
            img_norm = normalise_volume(img, method=normalisation, clip_percentile=clip_pct)

            pred = predict_full_volume(model, img_norm, patch_size, num_classes)

            report = segmentation_report(lbl, pred, class_names, num_classes)
            report["case_id"] = rec["case_id"]
            all_reports.append(report)

            print(f"  Mean FG Dice: {report['mean_foreground_dice']:.4f}")
            for name, dice in report["per_class_dice"].items():
                if name != "background":
                    print(f"    {name}: {dice:.4f}")

            # Save prediction as NIfTI
            if save_predictions:
                import SimpleITK as sitk
                pred_img = sitk.GetImageFromArray(pred.astype(np.uint8))
                # Preserve spatial metadata from source
                src_img = sitk.ReadImage(rec["image"])
                pred_img.SetSpacing(src_img.GetSpacing())
                pred_img.SetOrigin(src_img.GetOrigin())
                pred_img.SetDirection(src_img.GetDirection())

                pred_path = output_dir / f"{rec['case_id']}_prediction.nii.gz"
                sitk.WriteImage(pred_img, str(pred_path))
                print(f"  Saved prediction: {pred_path}")

        except Exception as e:
            print(f"  ERROR: {e}")
            continue

    # Aggregate metrics
    if all_reports:
        mean_dices = {}
        for name in class_names.values():
            if name == "background":
                continue
            dices = [r["per_class_dice"].get(name, 0) for r in all_reports]
            mean_dices[name] = round(float(np.mean(dices)), 4)

        fg_dices = [r["mean_foreground_dice"] for r in all_reports]
        overall = {
            "mean_per_class_dice": mean_dices,
            "mean_foreground_dice": round(float(np.mean(fg_dices)), 4),
            "std_foreground_dice": round(float(np.std(fg_dices)), 4),
            "num_cases": len(all_reports),
            "per_case": all_reports,
        }
    else:
        overall = {"error": "No cases evaluated successfully.", "num_cases": 0}

    # Print summary
    print(f"\n{'='*60}")
    print(f"  Segmentation Evaluation Summary")
    print(f"{'='*60}")
    if "mean_foreground_dice" in overall:
        print(f"  Cases Evaluated: {overall['num_cases']}")
        print(f"  Mean FG Dice:    {overall['mean_foreground_dice']:.4f} ± {overall['std_foreground_dice']:.4f}")
        for name, d in overall["mean_per_class_dice"].items():
            print(f"    {name}: {d:.4f}")
    print(f"{'='*60}\n")

    # Save metrics
    eval_dir = resolve_path(cfg["outputs"]["evaluations"])
    eval_dir.mkdir(parents=True, exist_ok=True)
    metrics_file = eval_dir / "segmentation_metrics.json"
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(overall, f, indent=2, default=str)
    print(f"Metrics saved to: {metrics_file}")

    final_metrics_path = weights_path.parent / "metrics.json"
    with open(final_metrics_path, "w", encoding="utf-8") as f:
        json.dump(overall, f, indent=2, default=str)
    print(f"Model metrics saved to: {final_metrics_path}")

    return overall


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate 3D Segmentation Model")
    parser.add_argument("--config", type=str, default=None)
    parser.add_argument("--weights", type=str, default=None)
    parser.add_argument("--no-save-predictions", action="store_true")
    args = parser.parse_args()

    evaluate_segmentation(
        config_path=Path(args.config) if args.config else None,
        weights_path=Path(args.weights) if args.weights else None,
        save_predictions=not args.no_save_predictions,
    )


if __name__ == "__main__":
    main()
