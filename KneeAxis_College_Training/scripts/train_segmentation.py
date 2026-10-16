#!/usr/bin/env python3
"""
KneeAxis — Top-level 3D Segmentation Training CLI
==================================================
Runs the 3D U-Net OAIZIB-CM segmentation training pipeline with 6 anatomical classes,
sliding-window/patch extraction, combined Dice+CE loss, and atomic checkpointing.

Usage:
  python scripts/train_segmentation.py
  python scripts/train_segmentation.py --max-minutes 120
  python scripts/train_segmentation.py --resume 20261013_150000
"""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.segmentation.train import main

if __name__ == "__main__":
    main()
