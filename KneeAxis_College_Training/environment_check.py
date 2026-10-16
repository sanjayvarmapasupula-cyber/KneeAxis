"""
KneeAxis — Environment Check
==============================
Verify that all required packages are installed and GPU is accessible.
Run this first on any new JupyterHub session.
"""

import sys
import importlib
from pathlib import Path

# Ensure cross-platform UTF-8 output on Windows consoles
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

REQUIRED_PACKAGES = [
    ("tensorflow", "2.10.0"),
    ("numpy", "1.24.0"),
    ("scipy", "1.10.0"),
    ("SimpleITK", "2.2.0"),
    ("sklearn", "1.0.0"),       # scikit-learn
    ("PIL", "9.0.0"),            # Pillow
    ("yaml", "5.0"),             # PyYAML
    ("matplotlib", "3.7.0"),
    ("nibabel", "5.0.0"),
    ("h5py", "3.0.0"),
    ("pandas", "1.5.0"),
]

OPTIONAL_PACKAGES = [
    ("psutil", "Provides RAM/CPU monitoring"),
    ("tqdm", "Progress bars"),
    ("seaborn", "Enhanced visualization"),
]


def check_packages():
    """Check required and optional packages."""
    print("=" * 60)
    print("  KneeAxis — Package Check")
    print("=" * 60)

    missing = []
    installed = []

    for pkg_name, min_ver in REQUIRED_PACKAGES:
        try:
            mod = importlib.import_module(pkg_name)
            ver = getattr(mod, "__version__", "unknown")
            installed.append((pkg_name, ver))
            print(f"  ✅ {pkg_name:20s} {ver}")
        except ImportError:
            missing.append(pkg_name)
            print(f"  ❌ {pkg_name:20s} NOT INSTALLED (need >= {min_ver})")

    print(f"\n  Optional packages:")
    for pkg_name, desc in OPTIONAL_PACKAGES:
        try:
            mod = importlib.import_module(pkg_name)
            ver = getattr(mod, "__version__", "unknown")
            print(f"  ✅ {pkg_name:20s} {ver}")
        except ImportError:
            print(f"  ⚠️  {pkg_name:20s} not installed — {desc}")

    if missing:
        print(f"\n  ⚠️  {len(missing)} required packages missing:")
        print(f"     pip install {' '.join(missing)}")
        pip_map = {"sklearn": "scikit-learn", "PIL": "Pillow", "yaml": "PyYAML"}
        real_names = [pip_map.get(m, m) for m in missing]
        print(f"\n     Actual pip command:")
        print(f"     pip install {' '.join(real_names)}")
    else:
        print(f"\n  ✅ All {len(REQUIRED_PACKAGES)} required packages are installed.")

    return missing


def check_gpu():
    """Check TensorFlow GPU visibility."""
    print(f"\n{'='*60}")
    print("  KneeAxis — GPU Check")
    print("=" * 60)

    try:
        import tensorflow as tf
        print(f"  TensorFlow Version: {tf.__version__}")

        gpus = tf.config.list_physical_devices("GPU")
        if gpus:
            print(f"  ✅ {len(gpus)} GPU(s) visible to TensorFlow:")
            for gpu in gpus:
                print(f"     - {gpu.name}")
                try:
                    tf.config.experimental.set_memory_growth(gpu, True)
                    print(f"       Memory growth: enabled")
                except RuntimeError:
                    print(f"       Memory growth: already set or unavailable")
            print(f"\n  GPU training IS available.")
        else:
            print(f"  ⚠️  No GPUs visible to TensorFlow.")
            print(f"     Training will use CPU only (much slower).")
            print(f"     Check CUDA, cuDNN, and tensorflow-gpu installation.")
    except ImportError:
        print(f"  ❌ TensorFlow is not installed.")
        print(f"     Cannot check GPU availability.")

    print("=" * 60)


def check_directories():
    """Check that expected directories exist."""
    print(f"\n{'='*60}")
    print("  KneeAxis — Directory Check")
    print("=" * 60)

    root = Path(__file__).resolve().parent
    expected = [
        "config.yaml",
        "src/classification",
        "src/segmentation",
        "src/common",
        "datasets",
        "manifests",
        "checkpoints",
        "models",
        "outputs",
    ]

    for d in expected:
        p = root / d
        exists = p.exists()
        icon = "✅" if exists else "❌"
        kind = "dir" if p.is_dir() else ("file" if p.is_file() else "missing")
        print(f"  {icon} {d:40s} [{kind}]")

    print("=" * 60)


def main():
    print(f"\n  Python: {sys.version}")
    print(f"  Executable: {sys.executable}\n")

    missing = check_packages()
    check_gpu()
    check_directories()

    if missing:
        print(f"\n⚠️  Some required packages are missing. Install them before training.")
        sys.exit(1)
    else:
        print(f"\n✅ Environment is ready for training.")


if __name__ == "__main__":
    main()
