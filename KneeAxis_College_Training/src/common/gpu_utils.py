"""
KneeAxis — GPU Utilities
=========================
GPU detection, memory-growth configuration, and device reporting
for TensorFlow on college JupyterHub servers.
"""

import os
import sys
import platform
from typing import List, Dict, Any, Optional


def configure_gpu_memory_growth() -> None:
    """
    Enable memory-growth mode for all visible TensorFlow GPUs.
    This prevents TF from allocating the entire GPU memory at startup,
    which is critical on shared college JupyterHub servers.
    """
    try:
        import tensorflow as tf
        gpus = tf.config.list_physical_devices("GPU")
        for gpu in gpus:
            try:
                tf.config.experimental.set_memory_growth(gpu, True)
            except RuntimeError as e:
                # Memory growth must be set before GPUs are initialised
                print(f"Warning: Could not set memory growth for {gpu}: {e}",
                      file=sys.stderr)
    except ImportError:
        print("Warning: TensorFlow not installed — cannot configure GPU.",
              file=sys.stderr)


def get_gpu_info() -> Dict[str, Any]:
    """
    Gather GPU information visible to TensorFlow.

    Returns a dictionary with:
      - tf_version: TensorFlow version string
      - gpu_available: bool
      - gpu_count: int
      - gpu_devices: list of device detail dicts
      - cuda_visible: CUDA_VISIBLE_DEVICES env var
      - memory_growth_set: bool
    """
    info: Dict[str, Any] = {
        "tf_version": None,
        "gpu_available": False,
        "gpu_count": 0,
        "gpu_devices": [],
        "cuda_visible": os.environ.get("CUDA_VISIBLE_DEVICES", "<not set>"),
        "memory_growth_set": False,
    }

    try:
        import tensorflow as tf
        info["tf_version"] = tf.__version__

        gpus = tf.config.list_physical_devices("GPU")
        info["gpu_count"] = len(gpus)
        info["gpu_available"] = len(gpus) > 0

        for gpu in gpus:
            detail = {"name": gpu.name, "device_type": gpu.device_type}
            try:
                mem_info = tf.config.experimental.get_memory_info(gpu.name)
                detail["memory_total_mb"] = round(
                    mem_info.get("total", 0) / (1024 ** 2), 1
                ) if isinstance(mem_info, dict) else None
            except Exception:
                detail["memory_total_mb"] = None
            try:
                growth = tf.config.experimental.get_memory_growth(gpu)
                detail["memory_growth"] = growth
                if growth:
                    info["memory_growth_set"] = True
            except Exception:
                detail["memory_growth"] = None
            info["gpu_devices"].append(detail)

    except ImportError:
        pass

    return info


def get_system_info() -> Dict[str, Any]:
    """Gather general system information."""
    import shutil

    info = {
        "python_version": sys.version,
        "python_executable": sys.executable,
        "platform": platform.platform(),
        "os": platform.system(),
        "architecture": platform.machine(),
        "cwd": os.getcwd(),
    }

    # RAM (best-effort)
    try:
        import psutil
        mem = psutil.virtual_memory()
        info["ram_total_gb"] = round(mem.total / (1024 ** 3), 1)
        info["ram_available_gb"] = round(mem.available / (1024 ** 3), 1)
    except ImportError:
        info["ram_total_gb"] = None
        info["ram_available_gb"] = None

    # Disk
    try:
        usage = shutil.disk_usage(os.getcwd())
        info["disk_total_gb"] = round(usage.total / (1024 ** 3), 1)
        info["disk_free_gb"] = round(usage.free / (1024 ** 3), 1)
    except Exception:
        info["disk_total_gb"] = None
        info["disk_free_gb"] = None

    return info


def print_environment_report() -> None:
    """Print a formatted environment report to stdout."""
    sys_info = get_system_info()
    gpu_info = get_gpu_info()

    print("=" * 70)
    print("  KneeAxis — Environment Report")
    print("=" * 70)

    print(f"\n  Python:        {sys_info['python_version'].split()[0]}")
    print(f"  Executable:    {sys_info['python_executable']}")
    print(f"  Platform:      {sys_info['platform']}")
    print(f"  Architecture:  {sys_info['architecture']}")
    print(f"  Working Dir:   {sys_info['cwd']}")

    if sys_info["ram_total_gb"]:
        print(f"\n  RAM Total:     {sys_info['ram_total_gb']} GB")
        print(f"  RAM Available: {sys_info['ram_available_gb']} GB")

    if sys_info["disk_total_gb"]:
        print(f"\n  Disk Total:    {sys_info['disk_total_gb']} GB")
        print(f"  Disk Free:     {sys_info['disk_free_gb']} GB")

    print(f"\n  TensorFlow:    {gpu_info['tf_version'] or 'NOT INSTALLED'}")
    print(f"  CUDA_VISIBLE:  {gpu_info['cuda_visible']}")
    print(f"  GPUs Found:    {gpu_info['gpu_count']}")

    if gpu_info["gpu_available"]:
        for i, dev in enumerate(gpu_info["gpu_devices"]):
            mem = f"{dev['memory_total_mb']} MB" if dev.get("memory_total_mb") else "unknown"
            growth = dev.get("memory_growth", "unknown")
            print(f"    GPU {i}: {dev['name']} | VRAM: {mem} | MemGrowth: {growth}")
        print("\n  ✅ GPU training IS available via TensorFlow.")
    else:
        print("\n  ⚠️  No GPU visible to TensorFlow.")
        print("     Training will use CPU only (much slower).")
        if gpu_info["tf_version"]:
            print("     Check: is tensorflow-gpu / CUDA / cuDNN installed correctly?")
        else:
            print("     TensorFlow is not installed at all.")

    print("=" * 70)


def check_gpu_availability() -> bool:
    """Return True if at least one physical GPU is visible to TensorFlow."""
    info = get_gpu_info()
    return bool(info.get("gpu_available", False))



if __name__ == "__main__":
    configure_gpu_memory_growth()
    print_environment_report()
