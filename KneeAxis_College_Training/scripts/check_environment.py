#!/usr/bin/env python3
"""
Environment Diagnostic Tool for KneeAxis College GPU Server.
Checks Python version, PyPI packages, GPU visibility, CUDA/cuDNN support,
and scratch/checkpoint disk storage.
"""
import sys
from pathlib import Path

# Add project root to path
pkg_root = Path(__file__).resolve().parent.parent
if str(pkg_root) not in sys.path:
    sys.path.insert(0, str(pkg_root))

from environment_check import main

if __name__ == "__main__":
    sys.exit(main())
