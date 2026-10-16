"""
KneeAxis — 3D Segmentation Preprocessing
==========================================
Volume loading, manifest handling, 3D patch extraction with
foreground-aware sampling for OAIZIB-CM knee MRI data.
"""

import csv
import random
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any

import numpy as np


def load_oaizib_manifest(manifest_path: Path) -> List[Dict[str, str]]:
    """
    Load an OAIZIB manifest CSV with columns: case_id, image, label.

    Validates:
      - File exists
      - Required columns present
      - Image and label files exist on disk
    """
    manifest_path = Path(manifest_path)
    if not manifest_path.is_file():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    records = []
    errors = []

    with open(manifest_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)

        required = {"case_id", "image", "label"}
        if not required.issubset(set(reader.fieldnames or [])):
            missing = required - set(reader.fieldnames or [])
            raise ValueError(
                f"Manifest is missing required columns: {missing}. "
                f"Found: {reader.fieldnames}"
            )

        for i, row in enumerate(reader):
            raw_img = row["image"].strip().replace("\\", "/")
            raw_lbl = row["label"].strip().replace("\\", "/")

            img_path = Path(raw_img)
            if not img_path.is_file():
                from src.common.paths import PROJECT_ROOT
                candidate_img = (PROJECT_ROOT / raw_img).resolve()
                if candidate_img.is_file():
                    img_path = candidate_img
                else:
                    errors.append(f"Row {i+2}: image not found: {row['image']}")
                    continue

            lbl_path = Path(raw_lbl)
            if not lbl_path.is_file():
                from src.common.paths import PROJECT_ROOT
                candidate_lbl = (PROJECT_ROOT / raw_lbl).resolve()
                if candidate_lbl.is_file():
                    lbl_path = candidate_lbl
                else:
                    errors.append(f"Row {i+2}: label not found: {row['label']}")
                    continue

            records.append({
                "case_id": row["case_id"].strip(),
                "image": str(img_path),
                "label": str(lbl_path),
            })

    if errors:
        print(f"WARNING: {len(errors)} manifest errors:")
        for e in errors[:20]:
            print(f"  {e}")
        if len(errors) > 20:
            print(f"  ... and {len(errors) - 20} more")

    return records


def load_volume_pair(image_path: str, label_path: str) -> Tuple[np.ndarray, np.ndarray, dict]:
    """
    Load an image/label NIfTI pair using SimpleITK.

    Returns
    -------
    image_array : float32 3D array (D, H, W)
    label_array : int32 3D array (D, H, W)
    metadata : dict with spacing, origin, direction
    """
    import SimpleITK as sitk

    img = sitk.ReadImage(image_path)
    lbl = sitk.ReadImage(label_path)

    img_arr = sitk.GetArrayFromImage(img).astype(np.float32)  # (D, H, W)
    lbl_arr = sitk.GetArrayFromImage(lbl).astype(np.int32)

    # Validate matching shapes
    if img_arr.shape != lbl_arr.shape:
        raise ValueError(
            f"Shape mismatch: image {img_arr.shape} vs label {lbl_arr.shape} "
            f"for {image_path}"
        )

    metadata = {
        "spacing": img.GetSpacing(),
        "origin": img.GetOrigin(),
        "direction": img.GetDirection(),
        "size": img.GetSize(),
    }

    return img_arr, lbl_arr, metadata


def normalise_volume(
    volume: np.ndarray,
    method: str = "z_score",
    clip_percentile: Optional[Tuple[float, float]] = (0.5, 99.5),
) -> np.ndarray:
    """
    Normalise a 3D image volume.

    Parameters
    ----------
    volume : float32 array
    method : "z_score" | "min_max" | "none"
    clip_percentile : tuple, optional
        Clip extreme values before normalisation.
    """
    vol = volume.copy()

    if clip_percentile:
        lo, hi = np.percentile(vol, clip_percentile)
        vol = np.clip(vol, lo, hi)

    if method == "z_score":
        mean = vol.mean()
        std = vol.std()
        if std > 1e-8:
            vol = (vol - mean) / std
    elif method == "min_max":
        vmin, vmax = vol.min(), vol.max()
        if vmax - vmin > 1e-8:
            vol = (vol - vmin) / (vmax - vmin)
    elif method == "none":
        pass
    else:
        raise ValueError(f"Unknown normalisation method: {method}")

    return vol.astype(np.float32)


def extract_random_patch(
    image: np.ndarray,
    label: np.ndarray,
    patch_size: Tuple[int, int, int],
    foreground: bool = False,
    num_classes: int = 6,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Extract a single random 3D patch.

    Parameters
    ----------
    image : (D, H, W) float32
    label : (D, H, W) int32
    patch_size : (pd, ph, pw)
    foreground : bool
        If True, centre the patch on a random foreground voxel.
    num_classes : int

    Returns
    -------
    image_patch : (pd, ph, pw, 1) float32
    label_patch : (pd, ph, pw, num_classes) one-hot float32
    """
    D, H, W = image.shape
    pd, ph, pw = patch_size

    if foreground:
        fg_coords = np.argwhere(label > 0)
        if len(fg_coords) > 0:
            idx = random.randint(0, len(fg_coords) - 1)
            cz, cy, cx = fg_coords[idx]
            # Centre patch on foreground voxel
            z0 = max(0, min(cz - pd // 2, D - pd))
            y0 = max(0, min(cy - ph // 2, H - ph))
            x0 = max(0, min(cx - pw // 2, W - pw))
        else:
            foreground = False  # fallback to random

    if not foreground:
        z0 = random.randint(0, max(0, D - pd))
        y0 = random.randint(0, max(0, H - ph))
        x0 = random.randint(0, max(0, W - pw))

    img_patch = image[z0:z0+pd, y0:y0+ph, x0:x0+pw]
    lbl_patch = label[z0:z0+pd, y0:y0+ph, x0:x0+pw]

    # Add channel dimension
    img_patch = img_patch[..., np.newaxis]

    # One-hot encode label
    lbl_onehot = np.eye(num_classes, dtype=np.float32)[lbl_patch]

    return img_patch, lbl_onehot


def create_patch_generator(
    records: List[Dict],
    patch_size: Tuple[int, int, int],
    patches_per_volume: int = 8,
    foreground_ratio: float = 0.5,
    num_classes: int = 6,
    normalisation: str = "z_score",
    clip_percentile: Optional[Tuple[float, float]] = (0.5, 99.5),
):
    """
    Python generator that yields (patch, label) pairs from a set of volumes.
    Memory-efficient: loads one volume at a time.

    Yields
    ------
    image_patch : (pd, ph, pw, 1) float32
    label_patch : (pd, ph, pw, num_classes) float32
    """
    while True:
        random.shuffle(records)
        for rec in records:
            try:
                img, lbl, _ = load_volume_pair(rec["image"], rec["label"])
                img = normalise_volume(img, method=normalisation, clip_percentile=clip_percentile)

                # Pad if volume is smaller than patch size
                D, H, W = img.shape
                pd, ph, pw = patch_size
                if D < pd or H < ph or W < pw:
                    pad_d = max(0, pd - D)
                    pad_h = max(0, ph - H)
                    pad_w = max(0, pw - W)
                    img = np.pad(img, ((0, pad_d), (0, pad_h), (0, pad_w)), mode="constant")
                    lbl = np.pad(lbl, ((0, pad_d), (0, pad_h), (0, pad_w)), mode="constant")

                for p in range(patches_per_volume):
                    use_fg = random.random() < foreground_ratio
                    img_patch, lbl_patch = extract_random_patch(
                        img, lbl, patch_size, foreground=use_fg, num_classes=num_classes,
                    )
                    yield img_patch, lbl_patch

            except Exception as e:
                print(f"WARNING: Skipping {rec['case_id']}: {e}")
                continue


def build_tf_dataset_3d(
    records: List[Dict],
    patch_size: Tuple[int, int, int],
    batch_size: int = 2,
    patches_per_volume: int = 8,
    foreground_ratio: float = 0.5,
    num_classes: int = 6,
    normalisation: str = "z_score",
    clip_percentile: Optional[Tuple[float, float]] = (0.5, 99.5),
    prefetch: int = 2,
):
    """
    Build a tf.data.Dataset from the patch generator.
    """
    import tensorflow as tf

    pd, ph, pw = patch_size

    def gen():
        yield from create_patch_generator(
            records, patch_size, patches_per_volume,
            foreground_ratio, num_classes, normalisation, clip_percentile,
        )

    ds = tf.data.Dataset.from_generator(
        gen,
        output_signature=(
            tf.TensorSpec(shape=(pd, ph, pw, 1), dtype=tf.float32),
            tf.TensorSpec(shape=(pd, ph, pw, num_classes), dtype=tf.float32),
        ),
    )

    ds = ds.batch(batch_size).prefetch(prefetch)
    return ds
