"""
KneeAxis — Smoke Test
======================
Quick 5–10 minute validation that the training pipeline works.
Uses a tiny subset of data and 2–3 epochs.
"""

import sys
import time
import tempfile
from pathlib import Path

# Fix Windows console unicode charmap issues
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def smoke_test_classification():
    """Quick test of classification pipeline with synthetic data."""
    print("\n" + "=" * 60)
    print("  Smoke Test — KL Classification (Synthetic Data)")
    print("=" * 60)

    import numpy as np
    import tensorflow as tf
    from src.classification.model import build_resnet50_classifier, get_model_config

    # Build model
    model = build_resnet50_classifier(
        input_shape=(224, 224, 3),
        num_classes=5,
        freeze_backbone=True,
        learning_rate=1e-4,
    )
    print(f"  Model built: {model.name}")
    print(f"  Parameters: {model.count_params():,}")

    # Generate tiny synthetic dataset
    n = 10
    x = np.random.rand(n, 224, 224, 3).astype(np.float32) * 255.0
    y = tf.one_hot(np.random.randint(0, 5, size=n), depth=5).numpy()

    # Train 2 epochs
    print("  Training 2 epochs on synthetic data...")
    history = model.fit(x, y, epochs=2, batch_size=2, verbose=1)

    # Save and reload weights
    with tempfile.TemporaryDirectory() as tmpdir:
        w_path = Path(tmpdir) / "test.weights.h5"
        model.save_weights(str(w_path))
        print(f"  Weights saved: {w_path} ({w_path.stat().st_size / 1024:.0f} KB)")

        # Reload
        model2 = build_resnet50_classifier(freeze_backbone=False)
        model2.load_weights(str(w_path))
        pred = model2.predict(x[:1], verbose=0)
        print(f"  Reload + predict: grade={np.argmax(pred)} probs={np.round(pred[0], 3)}")

    config = get_model_config(model)
    print(f"  Model config keys: {list(config.keys())}")

    print("  ✅ Classification smoke test PASSED")
    return True


def smoke_test_segmentation():
    """Quick test of segmentation pipeline with synthetic data."""
    print("\n" + "=" * 60)
    print("  Smoke Test — 3D Segmentation (Synthetic Data)")
    print("=" * 60)

    import numpy as np
    import tensorflow as tf
    from src.segmentation.model import build_3d_unet, get_model_config, validate_patch_size

    patch_size = (32, 32, 32)  # Small for smoke test
    num_classes = 6

    # Validate patch size (32 with 4 pools = 32/16 = 2, OK)
    assert validate_patch_size(list(patch_size), num_pools=4), "Patch size validation failed"

    # Build model with small filters for speed
    model = build_3d_unet(
        input_shape=(*patch_size, 1),
        num_classes=num_classes,
        encoder_filters=[8, 16, 32, 64],
        bottleneck_filters=128,
        learning_rate=1e-3,
    )
    print(f"  Model built: {model.name}")
    print(f"  Parameters: {model.count_params():,}")

    # Generate synthetic patches
    n = 4
    x = np.random.rand(n, *patch_size, 1).astype(np.float32)
    y_int = np.random.randint(0, num_classes, size=(n, *patch_size))
    y = tf.one_hot(y_int, depth=num_classes).numpy().astype(np.float32)

    # Train 2 epochs
    print("  Training 2 epochs on synthetic data...")
    history = model.fit(x, y, epochs=2, batch_size=2, verbose=1)

    # Save and reload weights
    with tempfile.TemporaryDirectory() as tmpdir:
        w_path = Path(tmpdir) / "test_seg.weights.h5"
        model.save_weights(str(w_path))
        print(f"  Weights saved: {w_path} ({w_path.stat().st_size / 1024:.0f} KB)")

        model2 = build_3d_unet(
            input_shape=(*patch_size, 1),
            num_classes=num_classes,
            encoder_filters=[8, 16, 32, 64],
            bottleneck_filters=128,
        )
        model2.load_weights(str(w_path))
        pred = model2.predict(x[:1], verbose=0)
        pred_labels = np.argmax(pred[0], axis=-1)
        unique = np.unique(pred_labels)
        print(f"  Reload + predict: shape={pred_labels.shape} unique_labels={unique}")

    config = get_model_config(model)
    print(f"  Model config keys: {list(config.keys())}")

    print("  ✅ Segmentation smoke test PASSED")
    return True


def main():
    start = time.time()
    print("=" * 60)
    print("  KneeAxis — Smoke Test Suite")
    print("=" * 60)

    results = {}

    try:
        results["classification"] = smoke_test_classification()
    except Exception as e:
        print(f"  ❌ Classification smoke test FAILED: {e}")
        results["classification"] = False

    try:
        results["segmentation"] = smoke_test_segmentation()
    except Exception as e:
        print(f"  ❌ Segmentation smoke test FAILED: {e}")
        results["segmentation"] = False

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"  Smoke Test Results (completed in {elapsed:.1f}s)")
    print(f"{'='*60}")
    for task, passed in results.items():
        icon = "✅" if passed else "❌"
        print(f"  {icon} {task}")

    if all(results.values()):
        print(f"\n  ✅ All smoke tests passed. Ready for real training!")
    else:
        print(f"\n  ⚠️  Some smoke tests failed. Review errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
