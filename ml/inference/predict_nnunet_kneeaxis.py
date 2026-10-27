"""Strict real nnU-Net v2 inference for KneeAxis research-only NIfTI MRIs.

Invokes the exact local nnUNetv2_predict executable from the selected venv.
No simulated segmentation or ground-truth passthrough exists in this module.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

import numpy as np
import SimpleITK as sitk

LABELS = {1: 'femur', 2: 'femoral_cartilage', 3: 'tibia',
          4: 'medial_tibial_cartilage', 5: 'lateral_tibial_cartilage'}


def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(2 * 1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def read_3d(path):
    image = sitk.ReadImage(str(path))
    if image.GetDimension() != 3 or image.GetNumberOfComponentsPerPixel() != 1:
        raise ValueError('Expected a scalar 3D MRI NIfTI image; 2D, vector, DICOM and CT are unsupported.')
    if min(image.GetSize()) < 32 or any(v <= 0 or not np.isfinite(v) for v in image.GetSpacing()):
        raise ValueError('Invalid dimensions or physical spacing in MRI file.')
    if image.GetPixelID() == getattr(sitk, "sitkLabelUInt8", -123456):
        raise ValueError('Input appears to be a segmentation label image rather than MRI.')
    sample = sitk.GetArrayViewFromImage(image)[::11, ::11, ::11].astype(np.float32, copy=False)
    if np.unique(sample).size <= 8 and np.all(np.isin(sample, [0, 1, 2, 3, 4, 5])):
        raise ValueError('Input resembles a discrete label map, not a raw knee MRI.')
    return image


def verify_geometry(inp, seg):
    # nnU-Net is expected to restore original physical geometry after inference.
    if tuple(inp.GetSize()) != tuple(seg.GetSize()):
        raise ValueError('Predicted mask dimensions differ from original MRI. No reconstruction attempted.')
    if not np.allclose(inp.GetSpacing(), seg.GetSpacing(), atol=1e-4):
        raise ValueError('Predicted mask voxel spacing differs from original MRI.')
    if not np.allclose(inp.GetOrigin(), seg.GetOrigin(), atol=1e-2):
        raise ValueError('Predicted mask origin differs from original MRI.')
    if not np.allclose(inp.GetDirection(), seg.GetDirection(), atol=1e-4):
        raise ValueError('Predicted mask orientation differs from original MRI.')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--input', required=True)
    p.add_argument('--output', required=True)
    p.add_argument('--checkpoint', required=True)
    p.add_argument('--model-folder', required=True)
    p.add_argument('--case-id', required=True)
    p.add_argument('--dataset', default='922')
    p.add_argument('--plans', default='nnUNetPlans_KneeAxis3D_3G')
    p.add_argument('--trainer', default='nnUNetTrainer')
    p.add_argument('--device', choices=['cuda', 'cpu'], default='cuda')
    a = p.parse_args()
    source = Path(a.input).resolve()
    dest = Path(a.output).resolve()
    checkpoint = Path(a.checkpoint).resolve()
    folder = Path(a.model_folder).resolve()
    if not source.is_file() or not source.name.lower().endswith(('.nii', '.nii.gz')):
        raise FileNotFoundError('Input must be an existing .nii/.nii.gz MRI file.')
    if not checkpoint.is_file() or checkpoint.stat().st_size < 1_000_000:
        raise FileNotFoundError('Verified nnU-Net checkpoint missing or unexpectedly small.')
    if not folder.is_dir() or checkpoint.parent.resolve() != folder:
        raise ValueError('Checkpoint must be inside the configured nnU-Net fold_0 folder.')
    if not a.case_id.replace('_', '').replace('-', '').isalnum():
        raise ValueError('Case ID may contain only letters, digits, underscores and hyphens.')

    original = read_3d(source)
    if a.device == 'cuda':
        import torch
        if not torch.cuda.is_available():
            raise RuntimeError('CUDA GPU unavailable: refusing to silently switch to CPU.')

    command = Path(sys.executable).with_name('nnUNetv2_predict.exe' if os.name == 'nt' else 'nnUNetv2_predict')
    if not command.exists():
        raise FileNotFoundError(f'nnUNetv2_predict executable not found in venv: {command}')
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='kneeaxis_inference_') as temp:
        tmp = Path(temp)
        indir, outdir = tmp / 'inputs', tmp / 'predictions'
        indir.mkdir(); outdir.mkdir()
        case_name = 'kneeaxis_scan'
        # Copy, rather than hardlink, to protect original scan data and avoid naming mismatches.
        shutil.copy2(source, indir / f'{case_name}_0000.nii.gz') if source.name.endswith('.nii.gz') else sitk.WriteImage(original, str(indir / f'{case_name}_0000.nii.gz'))
        cmd = [str(command), '-i', str(indir), '-o', str(outdir),
               '-d', str(a.dataset), '-c', '3d_fullres', '-f', '0',
               '-p', a.plans, '-tr', a.trainer, '-chk', checkpoint.name,
               '-device', a.device, '-npp', '1', '-nps', '1', '--not_on_device', '--disable_tta']
        print('KneeAxis: performing real nnU-Net inference without test-time augmentation.', flush=True)
        env = os.environ.copy()
        env['MPLBACKEND'] = 'Agg'
        env['nnUNet_compile'] = 'False'
        if 'nnUNet_results' not in env and 'NNUNET_RESULTS' in env:
            env['nnUNet_results'] = env['NNUNET_RESULTS']
        if 'nnUNet_results' not in env:
            env['nnUNet_results'] = str(folder.parent.parent.parent)
        proc = subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                              env=env)
        if proc.returncode != 0:
            print(proc.stdout[-15000:], file=sys.stderr, flush=True)
            raise RuntimeError(f'nnUNetv2_predict exited with code {proc.returncode}')
        predicted = outdir / f'{case_name}.nii.gz'
        if not predicted.is_file():
            raise FileNotFoundError('nnU-Net finished but produced no NIfTI mask.')
        mask = sitk.ReadImage(str(predicted))
        verify_geometry(original, mask)
        array = sitk.GetArrayViewFromImage(mask)
        unique = set(np.unique(array).astype(int))
        if not unique.issubset(set(LABELS) | {0}) or unique == {0}:
            raise ValueError(f'Invalid/empty segmentation labels: {sorted(unique)}')
        counts = {name: int(np.count_nonzero(array == label)) for label, name in LABELS.items()}
        if counts['femur'] == 0 or counts['tibia'] == 0:
            raise ValueError('Model did not predict both femur and tibia. Mask rejected.')
        # Atomic replace: completed verification happens before the published mask changes.
        staged = dest.with_name(dest.name + '.ready.nii.gz')
        shutil.copy2(predicted, staged)
        os.replace(staged, dest)

    evidence = {
        'status': 'research_only_unreviewed', 'case_id': a.case_id,
        'source_name': source.name, 'source_sha256': sha256(source),
        'prediction_sha256': sha256(dest), 'checkpoint_sha256': sha256(checkpoint),
        'checkpoint_name': checkpoint.name, 'dataset': str(a.dataset),
        'fold': 0, 'plans': a.plans, 'trainer': a.trainer,
        'tta_enabled': False, 'device': a.device,
        'created_utc': datetime.now(timezone.utc).isoformat(),
        'spacing_mm_xyz': list(mask.GetSpacing()),
        'image_size_xyz': list(mask.GetSize()),
        'label_voxels': counts,
        'warning': 'Not clinically validated. No per-case Dice is available without an independent reference mask.',
    }
    manifest = dest.parent / 'prediction_provenance.json'
    with open(manifest, 'w', encoding='utf-8') as f:
        json.dump(evidence, f, indent=2)
    print(json.dumps({'output': str(dest), 'provenance': str(manifest), 'label_voxels': counts}))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'KNEEAXIS INFERENCE FAILED: {type(exc).__name__}: {exc}', file=sys.stderr)
        sys.exit(1)
