"""
KneeAxis — Dataset Manifest Generator & Discovery
===================================================
Automatically discovers dataset files, matches annotations, validates
subject identifiers and KL grades, and generates reproducible manifests
stored with relative forward-slash paths for cross-platform portability.
"""

import sys
import csv
from pathlib import Path
from typing import Optional, Dict, Any, List

# Fix Windows console unicode issues
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.common.paths import (
    load_config,
    get_dataset_paths,
    get_manifest_paths,
    resolve_path,
    PROJECT_ROOT,
)


def _to_rel_path(path: Path) -> str:
    """Convert path to forward-slash string relative to PROJECT_ROOT."""
    try:
        rel = path.resolve().relative_to(PROJECT_ROOT.resolve())
        return str(rel).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


def discover_annotation_file(dataset_dir: Path) -> Optional[Path]:
    """Search dataset directory for candidate annotation CSV/TSV files."""
    candidate_names = [
        "annotations", "clinical", "grades", "labels", "metadata",
        "oai_kl_grades", "most_kl_grades", "kellgren_lawrence"
    ]
    for ext in ["*.csv", "*.tsv", "*.txt"]:
        for f in dataset_dir.rglob(ext):
            stem_lower = f.stem.lower()
            if any(cand in stem_lower for cand in candidate_names):
                return f
    # Fallback: check any CSV directly in dataset_dir or annotations/
    direct_csvs = list(dataset_dir.glob("*.csv")) + list((dataset_dir / "annotations").glob("*.csv"))
    if direct_csvs:
        return direct_csvs[0]
    return None


def prepare_oai_manifest(
    oai_root: Path,
    output_path: Path,
    grade_file: Optional[Path] = None,
) -> int:
    """
    Generate OAI manifest CSV: path, subject_id, grade.
    Matches image files with genuine clinical grade annotations.
    """
    oai_root = Path(oai_root)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    image_exts = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".dcm"}

    images = sorted([
        f for f in oai_root.rglob("*")
        if f.is_file() and f.suffix.lower() in image_exts
    ])

    if not images:
        print(f"[Prepare Manifest] No images found in: {oai_root}")
        return 0

    if grade_file is None or not Path(grade_file).is_file():
        grade_file = discover_annotation_file(oai_root)

    mapping_report_path = PROJECT_ROOT / "manifests" / "MAPPING_REPORT.md"

    if grade_file and Path(grade_file).is_file():
        print(f"[Prepare Manifest] Discovered annotation table: {grade_file.name}")
        grade_map = {}
        with open(grade_file, "r", encoding="utf-8", errors="replace") as f:
            # Check delimiter
            sample = f.read(2048)
            f.seek(0)
            delimiter = "\t" if "\t" in sample and "," not in sample else ","
            reader = csv.DictReader(f, delimiter=delimiter)

            # Discover column names
            headers = [h.strip() for h in (reader.fieldnames or [])]
            subj_col = next((h for h in headers if h.lower() in ["subject_id", "id", "patid", "patient_id"]), None)
            grade_col = next((h for h in headers if h.lower() in ["grade", "kl_grade", "v00kl", "kl", "klg", "xrkl"]), None)
            file_col = next((h for h in headers if h.lower() in ["image_filename", "filename", "path", "file"]), None)
            side_col = next((h for h in headers if h.lower() in ["side", "knee", "laterality"]), None)

            if not subj_col or not grade_col:
                report_text = (
                    f"# OAI Annotation Mapping Report\n\n"
                    f"**Annotation File Checked:** `{grade_file}`\n\n"
                    f"**Headers Found:** `{headers}`\n\n"
                    f"**Issue:** Could not unambiguously determine Subject ID column or KL Grade column.\n"
                    f"- Candidate Subject Column: `{subj_col}`\n"
                    f"- Candidate Grade Column: `{grade_col}`\n\n"
                    f"Please provide a CSV with columns: `image_filename,subject_id,grade`.\n"
                )
                with open(mapping_report_path, "w", encoding="utf-8") as rf:
                    rf.write(report_text)
                print(f"[WARNING] Ambiguous annotation headers in {grade_file.name}. Written {mapping_report_path}")
                return 0

            for row in reader:
                s_id = str(row.get(subj_col, "")).strip()
                raw_g = str(row.get(grade_col, "")).strip()
                try:
                    g_val = int(float(raw_g))
                except (ValueError, TypeError):
                    continue
                if g_val < 0 or g_val > 4:
                    continue

                if file_col and row.get(file_col):
                    key = Path(str(row[file_col])).name
                    grade_map[key] = {"subject_id": s_id, "grade": g_val}
                elif side_col and row.get(side_col):
                    side = str(row[side_col]).strip().upper()
                    grade_map[f"{s_id}_{side}"] = {"subject_id": s_id, "grade": g_val}
                else:
                    grade_map[s_id] = {"subject_id": s_id, "grade": g_val}

        count = 0
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["path", "subject_id", "grade"])
            for img in images:
                # Match by filename
                info = grade_map.get(img.name)
                # Match by stem
                if not info:
                    info = grade_map.get(img.stem)
                # Match by subject prefix
                if not info:
                    for s_key in grade_map:
                        if img.name.startswith(s_key):
                            info = grade_map[s_key]
                            break

                if info:
                    writer.writerow([_to_rel_path(img), info["subject_id"], info["grade"]])
                    count += 1

        print(f"✅ OAI manifest created: {output_path} ({count} verified entries)")
        return count

    else:
        # Create template manifest for user
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["path", "subject_id", "grade"])
            for img in images:
                parts = img.relative_to(oai_root).parts
                subj_guess = parts[0] if len(parts) > 1 else img.stem
                writer.writerow([_to_rel_path(img), subj_guess, ""])

        print(f"⚠️  Template OAI manifest created at: {output_path} ({len(images)} images).")
        print("   Fill in verified KL grades (0-4) before starting training.")
        return 0


def prepare_oaizib_manifest(oaizib_root: Path, output_path: Path) -> int:
    """
    Generate OAIZIB-CM manifest CSV: case_id, image, label, split.
    Matches 3D image volumes with paired ground truth segmentation masks.
    """
    oaizib_root = Path(oaizib_root)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    count = 0
    errors = []

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["case_id", "image", "label"])

        for split in ["Tr", "Ts"]:
            img_dir = oaizib_root / f"images{split}"
            lbl_dir = oaizib_root / f"labels{split}"

            if not img_dir.is_dir() or not lbl_dir.is_dir():
                continue

            img_files = sorted(list(img_dir.glob("*.nii*")))
            for img_file in img_files:
                stem = img_file.name
                lbl_file = lbl_dir / stem
                if not lbl_file.is_file():
                    for alt_stem in [
                        stem,
                        stem.replace("_0000", ""),
                        stem.replace(".nii.gz", "_seg.nii.gz"),
                        stem.replace(".nii.gz", "_label.nii.gz"),
                    ]:
                        candidate = lbl_dir / alt_stem
                        if candidate.is_file():
                            lbl_file = candidate
                            break

                if lbl_file.is_file():
                    case_id = img_file.name.replace(".nii.gz", "").replace(".nii", "")
                    writer.writerow([case_id, _to_rel_path(img_file), _to_rel_path(lbl_file)])
                    count += 1
                else:
                    errors.append(f"No matching label for image: {img_file.name}")

    if errors:
        print(f"[Prepare Manifest] Notice: {len(errors)} unpaired scans in OAIZIB-CM.")
    print(f"✅ OAIZIB-CM manifest created: {output_path} ({count} volume pairs)")
    return count


def build_oaizib_manifest(oaizib_root: Path, output_path: Path) -> int:
    """Alias for prepare_oaizib_manifest."""
    return prepare_oaizib_manifest(oaizib_root, output_path)


def build_all_manifests(config: Optional[Dict[str, Any]] = None):
    """Build all manifests for available datasets."""
    cfg = config or load_config()
    ds_paths = get_dataset_paths(cfg)
    mf_paths = get_manifest_paths(cfg)

    print("\n" + "=" * 60)
    print("  KneeAxis — Automated Dataset Discovery & Manifest Builder")
    print("=" * 60)

    if ds_paths["oai"].is_dir():
        prepare_oai_manifest(ds_paths["oai"], mf_paths["oai"])
    if ds_paths["oaizib"].is_dir():
        prepare_oaizib_manifest(ds_paths["oaizib"], mf_paths["oaizib"])
    if ds_paths["most"].is_dir():
        prepare_oai_manifest(ds_paths["most"], mf_paths["most"])


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Prepare dataset manifests")
    parser.add_argument("--config", type=str, default=None)
    parser.add_argument("--grade-file", type=str, default=None)
    args = parser.parse_args()

    cfg = load_config(Path(args.config) if args.config else None)
    build_all_manifests(cfg)


if __name__ == "__main__":
    main()
