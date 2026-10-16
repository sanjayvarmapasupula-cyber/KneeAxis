# KneeAxis — College GPU Server Troubleshooting Guide

This guide addresses common errors and operational hurdles encountered when training deep learning models on shared university GPU clusters and JupyterHub environments.

---

## 1. CUDA Out of Memory (OOM) Errors

### Symptoms:
```text
ResourceExhaustedError: OOM when allocating tensor with shape [...]
```

### Solutions:
1. **Enable Dynamic Memory Growth**:
   KneeAxis automatically attempts this in `src/common/gpu_utils.py`. You can verify it by checking `environment_check.py`.
2. **Reduce Batch Size in `config.yaml`**:
   - For 2D Classification: reduce `batch_size` from `32` to `16` or `8`.
   - For 3D Segmentation: reduce `batch_size` from `2` to `1`.
3. **Reduce 3D Patch Size**:
   In `config.yaml`, change `patch_size: [64, 64, 64]` or `base_filters: 16` to `base_filters: 8`.
4. **Kill Lingering Processes**:
   If another kernel or student is holding VRAM:
   ```bash
   nvidia-smi
   # If you own the process ID:
   kill -9 <PID>
   ```

---

## 2. Kernel Crashes or "Process Killed" (SIGKILL)

### Cause A: System RAM (CPU Memory) Exhausted
- 3D MRI volumes are large. If the data loader attempts to load too many volumes into CPU RAM simultaneously, the Linux kernel Out-Of-Memory (OOM) killer will terminate the process.
- **Fix**: KneeAxis streams volumes on-demand using generators in `src/segmentation/preprocessing.py`. Ensure `cache_in_memory: false` if system RAM is limited.

### Cause B: Wall-clock Time Limit Exceeded
- University job schedulers (e.g., Slurm, PBS) will kill tasks exceeding allocated time limits.
- **Fix**: Use `--max-minutes <N>` or `scripts/resume_training.py` to ensure graceful saving before time limits expire.

---

## 3. Jupyter Notebook Using Wrong Python Kernel

### Symptoms:
```text
ModuleNotFoundError: No module named 'tensorflow'
```
Even after running `pip install -r requirements-college.txt`.

### Solution:
Your Jupyter notebook is executing using the server's global Python environment rather than your newly installed virtual environment.
1. Run in terminal:
   ```bash
   python -m ipykernel install --user --name=kneeaxis_env --display-name "Python (KneeAxis GPU)"
   ```
2. In Jupyter, click **Kernel $\rightarrow$ Change Kernel $\rightarrow$ Python (KneeAxis GPU)**.
3. Restart the kernel and run the first cell.

---

## 4. Permission Denied or Disk Quota Exceeded

### Symptoms:
```text
OSError: [Errno 122] Disk quota exceeded
```

### Solution:
University home directories (`~`) often have strict 5GB or 10GB quotas, while high-performance scratch storage (`/scratch` or `/data`) has terabytes of room.
1. Check your disk usage:
   ```bash
   quota -s
   df -h
   ```
2. Symlink `datasets/` and `checkpoints/` to the scratch partition:
   ```bash
   mkdir -p /scratch/$USER/kneeaxis_data
   ln -s /scratch/$USER/kneeaxis_data datasets
   ```
3. Update `paths` in `config.yaml` to point to `/scratch/$USER/...`.

---

## 5. Loss is NaN or Not Decreasing

### Causes & Fixes:
1. **Learning Rate Too High**:
   During Stage 2 fine-tuning of ResNet50, high learning rates disrupt pretrained weights. Ensure `fine_tune_lr: 0.0001` or lower.
2. **Extreme Intensity Outliers in MRI Volumes**:
   KneeAxis applies Z-score normalization with outlier clipping ($[p_1, p_{99}]$) in `src/segmentation/preprocessing.py`. Verify that your input NIfTI volumes are not corrupted.
3. **Empty Background Patches**:
   Ensure `foreground_prob: 0.7` in `config.yaml` so the patch extractor selects patches containing bone and cartilage.
