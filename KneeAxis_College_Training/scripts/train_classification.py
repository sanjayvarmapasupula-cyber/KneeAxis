#!/usr/bin/env python3
"""
KneeAxis — Top-level Classification Training CLI
==================================================
Runs the ResNet50 KL grade training pipeline with subject-level splitting,
loss weighting, time limits, and checkpoint management.

Usage:
  python scripts/train_classification.py
  python scripts/train_classification.py --max-minutes 90
  python scripts/train_classification.py --resume 20261013_140000
"""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.classification.train import main

if __name__ == "__main__":
    main()
