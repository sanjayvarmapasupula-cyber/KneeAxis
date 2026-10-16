#!/usr/bin/env python3
"""
=============================================================================
KneeAxis — Master Automated Training Orchestrator
=============================================================================
Executes the complete end-to-end medical AI training workflow in one command:
1. Environment & GPU Preflight Check
2. Dataset Discovery & Manifest Validation
3. ResNet50 KL Classification Training & Evaluation
4. GPU Memory Release & Process Isolation
5. 3D U-Net Knee Segmentation Training & Evaluation
6. Saved Model Integrity Verification
7. Export Trained Artifacts to KneeAxis_Trained_Artifacts.zip
8. Final Comprehensive Summary Report

Usage:
  python run_all.py                    # Complete sequential pipeline
  python run_all.py --preflight        # Preflight verification only
  python run_all.py --smoke-test       # Rapid technical verification test
  python run_all.py --resume           # Resume interrupted training from checkpoints
  python run_all.py --max-minutes 120  # Set maximum session wall-clock limit
"""

import os
import sys
import time
import shutil
import logging
import argparse
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

# Ensure UTF-8 output on Windows consoles
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

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.common.paths import (
    load_config,
    get_dataset_paths,
    get_manifest_paths,
    get_output_paths,
    ensure_directories,
    PROJECT_ROOT,
)


def setup_master_logging() -> logging.Logger:
    log_dir = PROJECT_ROOT / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    master_log_file = log_dir / "master_training.log"

    logger = logging.getLogger("KneeAxisMaster")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    fh = logging.FileHandler(str(master_log_file), mode="a", encoding="utf-8")
    fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
    logger.addHandler(fh)

    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(ch)
    return logger


def run_subprocess_stage(cmd: list, log_file: Path, stage_name: str, logger: logging.Logger) -> int:
    """Run a training or evaluation stage in an isolated Python process to ensure clean GPU VRAM release."""
    logger.info(f"\n{'='*70}")
    logger.info(f" >>> LAUNCHING STAGE: {stage_name}")
    logger.info(f" Command: {' '.join(str(c) for c in cmd)}")
    logger.info(f" Persistent Log: {log_file}")
    logger.info(f"{'='*70}\n")

    log_file.parent.mkdir(parents=True, exist_ok=True)
    with open(log_file, "a", encoding="utf-8") as lf:
        lf.write(f"\n--- {stage_name} Started at {time.strftime('%Y-%m-%d %H:%M:%S')} ---\n")
        lf.flush()

        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            cwd=str(PROJECT_ROOT),
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )

        for line in proc.stdout:
            sys.stdout.write(line)
            sys.stdout.flush()
            lf.write(line)
            lf.flush()

        proc.wait()
        lf.write(f"\n--- {stage_name} Finished with exit code {proc.returncode} ---\n")

    if proc.returncode == 0:
        logger.info(f"\n[OK] Stage '{stage_name}' COMPLETED SUCCESSFULLY.")
    else:
        logger.error(f"\n[ERROR] Stage '{stage_name}' FAILED with exit code {proc.returncode}.")

    return proc.returncode


def run_preflight(config: dict, logger: logging.Logger) -> bool:
    logger.info("\n" + "=" * 70)
    logger.info("  KneeAxis — Complete Pre-Flight System Diagnostic")
    logger.info("=" * 70)

    preflight_ok = True

    # 1. Python Version
    logger.info(f"• Python Version:      {sys.version.split()[0]}")
    if sys.version_info < (3, 9) or sys.version_info >= (3, 13):
        logger.warning("  ⚠️  Notice: Python 3.9-3.11 is recommended for TensorFlow GPU stability.")

    # 2. Disk Space
    try:
        total, used, free = shutil.disk_usage(str(PROJECT_ROOT))
        free_gb = free / (1024 ** 3)
        logger.info(f"• Free Disk Space:     {free_gb:.1f} GB")
        if free_gb < 10.0:
            logger.warning(f"  ⚠️  Low disk space ({free_gb:.1f} GB). Medical volumes and checkpoints require >= 15 GB.")
    except Exception as e:
        logger.info(f"• Disk Space:          Unknown ({e})")

    # 3. TensorFlow & GPU Visibility
    try:
        import tensorflow as tf
        logger.info(f"• TensorFlow Version:  {tf.__version__}")
        gpus = tf.config.list_physical_devices("GPU")
        logger.info(f"• Physical GPUs Found: {len(gpus)}")
        for i, g in enumerate(gpus):
            logger.info(f"   - GPU {i}: {g.name}")
        if not gpus:
            if config.get("environment", {}).get("require_gpu", False):
                logger.error("  ❌ ERROR: require_gpu is True, but no GPU was detected by TensorFlow!")
                preflight_ok = False
            else:
                logger.warning("  ⚠️  WARNING: Running on CPU. Training will be substantially slower.")
    except ImportError:
        logger.error("  ❌ ERROR: TensorFlow is not installed!")
        preflight_ok = False

    # 4. Offline Pretrained Weights Check
    pretrained_path = PROJECT_ROOT / config.get("classification", {}).get("pretrained_weights", "pretrained/resnet50_imagenet_notop.h5")
    logger.info(f"• Pretrained Weights:  {pretrained_path.name}")
    if pretrained_path.is_file():
        logger.info(f"   ✅ Local weights verified ({pretrained_path.stat().st_size / (1024*1024):.1f} MB)")
    else:
        if config.get("environment", {}).get("offline", True):
            allow_fallback = config.get("classification", {}).get("allow_random_init_fallback", True)
            if allow_fallback:
                logger.warning(f"   ⚠️  Notice: {pretrained_path} not found. Fallback to random weights enabled.")
            else:
                logger.error(f"   ❌ ERROR: Offline weights not found at {pretrained_path} and random fallback disabled.")
                preflight_ok = False

    # 5. Dataset Directories Check
    ds_paths = get_dataset_paths(config)
    logger.info("\n• Dataset Folders Status:")
    for name, p in ds_paths.items():
        exists_icon = "✅" if p.is_dir() else "❌"
        logger.info(f"   {exists_icon} {name.upper():16s}: {p}")

    # 6. Manifest Check
    mf_paths = get_manifest_paths(config)
    logger.info("\n• Manifests Status:")
    for name, p in mf_paths.items():
        exists_icon = "✅" if p.is_file() else "⚠️  Missing (will generate)"
        logger.info(f"   {exists_icon} {name.upper():16s}: {p}")

    logger.info("\n" + "=" * 70)
    if preflight_ok:
        logger.info("  PRE-FLIGHT STATUS: PASSED. Server is ready for execution.")
    else:
        logger.error("  PRE-FLIGHT STATUS: FAILED. Address critical errors before training.")
    logger.info("=" * 70 + "\n")
    return preflight_ok


def run_smoke_test(logger: logging.Logger) -> bool:
    """Run smoke test suite verifying compilation, forward/backward pass, and checkpointing."""
    logger.info("\n" + "=" * 70)
    logger.info("  KneeAxis — Running Technical Verification Smoke Test")
    logger.info("=" * 70)
    cmd = [sys.executable, str(PROJECT_ROOT / "scripts" / "smoke_test.py")]
    code = run_subprocess_stage(cmd, PROJECT_ROOT / "logs" / "smoke_test.log", "Smoke Test", logger)
    return code == 0


def main():
    parser = argparse.ArgumentParser(description="KneeAxis Master Training Orchestrator")
    parser.add_argument("--config", type=str, default=None, help="Path to master training config YAML")
    parser.add_argument("--preflight", action="store_true", help="Run pre-flight checks only and exit")
    parser.add_argument("--smoke-test", action="store_true", help="Run rapid smoke test and exit")
    parser.add_argument("--resume", action="store_true", help="Resume interrupted training from existing checkpoints")
    parser.add_argument("--allow-cpu", action="store_true", help="Allow CPU execution even if require_gpu is True in config")
    parser.add_argument("--max-minutes", type=float, default=None, help="Override wall-clock training time limit")
    args = parser.parse_args()

    logger = setup_master_logging()
    config_path = Path(args.config) if args.config else None
    config = load_config(config_path)
    if args.allow_cpu:
        if "environment" not in config:
            config["environment"] = {}
        config["environment"]["require_gpu"] = False
    ensure_directories(config)

    # 1. Smoke test mode
    if args.smoke_test:
        smoke_passed = run_smoke_test(logger)
        sys.exit(0 if smoke_passed else 1)

    # 2. Preflight execution
    preflight_passed = run_preflight(config, logger)
    if args.preflight:
        sys.exit(0 if preflight_passed else 1)

    if not preflight_passed and config.get("environment", {}).get("require_gpu", False):
        logger.error("Preflight checks failed on required GPU environment. Aborting.")
        sys.exit(1)

    # 3. Master Sequential Training Pipeline
    start_total_time = time.time()
    logger.info("\n" + "#" * 70)
    logger.info("  KNEEAXIS — LAUNCHING MASTER SEQUENTIAL TRAINING PIPELINE")
    logger.info("#" * 70)

    stage_results = {}

    # Stage A: Dataset Manifest Generation & Discovery
    logger.info("\n[Pipeline Step 1/6] Preparing dataset manifests...")
    prep_cmd = [sys.executable, str(PROJECT_ROOT / "scripts" / "prepare_manifests.py")]
    prep_code = run_subprocess_stage(
        prep_cmd, PROJECT_ROOT / "logs" / "dataset_validation.log", "Manifest Generation", logger
    )
    stage_results["Manifest Generation"] = "SUCCESS" if prep_code == 0 else "WARNING"

    # Stage B: Dataset Validation
    logger.info("\n[Pipeline Step 2/6] Validating dataset integrity...")
    val_cmd = [sys.executable, str(PROJECT_ROOT / "scripts" / "validate_datasets.py")]
    val_code = run_subprocess_stage(
        val_cmd, PROJECT_ROOT / "logs" / "dataset_validation.log", "Dataset Validation", logger
    )
    stage_results["Dataset Validation"] = "SUCCESS" if val_code == 0 else "WARNING"

    # Stage C: Model A — ResNet50 KL Classification
    if config.get("training", {}).get("run_classification", True):
        logger.info("\n[Pipeline Step 3/6] Training ResNet50 KL Classifier...")
        clf_train_cmd = [sys.executable, str(PROJECT_ROOT / "scripts" / "train_classification.py")]
        if args.resume or config.get("training", {}).get("resume_existing", False):
            clf_train_cmd.extend(["--resume", "latest"])
        if args.max_minutes:
            clf_train_cmd.extend(["--max-minutes", str(args.max_minutes)])

        clf_train_code = run_subprocess_stage(
            clf_train_cmd, PROJECT_ROOT / "logs" / "classification.log", "ResNet50 Training", logger
        )
        stage_results["Classification Training"] = "SUCCESS" if clf_train_code == 0 else "FAILED"

        # Evaluate classification
        if clf_train_code == 0:
            logger.info("\n[Pipeline Step 3b/6] Evaluating ResNet50 Classifier...")
            clf_eval_cmd = [sys.executable, str(PROJECT_ROOT / "src" / "classification" / "evaluate.py"), "--dataset", "test"]
            clf_eval_code = run_subprocess_stage(
                clf_eval_cmd, PROJECT_ROOT / "logs" / "evaluation.log", "Classification Evaluation", logger
            )
            stage_results["Classification Evaluation"] = "SUCCESS" if clf_eval_code == 0 else "WARNING"
    else:
        logger.info("\n[Pipeline Step 3/6] Skipping classification (disabled in config).")
        stage_results["Classification Training"] = "SKIPPED"

    # Stage D: Check whether to proceed to segmentation
    if stage_results.get("Classification Training") == "FAILED":
        continue_on_fail = config.get("training", {}).get("continue_on_classification_failure", False)
        if not continue_on_fail:
            logger.error("\n❌ Classification training failed and continue_on_classification_failure is False. Halting.")
            stage_results["Segmentation Training"] = "SKIPPED (Aborted due to Classification failure)"
            _print_summary(stage_results, start_total_time, logger)
            sys.exit(1)

    # Release GPU Memory
    logger.info("\n[Pipeline Step 4/6] Releasing GPU memory between stages...")
    time.sleep(2)

    # Stage E: Model B — 3D U-Net Knee Segmentation
    if config.get("training", {}).get("run_segmentation", True):
        logger.info("\n[Pipeline Step 5/6] Training 3D U-Net Knee Segmentation...")
        seg_train_cmd = [sys.executable, str(PROJECT_ROOT / "scripts" / "train_segmentation.py")]
        if args.resume or config.get("training", {}).get("resume_existing", False):
            seg_train_cmd.extend(["--resume", "latest"])
        if args.max_minutes:
            seg_train_cmd.extend(["--max-minutes", str(args.max_minutes)])

        seg_train_code = run_subprocess_stage(
            seg_train_cmd, PROJECT_ROOT / "logs" / "segmentation.log", "3D U-Net Training", logger
        )
        stage_results["Segmentation Training"] = "SUCCESS" if seg_train_code == 0 else "FAILED"

        # Evaluate segmentation
        if seg_train_code == 0:
            logger.info("\n[Pipeline Step 5b/6] Evaluating 3D U-Net on test volumes...")
            seg_eval_cmd = [sys.executable, str(PROJECT_ROOT / "src" / "segmentation" / "evaluate.py")]
            seg_eval_code = run_subprocess_stage(
                seg_eval_cmd, PROJECT_ROOT / "logs" / "evaluation.log", "Segmentation Evaluation", logger
            )
            stage_results["Segmentation Evaluation"] = "SUCCESS" if seg_eval_code == 0 else "WARNING"
    else:
        logger.info("\n[Pipeline Step 5/6] Skipping segmentation (disabled in config).")
        stage_results["Segmentation Training"] = "SKIPPED"

    # Stage F: Verification & Artifact Export
    logger.info("\n[Pipeline Step 6/6] Verifying models and exporting trained artifacts...")
    ver_cmd = [sys.executable, str(PROJECT_ROOT / "scripts" / "verify_saved_models.py")]
    ver_code = run_subprocess_stage(
        ver_cmd, PROJECT_ROOT / "logs" / "master_training.log", "Model Verification", logger
    )
    stage_results["Model Verification"] = "SUCCESS" if ver_code == 0 else "WARNING"

    if config.get("export", {}).get("enabled", True):
        exp_cmd = [sys.executable, str(PROJECT_ROOT / "scripts" / "export_artifacts.py")]
        exp_code = run_subprocess_stage(
            exp_cmd, PROJECT_ROOT / "logs" / "master_training.log", "Artifact Export", logger
        )
        stage_results["Artifact Export"] = "SUCCESS" if exp_code == 0 else "FAILED"

    # Final summary
    _print_summary(stage_results, start_total_time, logger)


def _print_summary(stage_results: dict, start_time: float, logger: logging.Logger):
    elapsed = time.time() - start_time
    logger.info("\n" + "=" * 70)
    logger.info(f"  KneeAxis — Master Pipeline Execution Summary ({elapsed/60:.1f} minutes)")
    logger.info("=" * 70)

    for stage, status in stage_results.items():
        icon = {
            "SUCCESS": "✅ SUCCESS",
            "FAILED": "❌ FAILED",
            "WARNING": "⚠️  WARNING",
            "SKIPPED": "⚪ SKIPPED",
        }.get(status, status)
        logger.info(f"  • {stage:32s}: {icon}")

    logger.info("-" * 70)
    zip_path = PROJECT_ROOT / "KneeAxis_Trained_Artifacts.zip"
    if zip_path.is_file():
        logger.info(f"📦 Exported Artifacts: {zip_path} ({zip_path.stat().st_size / (1024*1024):.2f} MB)")
        logger.info("   Transfer this ZIP to your local laptop to integrate with KneeAxis.")
    else:
        logger.info("ℹ️  Artifact ZIP was not generated or models did not finish training.")
    logger.info("=" * 70 + "\n")


if __name__ == "__main__":
    main()
