"""
KneeAxis — Common Paths & Configuration Loader
================================================
Central path resolution and YAML configuration reader used by all
training, evaluation, and utility scripts.
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

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


def find_project_root(marker: str = "config.yaml") -> Path:
    """
    Walk upward from this file's location to find the training-package root,
    identified by the presence of ``marker`` (default: config.yaml).
    """
    current = Path(__file__).resolve().parent
    for _ in range(10):
        if (current / marker).is_file():
            return current
        current = current.parent
    # Fallback: assume two levels up from src/common/
    return Path(__file__).resolve().parent.parent.parent


PROJECT_ROOT: Path = find_project_root()


def load_config(config_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load the YAML configuration file and return as a dictionary."""
    try:
        import yaml
    except ImportError:
        print(
            "ERROR: PyYAML is not installed. Run:\n"
            "  pip install pyyaml\n",
            file=sys.stderr,
        )
        sys.exit(1)

    if config_path is None:
        if (PROJECT_ROOT / "training_config.yaml").is_file():
            config_path = PROJECT_ROOT / "training_config.yaml"
        elif (PROJECT_ROOT / "config.yaml").is_file():
            config_path = PROJECT_ROOT / "config.yaml"
        else:
            config_path = PROJECT_ROOT / "training_config.yaml"

    config_path = Path(config_path).resolve()
    if not config_path.is_file():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_path, "r", encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh)
    return cfg


def resolve_path(relative: str) -> Path:
    """Resolve a config-relative path against PROJECT_ROOT."""
    return (PROJECT_ROOT / relative).resolve()


# ---------------------------------------------------------------------------
# Pre-built convenience accessors
# ---------------------------------------------------------------------------

def get_dataset_paths(cfg: Dict[str, Any]) -> Dict[str, Path]:
    ds = cfg.get("datasets", {})
    paths = cfg.get("paths", {})
    base_ds = paths.get("datasets", "datasets")
    return {
        "oai": resolve_path(cfg.get("classification", {}).get("dataset", ds.get("oai_root", f"{base_ds}/OAI"))),
        "most": resolve_path(ds.get("most_root", f"{base_ds}/MOST")),
        "oaizib": resolve_path(cfg.get("segmentation", {}).get("dataset", ds.get("oaizib_root", f"{base_ds}/OAIZIB_CM"))),
        "totalsegmentator": resolve_path(ds.get("totalsegmentator_root", f"{base_ds}/TotalSegmentator")),
    }


def get_manifest_paths(cfg: Dict[str, Any]) -> Dict[str, Path]:
    m = cfg.get("manifests", {})
    paths = cfg.get("paths", {})
    base_m = paths.get("manifests", "manifests")
    return {
        "oai": resolve_path(cfg.get("classification", {}).get("manifest", m.get("oai", f"{base_m}/oai_manifest.csv"))),
        "most": resolve_path(m.get("most", f"{base_m}/most_manifest.csv")),
        "oaizib": resolve_path(cfg.get("segmentation", {}).get("manifest", m.get("oaizib", f"{base_m}/oaizib_manifest.csv"))),
    }


def get_output_paths(cfg: Dict[str, Any]) -> Dict[str, Path]:
    o = cfg.get("outputs", {})
    paths = cfg.get("paths", {})
    return {
        "checkpoints": resolve_path(paths.get("checkpoints", o.get("checkpoints", "checkpoints"))),
        "models": resolve_path(paths.get("models", o.get("models", "models"))),
        "logs": resolve_path(paths.get("logs", o.get("logs", "logs"))),
        "outputs": resolve_path(paths.get("outputs", "outputs")),
        "evaluations": resolve_path(o.get("evaluations", "outputs/evaluations")),
        "classification": resolve_path(cfg.get("classification", {}).get("output", "models/kl_classifier")),
        "segmentation": resolve_path(cfg.get("segmentation", {}).get("output", "models/knee_segmentation")),
    }


def ensure_directories(cfg: Dict[str, Any]) -> None:
    """Create all required directories if they do not exist."""
    out_paths = get_output_paths(cfg)
    for name, p in out_paths.items():
        p.mkdir(parents=True, exist_ok=True)
    # Checkpoint subdirectories
    ckpt = out_paths["checkpoints"]
    (ckpt / "classification").mkdir(parents=True, exist_ok=True)
    (ckpt / "segmentation").mkdir(parents=True, exist_ok=True)
    # Model subdirectories
    models = out_paths["models"]
    (models / "kl_classifier").mkdir(parents=True, exist_ok=True)
    (models / "knee_segmentation").mkdir(parents=True, exist_ok=True)
    # Pretrained, wheelhouse, manifests
    resolve_path("pretrained").mkdir(parents=True, exist_ok=True)
    resolve_path("wheelhouse").mkdir(parents=True, exist_ok=True)
    resolve_path("manifests").mkdir(parents=True, exist_ok=True)
    resolve_path("logs").mkdir(parents=True, exist_ok=True)

