# KneeAxis — College JupyterHub Offline Environment Setup & Execution Guide

This guide is tailored specifically for deploying and running KneeAxis on intranet university GPU clusters and JupyterHub environments **without external internet access**.

---

## 1. Upload & Unpack on JupyterHub

From your college JupyterHub dashboard:
1. Upload `KneeAxis_College_Training_Offline_Complete.zip`.
2. Open a **Terminal** and extract:
```bash
unzip KneeAxis_College_Training_Offline_Complete.zip -d KneeAxis_College_Training
cd KneeAxis_College_Training
```

Ensure workspace permissions:
```bash
chmod -R u+rwX .
```

---

## 2. Server Assessment & Hardware Inspection

Verify GPU visibility and driver version:
```bash
nvidia-smi
```
Verify:
- GPU model (e.g., A100, RTX 3090/4090, V100, T4)
- Available VRAM
- Driver & CUDA runtime version

---

## 3. Preserving College Environment & Offline Packages

> [!IMPORTANT]
> **Check before installing anything**: If TensorFlow with GPU support is already installed on your college server (or accessible via `module load tensorflow` / `module load cuda`), **preserve it!** Do not reinstall or upgrade TensorFlow.

Run the diagnostic:
```bash
python run_all.py --preflight
```

### If required packages are missing (Offline Installation via Wheelhouse):
Because the server has no internet access, do NOT run `pip install` against PyPI. Use the pre-populated wheelhouse:
```bash
python -m pip install \
  --no-index \
  --find-links=wheelhouse \
  -r requirements-college.txt
```

---

## 4. Registering the Environment as a Jupyter Kernel

To enable this environment inside the master notebook `Run_All_Training.ipynb`:
```bash
python -m ipykernel install --user --name=kneeaxis_env --display-name "Python (KneeAxis GPU)"
```

In JupyterHub, open `Run_All_Training.ipynb` and select:
**Kernel $\rightarrow$ Change Kernel $\rightarrow$ Python (KneeAxis GPU)**.

---

## 5. Session Safety: Running with `tmux` Against Browser Disconnects

> [!WARNING]
> **Browser Disconnect vs. Process Termination**:
> If you run a long training job directly inside a browser tab or notebook cell, closing your laptop or losing intranet Wi-Fi will terminate the Jupyter session and kill your training process!

To ensure training continues unattended on the server, use a `tmux` session:

### Step 1: Start a Persistent Session
```bash
tmux new -s kneeaxis
cd KneeAxis_College_Training
```

### Step 2: Launch the Master Orchestrator
```bash
python run_all.py
```
*(Or if running on a time-limited job: `python run_all.py --max-minutes 120`)*

### Step 3: Detach from the Session
Press `Ctrl + B`, release both keys, then press `D`.
You can now safely close your browser or disconnect from the intranet.

### Step 4: Reattach Anytime to Check Progress
```bash
tmux attach -t kneeaxis
```

---

## 6. Real-Time Log Monitoring

You can tail the training logs from any terminal window:
```bash
# Monitor master orchestrator
tail -f logs/master_training.log

# Monitor classification progress
tail -f logs/classification.log

# Monitor segmentation progress
tail -f logs/segmentation.log
```

---

## 7. Storage Quotas & Safe Resumption

University home directories (`~`) often enforce 5–10 GB quotas, while `/scratch` or `/tmp` offer hundreds of gigabytes.
- If disk space is tight, symlink `checkpoints/` and `datasets/` to your designated scratch directory:
  ```bash
  mkdir -p /scratch/$USER/kneeaxis_storage
  ln -s /scratch/$USER/kneeaxis_storage checkpoints
  ```
- If a session is preempted or interrupted, resume seamlessly without lost progress:
  ```bash
  python run_all.py --resume
  ```
