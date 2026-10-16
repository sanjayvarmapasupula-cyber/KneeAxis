#!/usr/bin/env python3
"""
KneeAxis — Resumption Helper Script
===================================
Inspects existing runs, shows previous progress, and safely resumes training
for classification or 3D segmentation from the latest or a specified checkpoint.

Usage:
  python scripts/resume_training.py --task classification --latest
  python scripts/resume_training.py --task segmentation --run-id 20261013_140000
  python scripts/resume_training.py --task classification --list
"""

import sys
import json
import argparse
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.common.paths import load_config, resolve_path
from src.common.checkpoint_manager import CheckpointManager


def list_available_runs(task: str, config: dict):
    ckpt_base = resolve_path(config["paths"]["checkpoints"], PROJECT_ROOT) / task
    if not ckpt_base.exists():
        print(f"No checkpoint directory found for task '{task}' at: {ckpt_base}")
        return []

    runs = []
    for item in sorted(ckpt_base.iterdir()):
        if item.is_dir():
            state_file = item / "checkpoint_state.json"
            if state_file.exists():
                try:
                    with open(state_file, "r") as f:
                        data = json.load(f)
                    runs.append((item.name, data))
                except Exception:
                    runs.append((item.name, {}))
            else:
                runs.append((item.name, {}))
    return runs


def print_runs(task: str, runs):
    print(f"\n========================================================")
    print(f" Available Checkpoint Runs for Task: {task.upper()}")
    print(f"========================================================")
    if not runs:
        print("  (No existing runs found)")
        return

    for run_id, state in runs:
        epoch = state.get("epoch", "N/A")
        best_val = state.get("best_val_metric", "N/A")
        metric_name = state.get("metric_name", "metric")
        created = state.get("timestamp", "N/A")
        print(f"  • Run ID: {run_id}")
        print(f"    - Epochs Completed: {epoch}")
        print(f"    - Best {metric_name}: {best_val}")
        print(f"    - Last Updated: {created}")
        print()


def main():
    parser = argparse.ArgumentParser(description="KneeAxis Training Resumption Utility")
    parser.add_argument("--task", choices=["classification", "segmentation"], required=True,
                        help="Task type: 'classification' or 'segmentation'")
    parser.add_argument("--run-id", type=str, default=None,
                        help="Specific run ID timestamp (e.g. 20261013_120000)")
    parser.add_argument("--latest", action="store_true",
                        help="Resume the most recent run automatically")
    parser.add_argument("--list", action="store_true",
                        help="List all existing checkpoint runs and exit")
    parser.add_argument("--max-minutes", type=float, default=None,
                        help="Override maximum session training time (minutes)")
    parser.add_argument("--config", type=str, default=None,
                        help="Path to config.yaml")

    args = parser.parse_args()
    config_path = Path(args.config) if args.config else None
    config = load_config(config_path)

    runs = list_available_runs(args.task, config)

    if args.list:
        print_runs(args.task, runs)
        return

    target_run_id = args.run_id
    if args.latest:
        if not runs:
            print(f"Error: No existing runs found to resume for task '{args.task}'.")
            sys.exit(1)
        target_run_id = runs[-1][0]
        print(f"Selected latest run: {target_run_id}")

    if not target_run_id:
        print("Error: You must specify either --run-id <ID>, --latest, or --list.")
        print_runs(args.task, runs)
        sys.exit(1)

    # Check target run exists
    target_state_file = resolve_path(config["paths"]["checkpoints"], PROJECT_ROOT) / args.task / target_run_id / "checkpoint_state.json"
    if not target_state_file.exists():
        print(f"Error: Checkpoint state file not found: {target_state_file}")
        sys.exit(1)

    with open(target_state_file, "r") as f:
        state_data = json.load(f)

    print(f"\n========================================================")
    print(f" Resuming {args.task.upper()} run: {target_run_id}")
    print(f" Last recorded epoch: {state_data.get('epoch', 'N/A')}")
    print(f" Best metric: {state_data.get('best_val_metric', 'N/A')}")
    print(f"========================================================\n")

    if args.task == "classification":
        from src.classification.train import train_classification
        train_classification(config_path=config_path, resume_run_id=target_run_id, max_minutes=args.max_minutes)
    else:
        from src.segmentation.train import train_segmentation
        train_segmentation(config_path=config_path, resume_run_id=target_run_id, max_minutes=args.max_minutes)


if __name__ == "__main__":
    main()
