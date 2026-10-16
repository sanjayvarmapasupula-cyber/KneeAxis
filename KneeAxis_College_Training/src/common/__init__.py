"""
KneeAxis — Common Utilities Package
Exposes paths, gpu_utils, metrics, and checkpoint_manager.
"""
from src.common.paths import (
    find_project_root,
    PROJECT_ROOT,
    load_config,
    resolve_path,
    get_dataset_paths,
    get_manifest_paths,
    get_output_paths,
    ensure_directories,
)
from src.common.gpu_utils import (
    configure_gpu_memory_growth,
    get_gpu_info,
    check_gpu_availability,
)
from src.common.metrics import (
    quadratic_weighted_kappa,
    classification_report,
    dice_coefficient,
    per_class_dice,
    segmentation_report,
)
from src.common.checkpoint_manager import (
    CheckpointManager,
    compute_sha256,
    generate_run_id,
)
