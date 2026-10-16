"""
KneeAxis — Checkpoint Manager
===============================
Manages training checkpoints: saving, loading, resume detection,
run-ID generation, and atomic writes.
"""

import os
import json
import shutil
import hashlib
import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple


def generate_run_id(prefix: str = "run") -> str:
    """Generate a unique run ID with timestamp."""
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{ts}"


class CheckpointManager:
    """
    Manages checkpoints for a single model (classification or segmentation).

    Directory layout per run::

        checkpoints/<task>/
        └── <run_id>/
            ├── best.weights.h5
            ├── latest.weights.h5
            ├── training_state.json
            └── history.json

    Parameters
    ----------
    checkpoint_dir : Path
        Root checkpoint directory (e.g. ``checkpoints/classification``).
    run_id : str or None
        Unique identifier. Auto-generated if None.
    """

    def __init__(self, checkpoint_dir: Path, run_id: Optional[str] = None):
        self.run_id = run_id or generate_run_id()
        self.run_dir = Path(checkpoint_dir) / self.run_id
        self.run_dir.mkdir(parents=True, exist_ok=True)

        self.best_path = self.run_dir / "best.weights.h5"
        self.latest_path = self.run_dir / "latest.weights.h5"
        self.state_path = self.run_dir / "training_state.json"
        self.history_path = self.run_dir / "history.json"
        self.best_metric_path = self.run_dir / "best_metric.json"

    # ----- State persistence --------------------------------------------------

    def save_training_state(
        self,
        epoch: int,
        global_step: int,
        best_val_metric: float,
        best_metric_name: str,
        seed: int,
        split_info: Optional[Dict] = None,
        extra: Optional[Dict] = None,
    ) -> Path:
        """Save training state as JSON (atomic write)."""
        state = {
            "run_id": self.run_id,
            "epoch": epoch,
            "global_step": global_step,
            "best_val_metric": best_val_metric,
            "best_metric_name": best_metric_name,
            "seed": seed,
            "split_info": split_info or {},
            "timestamp": datetime.datetime.now().isoformat(),
        }
        if extra:
            state.update(extra)

        tmp = self.state_path.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)
        tmp.replace(self.state_path)  # atomic on most filesystems
        return self.state_path

    def load_training_state(self) -> Optional[Dict[str, Any]]:
        """Load training state if it exists."""
        if not self.state_path.is_file():
            return None
        with open(self.state_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # ----- History persistence ------------------------------------------------

    def save_history(self, history: Dict[str, list]) -> Path:
        """Save Keras-style training history."""
        tmp = self.history_path.with_suffix(".tmp")
        # Convert numpy types to native Python
        clean = {}
        for k, v in history.items():
            clean[k] = [float(x) if hasattr(x, "item") else x for x in v]
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(clean, f, indent=2)
        tmp.replace(self.history_path)
        return self.history_path

    def load_history(self) -> Optional[Dict[str, list]]:
        if not self.history_path.is_file():
            return None
        with open(self.history_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # ----- Resumption detection -----------------------------------------------

    def can_resume(self) -> bool:
        """Check whether a resumable checkpoint exists."""
        return self.latest_path.is_file() and self.state_path.is_file()

    def find_latest_run(self, checkpoint_root: Path) -> Optional["CheckpointManager"]:
        """
        Scan ``checkpoint_root`` for the most recent run that can be resumed.
        """
        if not checkpoint_root.is_dir():
            return None

        candidates = []
        for d in sorted(checkpoint_root.iterdir(), reverse=True):
            if d.is_dir():
                cm = CheckpointManager(checkpoint_root, run_id=d.name)
                if cm.can_resume():
                    candidates.append(cm)

        return candidates[0] if candidates else None

    # ----- Weight file management ---------------------------------------------

    def copy_best_to_final(self, final_dir: Path) -> Optional[Path]:
        """
        Copy the best weights to a final model directory.
        Returns the destination path, or None if no best weights exist.
        """
        if not self.best_path.is_file():
            return None
        final_dir.mkdir(parents=True, exist_ok=True)
        dest = final_dir / "best.weights.h5"
        shutil.copy2(str(self.best_path), str(dest))
        return dest

    # ----- Checksums ----------------------------------------------------------

    @staticmethod
    def sha256(filepath: Path) -> str:
        """Compute SHA-256 hash of a file."""
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()


def compute_sha256(filepath: Path) -> str:
    """Compute SHA-256 hash of a file."""
    return CheckpointManager.sha256(filepath)

