"""
KneeAxis — Classification Evaluation
=======================================
Evaluate a trained ResNet50 KL classifier on test and validation sets.
"""

import sys
import json
from pathlib import Path
from typing import Optional, Dict, Any

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from src.common.paths import load_config, resolve_path
from src.common.gpu_utils import configure_gpu_memory_growth
from src.common.metrics import classification_report
from src.classification.preprocessing import load_manifest, split_by_subject, build_tf_dataset


def evaluate_classification(
    config_path: Optional[Path] = None,
    weights_path: Optional[Path] = None,
    dataset: str = "test",  # "test" | "most"
) -> Dict[str, Any]:
    """
    Evaluate the trained KL classifier.

    Parameters
    ----------
    config_path : Path, optional
    weights_path : Path, optional
        Explicit path to weights file. If None, uses models/kl_classifier/best.weights.h5.
    dataset : str
        "test" for OAI test set, "most" for MOST external validation.

    Returns
    -------
    dict with all classification metrics.
    """
    configure_gpu_memory_growth()
    import tensorflow as tf

    cfg = load_config(config_path)
    cls_cfg = cfg.get("classification", {})
    seed = cfg.get("training", {}).get("seed", 42)

    # Resolve weights
    if weights_path is None:
        weights_path = resolve_path(cfg["outputs"]["models"]) / "kl_classifier" / "best.weights.h5"
    weights_path = Path(weights_path)

    if not weights_path.is_file():
        raise FileNotFoundError(
            f"Model weights not found: {weights_path}\n"
            "Train the model first or provide a valid --weights path."
        )

    image_size = cls_cfg.get("image_size", 224)
    batch_size = cls_cfg.get("batch_size", 16)

    # Load data
    if dataset == "most":
        manifest_path = resolve_path(cfg["manifests"]["most"])
        records = load_manifest(manifest_path)
        eval_records = records  # Use all MOST data for external validation
        dataset_label = "MOST (External Validation)"
    else:
        manifest_path = resolve_path(cfg["manifests"]["oai"])
        records = load_manifest(manifest_path)
        _, _, eval_records = split_by_subject(
            records,
            train_ratio=cls_cfg.get("split", {}).get("train_ratio", 0.7),
            val_ratio=cls_cfg.get("split", {}).get("val_ratio", 0.15),
            test_ratio=cls_cfg.get("split", {}).get("test_ratio", 0.15),
            seed=seed,
        )
        dataset_label = "OAI Test Set"

    if not eval_records:
        raise ValueError(f"No records to evaluate for dataset '{dataset}'.")

    # Build dataset
    eval_ds = build_tf_dataset(
        eval_records, image_size=image_size, batch_size=batch_size,
        augment=False, shuffle=False,
    )

    # Build and load model
    from src.classification.model import build_resnet50_classifier
    model = build_resnet50_classifier(
        input_shape=(image_size, image_size, 3),
        num_classes=5,
        freeze_backbone=False,
    )
    model.load_weights(str(weights_path))
    print(f"Loaded weights from: {weights_path}")

    # Predict
    print(f"Evaluating on {dataset_label} ({len(eval_records)} images)...")
    all_preds = []
    all_labels = []

    for batch_images, batch_labels in eval_ds:
        preds = model.predict(batch_images, verbose=0)
        all_preds.append(np.argmax(preds, axis=1))
        all_labels.append(np.argmax(batch_labels.numpy(), axis=1))

    y_pred = np.concatenate(all_preds)
    y_true = np.concatenate(all_labels)

    # Compute metrics
    class_names = cls_cfg.get("class_names", [f"KL{i}" for i in range(5)])
    report = classification_report(y_true, y_pred, class_names=class_names)
    report["dataset"] = dataset_label
    report["weights_file"] = str(weights_path)

    # Print summary
    print(f"\n{'='*60}")
    print(f"  Classification Evaluation — {dataset_label}")
    print(f"{'='*60}")
    print(f"  Accuracy:                {report['accuracy']:.4f}")
    print(f"  Macro Precision:         {report['macro_precision']:.4f}")
    print(f"  Macro Recall:            {report['macro_recall']:.4f}")
    print(f"  Macro F1:                {report['macro_f1']:.4f}")
    print(f"  Quadratic Weighted Kappa:{report['quadratic_weighted_kappa']:.4f}")
    print(f"  Total Samples:           {report['total_samples']}")
    print(f"\n  Confusion Matrix:")
    for row in report["confusion_matrix"]:
        print(f"    {row}")
    print(f"{'='*60}\n")

    # Save metrics
    eval_dir = resolve_path(cfg["outputs"]["evaluations"])
    eval_dir.mkdir(parents=True, exist_ok=True)
    metrics_file = eval_dir / f"kl_classification_{dataset}_metrics.json"
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"Metrics saved to: {metrics_file}")

    if dataset == "test":
        final_metrics_path = weights_path.parent / "metrics.json"
        with open(final_metrics_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"Model metrics saved to: {final_metrics_path}")

    return report


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate KL Classification Model")
    parser.add_argument("--config", type=str, default=None)
    parser.add_argument("--weights", type=str, default=None)
    parser.add_argument("--dataset", type=str, default="test", choices=["test", "most"])
    args = parser.parse_args()

    evaluate_classification(
        config_path=Path(args.config) if args.config else None,
        weights_path=Path(args.weights) if args.weights else None,
        dataset=args.dataset,
    )


if __name__ == "__main__":
    main()
