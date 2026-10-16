"""
KneeAxis — Classification Preprocessing
==========================================
Dataset loading, manifest parsing, subject-level splitting,
and tf.data pipeline construction for KL grading.
"""

import csv
import random
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict

import numpy as np


def load_manifest(manifest_path: Path) -> List[Dict[str, Any]]:
    """
    Load a CSV manifest with columns: path, subject_id, grade.

    Validates:
      - File exists
      - Required columns present
      - Grade values are integers 0–4
      - Image files exist on disk

    Returns list of dicts: [{"path": ..., "subject_id": ..., "grade": int}, ...]
    """
    manifest_path = Path(manifest_path)
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    records = []
    errors = []

    with open(manifest_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        required = {"path", "subject_id", "grade"}
        if not required.issubset(set(reader.fieldnames or [])):
            missing = required - set(reader.fieldnames or [])
            raise ValueError(
                f"Manifest is missing required columns: {missing}. "
                f"Found: {reader.fieldnames}"
            )

        for i, row in enumerate(reader):
            try:
                grade = int(row["grade"])
            except (ValueError, TypeError):
                errors.append(f"Row {i+2}: invalid grade '{row['grade']}'")
                continue

            if grade < 0 or grade > 4:
                errors.append(f"Row {i+2}: grade {grade} out of range 0–4")
                continue

            raw_path = row["path"].strip()
            norm_path = raw_path.replace("\\", "/")
            img_path = Path(norm_path)
            if not img_path.is_file():
                from src.common.paths import PROJECT_ROOT
                candidate = (PROJECT_ROOT / norm_path).resolve()
                if candidate.is_file():
                    img_path = candidate
                else:
                    errors.append(f"Row {i+2}: file not found: {raw_path}")
                    continue

            records.append({
                "path": str(img_path),
                "subject_id": row["subject_id"].strip(),
                "grade": grade,
            })

    if errors:
        print(f"WARNING: {len(errors)} manifest errors:")
        for e in errors[:20]:
            print(f"  {e}")
        if len(errors) > 20:
            print(f"  ... and {len(errors) - 20} more")

    return records


def split_by_subject(
    records: List[Dict[str, Any]],
    train_ratio: float = 0.7,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> Tuple[List[Dict], List[Dict], List[Dict]]:
    """
    Split records into train/val/test sets by subject_id to prevent patient leakage.

    All images from the same subject go into the same split.
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-6, \
        "Split ratios must sum to 1.0"

    # Group records by subject
    subject_records = defaultdict(list)
    for rec in records:
        subject_records[rec["subject_id"]].append(rec)

    subjects = sorted(subject_records.keys())
    random.seed(seed)
    random.shuffle(subjects)

    n = len(subjects)
    n_train = int(n * train_ratio)
    n_val = int(n * val_ratio)

    train_subjects = set(subjects[:n_train])
    val_subjects = set(subjects[n_train:n_train + n_val])
    test_subjects = set(subjects[n_train + n_val:])

    train = [r for s in train_subjects for r in subject_records[s]]
    val = [r for s in val_subjects for r in subject_records[s]]
    test = [r for s in test_subjects for r in subject_records[s]]

    split_info = {
        "total_subjects": n,
        "train_subjects": len(train_subjects),
        "val_subjects": len(val_subjects),
        "test_subjects": len(test_subjects),
        "train_images": len(train),
        "val_images": len(val),
        "test_images": len(test),
        "seed": seed,
    }

    print(f"Split by subject ID (seed={seed}):")
    print(f"  Train: {len(train_subjects)} subjects, {len(train)} images")
    print(f"  Val:   {len(val_subjects)} subjects, {len(val)} images")
    print(f"  Test:  {len(test_subjects)} subjects, {len(test)} images")

    return train, val, test


def compute_class_weights(records: List[Dict], num_classes: int = 5) -> Dict[int, float]:
    """
    Compute balanced class weights inversely proportional to class frequency.
    """
    counts = np.zeros(num_classes, dtype=np.float64)
    for r in records:
        counts[r["grade"]] += 1

    total = counts.sum()
    weights = {}
    for i in range(num_classes):
        if counts[i] > 0:
            weights[i] = total / (num_classes * counts[i])
        else:
            weights[i] = 1.0

    return weights


def build_tf_dataset(
    records: List[Dict],
    image_size: int = 224,
    batch_size: int = 16,
    num_classes: int = 5,
    augment: bool = False,
    shuffle: bool = False,
    shuffle_buffer: int = 1000,
    prefetch: int = 2,
    aug_config: Optional[Dict] = None,
):
    """
    Build a tf.data.Dataset from manifest records.

    Parameters
    ----------
    records : list of dict
        Each dict has "path" and "grade".
    image_size : int
        Target square image dimension.
    batch_size : int
    num_classes : int
    augment : bool
        Whether to apply data augmentation (training only).
    shuffle : bool
    shuffle_buffer : int
    prefetch : int
    aug_config : dict, optional
        Augmentation parameters from config.yaml.

    Returns
    -------
    tf.data.Dataset
        Batched, prefetched dataset of (image, one_hot_label) pairs.
    """
    import tensorflow as tf

    paths = [r["path"] for r in records]
    labels = [r["grade"] for r in records]

    path_ds = tf.data.Dataset.from_tensor_slices(paths)
    label_ds = tf.data.Dataset.from_tensor_slices(
        tf.one_hot(labels, depth=num_classes)
    )
    ds = tf.data.Dataset.zip((path_ds, label_ds))

    def load_and_preprocess(path, label):
        img = tf.io.read_file(path)
        img = tf.image.decode_image(img, channels=3, expand_animations=False)
        img = tf.image.resize(img, [image_size, image_size])
        img = tf.cast(img, tf.float32)
        # Note: ResNet50 preprocess_input is applied inside the model
        return img, label

    ds = ds.map(load_and_preprocess, num_parallel_calls=tf.data.AUTOTUNE)

    if augment and aug_config:
        def augment_fn(img, label):
            if aug_config.get("horizontal_flip", False):
                img = tf.image.random_flip_left_right(img)
            if aug_config.get("brightness_range"):
                br = aug_config["brightness_range"]
                delta = (br[1] - br[0]) / 2.0
                img = tf.image.random_brightness(img, max_delta=delta)
            if aug_config.get("contrast_range"):
                cr = aug_config["contrast_range"]
                img = tf.image.random_contrast(img, lower=cr[0], upper=cr[1])
            img = tf.clip_by_value(img, 0.0, 255.0)
            return img, label

        ds = ds.map(augment_fn, num_parallel_calls=tf.data.AUTOTUNE)

    if shuffle:
        ds = ds.shuffle(buffer_size=shuffle_buffer)

    ds = ds.batch(batch_size).prefetch(prefetch)
    return ds
