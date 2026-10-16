"""
KneeAxis — Metrics
===================
Shared metric computation for classification and segmentation tasks.
All functions operate on NumPy arrays and are framework-agnostic.
"""

import numpy as np
from typing import Dict, Any, List, Optional


# ---------------------------------------------------------------------------
# Classification metrics
# ---------------------------------------------------------------------------

def classification_report(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: Optional[List[str]] = None,
    num_classes: int = 5,
) -> Dict[str, Any]:
    """
    Compute comprehensive classification metrics for KL grading.

    Parameters
    ----------
    y_true : array of int
        Ground-truth class labels (0–4).
    y_pred : array of int
        Predicted class labels (0–4).
    class_names : list of str, optional
        Names for each class.
    num_classes : int
        Number of classes.

    Returns
    -------
    dict with keys: accuracy, macro_precision, macro_recall, macro_f1,
    quadratic_weighted_kappa, confusion_matrix, per_class, class_distribution
    """
    from sklearn.metrics import (
        accuracy_score,
        precision_score,
        recall_score,
        f1_score,
        confusion_matrix as sk_confusion_matrix,
        cohen_kappa_score,
    )

    if class_names is None:
        class_names = [f"KL{i}" for i in range(num_classes)]

    labels = list(range(num_classes))
    cm = sk_confusion_matrix(y_true, y_pred, labels=labels)
    acc = accuracy_score(y_true, y_pred)
    macro_p = precision_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)
    macro_r = recall_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)
    macro_f1 = f1_score(y_true, y_pred, labels=labels, average="macro", zero_division=0)
    qwk = cohen_kappa_score(y_true, y_pred, weights="quadratic")

    # Per-class
    per_class_p = precision_score(y_true, y_pred, labels=labels, average=None, zero_division=0)
    per_class_r = recall_score(y_true, y_pred, labels=labels, average=None, zero_division=0)
    per_class_f1 = f1_score(y_true, y_pred, labels=labels, average=None, zero_division=0)

    per_class = {}
    for i, name in enumerate(class_names):
        per_class[name] = {
            "precision": round(float(per_class_p[i]), 4),
            "recall": round(float(per_class_r[i]), 4),
            "f1": round(float(per_class_f1[i]), 4),
            "support": int(cm[i].sum()),
        }

    # Class distribution in ground truth
    unique, counts = np.unique(y_true, return_counts=True)
    dist = {class_names[int(u)]: int(c) for u, c in zip(unique, counts) if int(u) < num_classes}

    return {
        "accuracy": round(float(acc), 4),
        "macro_precision": round(float(macro_p), 4),
        "macro_recall": round(float(macro_r), 4),
        "macro_f1": round(float(macro_f1), 4),
        "quadratic_weighted_kappa": round(float(qwk), 4),
        "confusion_matrix": cm.tolist(),
        "per_class": per_class,
        "class_distribution": dist,
        "total_samples": int(len(y_true)),
    }


# ---------------------------------------------------------------------------
# Segmentation metrics
# ---------------------------------------------------------------------------

def dice_coefficient(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    smooth: float = 1e-7,
) -> float:
    """Compute Dice coefficient between two binary masks."""
    intersection = np.sum(y_true * y_pred)
    return float((2.0 * intersection + smooth) / (np.sum(y_true) + np.sum(y_pred) + smooth))


def segmentation_report(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: Optional[Dict[int, str]] = None,
    num_classes: int = 6,
) -> Dict[str, Any]:
    """
    Compute per-class Dice and mean foreground Dice for volumetric segmentation.

    Parameters
    ----------
    y_true : 3D integer array
        Ground-truth label volume.
    y_pred : 3D integer array
        Predicted label volume.
    class_names : dict mapping int → str, optional
    num_classes : int
        Total number of classes including background.

    Returns
    -------
    dict with per_class_dice, mean_foreground_dice, class_names
    """
    if class_names is None:
        class_names = {
            0: "background",
            1: "femur",
            2: "femoral_cartilage",
            3: "tibia",
            4: "medial_tibial_cartilage",
            5: "lateral_tibial_cartilage",
        }

    per_class_dice = {}
    foreground_dices = []

    for cls_id in range(num_classes):
        name = class_names.get(cls_id, f"class_{cls_id}")
        mask_true = (y_true == cls_id).astype(np.float32)
        mask_pred = (y_pred == cls_id).astype(np.float32)

        d = dice_coefficient(mask_true, mask_pred)
        per_class_dice[name] = round(d, 4)

        if cls_id > 0:  # skip background
            foreground_dices.append(d)

    mean_fg_dice = float(np.mean(foreground_dices)) if foreground_dices else 0.0

    return {
        "per_class_dice": per_class_dice,
        "mean_foreground_dice": round(mean_fg_dice, 4),
        "num_classes": num_classes,
    }


def quadratic_weighted_kappa(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute Quadratic Weighted Kappa score."""
    from sklearn.metrics import cohen_kappa_score
    return float(cohen_kappa_score(y_true, y_pred, weights="quadratic"))


def per_class_dice(y_true: np.ndarray, y_pred: np.ndarray, num_classes: int = 6) -> Dict[int, float]:
    """Compute dice coefficient for each class index."""
    dices = {}
    for c in range(num_classes):
        m_t = (y_true == c).astype(np.float32)
        m_p = (y_pred == c).astype(np.float32)
        dices[c] = dice_coefficient(m_t, m_p)
    return dices

