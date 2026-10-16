"""
KneeAxis — Export Trained Artifacts
======================================
Package trained model weights, configs, metrics, and checksums
into a KneeAxis_Trained_Artifacts.zip for download and integration.
"""

import sys
import os
import json
import hashlib
import zipfile
import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.common.paths import load_config, resolve_path


def sha256_file(filepath: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def verify_weights(weights_path: Path, model_type: str) -> bool:
    """
    Attempt to load weights and run a single inference to verify
    the file is not corrupt. Returns True if successful.
    """
    try:
        import tensorflow as tf
        import numpy as np

        if model_type == "classification":
            from src.classification.model import build_resnet50_classifier
            model = build_resnet50_classifier(freeze_backbone=False)
            model.load_weights(str(weights_path))
            dummy = np.random.rand(1, 224, 224, 3).astype(np.float32) * 255
            pred = model.predict(dummy, verbose=0)
            print(f"  ✅ Classification weights verified (pred shape: {pred.shape})")
            return True

        elif model_type == "segmentation":
            from src.segmentation.model import build_3d_unet
            model = None
            cfg_file = weights_path.parent / "model_config.json"
            if cfg_file.is_file():
                try:
                    with open(cfg_file, "r", encoding="utf-8") as f:
                        m_cfg = json.load(f)
                    in_shape = tuple(m_cfg.get("input_shape", (64, 64, 64, 1)))
                    model = build_3d_unet(input_shape=in_shape)
                    model.load_weights(str(weights_path))
                except Exception:
                    model = None

            if model is None:
                for shp in [(64, 64, 64, 1), (96, 96, 96, 1), (32, 32, 32, 1)]:
                    try:
                        m = build_3d_unet(input_shape=shp)
                        m.load_weights(str(weights_path))
                        model = m
                        break
                    except Exception:
                        continue

            if model is not None:
                print(f"  ✅ Segmentation weights loaded successfully")
                return True
            else:
                print(f"  ❌ Could not load segmentation weights into any candidate architecture")
                return False

    except Exception as e:
        print(f"  ❌ Weight verification failed: {e}")
        return False


def export_artifacts(config_path=None, output_zip=None):
    """
    Create KneeAxis_Trained_Artifacts.zip containing:
    - Trained weights
    - Model configs
    - Evaluation metrics
    - Training histories
    - Checksums
    - Integration README
    """
    cfg = load_config(config_path)
    from src.common.paths import get_output_paths
    out_paths = get_output_paths(cfg)
    models_dir = out_paths["models"]
    eval_dir = out_paths["evaluations"]
    ckpt_dir = out_paths["checkpoints"]

    if output_zip is None:
        zip_name = cfg.get("export", {}).get("output", "KneeAxis_Trained_Artifacts.zip")
        output_zip = resolve_path(".") / zip_name
    output_zip = Path(output_zip)

    print("=" * 60)
    print("  KneeAxis — Export Trained Artifacts")
    print("=" * 60)

    manifest = {
        "export_timestamp": datetime.datetime.now().isoformat(),
        "project": "KneeAxis",
        "models": {},
    }

    files_to_zip = []

    # --- Classification model ---
    kl_dir = models_dir / "kl_classifier"
    kl_weights = kl_dir / "best.weights.h5"
    kl_keras = kl_dir / "best.keras"
    kl_config = kl_dir / "model_config.json"
    kl_metrics = kl_dir / "metrics.json"
    kl_history = kl_dir / "history.csv"

    if kl_weights.is_file():
        print(f"\n📦 Classification model found:")
        print(f"   Weights: {kl_weights}")

        verified = verify_weights(kl_weights, "classification")

        files_to_zip.append((kl_weights, "models/kl_classifier/best.weights.h5"))
        manifest["models"]["kl_classifier"] = {
            "status": "trained" if verified else "unverified",
            "weights_sha256": sha256_file(kl_weights),
            "weights_size_bytes": kl_weights.stat().st_size,
        }

        if kl_keras.is_file():
            files_to_zip.append((kl_keras, "models/kl_classifier/best.keras"))
        if kl_config.is_file():
            files_to_zip.append((kl_config, "models/kl_classifier/model_config.json"))
        if kl_metrics.is_file():
            files_to_zip.append((kl_metrics, "models/kl_classifier/metrics.json"))
        if kl_history.is_file():
            files_to_zip.append((kl_history, "models/kl_classifier/history.csv"))
    else:
        print(f"\n⚠️  Classification model not found (not yet trained)")
        manifest["models"]["kl_classifier"] = {"status": "not_trained"}

    # --- Segmentation model ---
    seg_dir = models_dir / "knee_segmentation"
    seg_weights = seg_dir / "best.weights.h5"
    seg_keras = seg_dir / "best.keras"
    seg_config = seg_dir / "model_config.json"
    seg_metrics = seg_dir / "metrics.json"
    seg_history = seg_dir / "history.csv"

    if seg_weights.is_file():
        print(f"\n📦 Segmentation model found:")
        print(f"   Weights: {seg_weights}")

        verified = verify_weights(seg_weights, "segmentation")

        files_to_zip.append((seg_weights, "models/knee_segmentation/best.weights.h5"))
        manifest["models"]["knee_segmentation"] = {
            "status": "trained" if verified else "unverified",
            "weights_sha256": sha256_file(seg_weights),
            "weights_size_bytes": seg_weights.stat().st_size,
        }

        if seg_keras.is_file():
            files_to_zip.append((seg_keras, "models/knee_segmentation/best.keras"))
        if seg_config.is_file():
            files_to_zip.append((seg_config, "models/knee_segmentation/model_config.json"))
        if seg_metrics.is_file():
            files_to_zip.append((seg_metrics, "models/knee_segmentation/metrics.json"))
        if seg_history.is_file():
            files_to_zip.append((seg_history, "models/knee_segmentation/history.csv"))
    else:
        print(f"\n⚠️  Segmentation model not found (not yet trained)")
        manifest["models"]["knee_segmentation"] = {"status": "not_trained"}

    # --- Evaluation metrics ---
    if eval_dir.is_dir():
        for f in eval_dir.glob("*.json"):
            files_to_zip.append((f, f"evaluations/{f.name}"))
            print(f"  + Evaluation: {f.name}")

    # --- Training histories ---
    for task in ["classification", "segmentation"]:
        task_ckpt = ckpt_dir / task
        if task_ckpt.is_dir():
            for run_dir in sorted(task_ckpt.iterdir()):
                if run_dir.is_dir():
                    for f in ["history.json", "training_state.json", "training_log.csv"]:
                        fp = run_dir / f
                        if fp.is_file():
                            files_to_zip.append((fp, f"training_history/{task}/{run_dir.name}/{f}"))

    # --- Environment info ---
    try:
        import tensorflow as tf
        env_info = {
            "tensorflow_version": tf.__version__,
            "python_version": sys.version,
        }
    except ImportError:
        env_info = {"python_version": sys.version}
    manifest["environment"] = env_info

    # Check if anything to export
    trained_models = [k for k, v in manifest["models"].items() if v["status"] != "not_trained"]
    if not trained_models:
        print(f"\n❌ No trained models found. Nothing to export.")
        print(f"   Train at least one model before exporting.")
        return None

    # --- Write ZIP ---
    print(f"\n📦 Creating archive: {output_zip}")
    with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        for src, arc in files_to_zip:
            zf.write(src, arc)
            print(f"   + {arc}")

        # Write manifest
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))

        # Write integration README
        readme = _generate_integration_readme(manifest)
        zf.writestr("README_INTEGRATION.md", readme)

    zip_size = output_zip.stat().st_size
    print(f"\n✅ Export complete: {output_zip}")
    print(f"   Size: {zip_size / (1024*1024):.1f} MB")
    print(f"   Models: {', '.join(trained_models)}")

    return str(output_zip)


def _generate_integration_readme(manifest: dict) -> str:
    """Generate a README for integrating exported artifacts."""
    lines = [
        "# KneeAxis Trained Artifacts — Integration Guide",
        "",
        f"Exported: {manifest['export_timestamp']}",
        "",
        "## Steps to Integrate",
        "",
        "1. Extract this ZIP on your development machine.",
        "2. Copy model files to your KneeAxis project:",
        "   ```",
        "   cp models/kl_classifier/*    <KneeAxis>/models/kl_classifier/",
        "   cp models/knee_segmentation/* <KneeAxis>/models/knee_segmentation/",
        "   ```",
        "3. Update `models/model_integration_config.json`:",
        '   Set `"use_trained_model": true` for each trained model.',
        "4. Restart the Express backend.",
        "",
        "## Model Status",
        "",
    ]
    for name, info in manifest.get("models", {}).items():
        status = info.get("status", "unknown")
        sha = info.get("weights_sha256", "N/A")[:16] + "..." if info.get("weights_sha256") else "N/A"
        lines.append(f"- **{name}**: {status} (SHA-256: {sha})")

    lines.extend([
        "",
        "## SHA-256 Checksums",
        "",
        "Verify file integrity after download:",
        "",
    ])
    for name, info in manifest.get("models", {}).items():
        if info.get("weights_sha256"):
            lines.append(f"- `{name}/best.weights.h5`: `{info['weights_sha256']}`")

    return "\n".join(lines)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Export trained KneeAxis artifacts")
    parser.add_argument("--config", type=str, default=None)
    parser.add_argument("--output", type=str, default=None)
    args = parser.parse_args()

    export_artifacts(
        config_path=Path(args.config) if args.config else None,
        output_zip=Path(args.output) if args.output else None,
    )


if __name__ == "__main__":
    main()
