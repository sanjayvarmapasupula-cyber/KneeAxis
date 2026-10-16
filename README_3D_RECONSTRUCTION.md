# Clinical Atlas: 3D Knee Reconstruction Module

An independent, CPU-compatible 3D reconstruction engine for patient-specific knee anatomy and arthroplasty planning.

> **Design Principle:** This module is completely decoupled from model training. It operates strictly on 3D medical image segmentation masks (`.nii` / `.nii.gz`), whether they come from ground-truth dataset annotations today or TensorFlow 3D U-Net predictions tomorrow.

---

## 1. Architectural Overview

```
                      [ MRI / CT Volume ]
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
   [ Ground Truth NIfTI ]          [ TensorFlow Model ] (Future)
  (ground_truth_seg.nii.gz)                  │
               │                   [ predicted_seg.nii.gz ]
               │                             │
               └──────────────┬──────────────┘
                              ▼
        ┌───────────────────────────────────────────┐
        │   3D Reconstruction Engine (reconstruct3d)│
        │   - Read Spacing, Origin, Direction       │
        │   - Configurable Multi-Label Extraction   │
        │   - Connected Component Noise Filtering   │
        │   - Marching Cubes Surface Generation     │
        │   - Physical Coordinate Mapping (mm)      │
        │   - Taubin Anti-Shrinkage Smoothing       │
        │   - Dual Mesh Export (Raw & Smoothed)     │
        │   - Comprehensive Mesh QA & Volume Drift  │
        └─────────────────────┬─────────────────────┘
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
   [ 3D Meshes (STL / OBJ) ]        [ Manifest & QA Reports ]
   - femur_smooth.stl / .obj         - mesh_qa.json
   - tibia_smooth.stl / .obj         - mesh_manifest.json
   - cartilage_smooth.stl / .obj
             │
             ▼
   [ FastAPI Backend / Three.js Frontend Viewer ]
   - Arthroplasty Planning & Landmark Extraction
```

---

## 2. Key Modules & Purpose

| File | Purpose |
| :--- | :--- |
| [`reconstruction3d/__init__.py`](file:///d:/SDC_2/ROSA_NEW/reconstruction3d/__init__.py) | Package initialization; exposes the public API (`generate_meshes`, `load_medical_image`, etc.). |
| [`reconstruction3d/medical_image_utils.py`](file:///d:/SDC_2/ROSA_NEW/reconstruction3d/medical_image_utils.py) | Reads spatial metadata (spacing, origin, direction cosine matrix, affine), validates volumes, calculates voxel counts, and filters noise components. |
| [`reconstruction3d/mesh_utils.py`](file:///d:/SDC_2/ROSA_NEW/reconstruction3d/mesh_utils.py) | Executes `skimage.measure.marching_cubes`, transforms voxel indices into physical millimeters (LPS), applies Taubin anti-shrinkage smoothing, and exports STL/OBJ files. |
| [`reconstruction3d/mesh_qa.py`](file:///d:/SDC_2/ROSA_NEW/reconstruction3d/mesh_qa.py) | Calculates geometric and topological QA metrics (vertices, faces, surface area, enclosed volume, bounding box, watertightness, Euler characteristic, and percentage volume drift). |
| [`reconstruction3d/reconstruct_3d.py`](file:///d:/SDC_2/ROSA_NEW/reconstruction3d/reconstruct_3d.py) | Main pipeline orchestrator, Python API (`generate_meshes`), and Command-Line Interface (CLI). |
| [`reconstruction3d/labels.json`](file:///d:/SDC_2/ROSA_NEW/reconstruction3d/labels.json) | Configurable label mapping dictionary. Supports OAIZIB-CM or any custom labeling protocol. |
| [`notebooks/Test_3D_Reconstruction.ipynb`](file:///d:/SDC_2/ROSA_NEW/notebooks/Test_3D_Reconstruction.ipynb) | Interactive 9-cell Jupyter notebook demonstrating inspection, reconstruction, QA auditing, and 3D visualization. |
| [`requirements_3d.txt`](file:///d:/SDC_2/ROSA_NEW/requirements_3d.txt) | Minimal, CPU-compatible dependencies. |

---

## 3. Physical Coordinate Calibration (Critical)

In medical imaging, voxels do not represent unit cubes; they have non-isotropic spacing, arbitrary spatial origins, and non-trivial orientation cosines.

If voxel indices $(i, j, k)$ were directly treated as mesh coordinates:
- The knee would be distorted (stretched or flattened along the slice direction).
- Left-right or anterior-posterior axes would be inverted.
- Surgical measurements (distances, angles, resection depths) would be invalid.

### Mathematical Coordinate Transformation:
For an image with direction cosine matrix $D_{3 \times 3}$, voxel spacing $S = \text{diag}(s_x, s_y, s_z)$, and origin $O = (o_x, o_y, o_z)^T$:

$$\begin{pmatrix} X_{phys} \\ Y_{phys} \\ Z_{phys} \end{pmatrix} = D \begin{pmatrix} s_x & 0 & 0 \\ 0 & s_y & 0 \\ 0 & 0 & s_z \end{pmatrix} \begin{pmatrix} i \\ j \\ k \end{pmatrix} + \begin{pmatrix} o_x \\ o_y \\ o_z \end{pmatrix}$$

Because NumPy/SimpleITK arrays are indexed in $(Z, Y, X)$ order, the pipeline maps array indices $(v_z, v_y, v_x)$ from Marching Cubes to $(i, j, k) = (v_x, v_y, v_z)$ before multiplying by the affine transformation matrix. Furthermore, if $\det(D) < 0$, normal winding order is preserved so outward-facing normals remain strictly outward.

---

## 4. Taubin Anti-Shrinkage Smoothing

Standard Laplacian smoothing iteratively pulls each vertex toward the centroid of its neighbors:

$$V^{t+1} = V^t + \lambda L(V^t)$$

While this removes staircase artifacts from voxel grids, it causes severe volume shrinkage (eroding bone edges and cartilage thickness).

**Taubin Smoothing** alternates between two steps with opposing scale factors ($\lambda > 0$ and $\nu < -\lambda$):

1. **Shrinkage step:** $V^{t + 1/2} = V^t + \lambda L(V^t)$
2. **Expansion step:** $V^{t+1} = V^{t + 1/2} + \nu L(V^{t + 1/2})$

With $\lambda = 0.5$, $\nu = -0.53$, and 20 iterations, high-frequency voxel noise is attenuated like a low-pass filter while preserving the macroscopic volume (volume drift typically $< 1\%$).

The pipeline preserves both the **raw** mesh (`*_raw.stl`) and the **smoothed** mesh (`*_smooth.stl`).

---

## 5. Configurable Label Mapping

The module does not hardcode label IDs. The default configuration in `labels.json` supports **OAIZIB-CM**:

```json
{
  "1": "femur",
  "2": "femoral_cartilage",
  "3": "tibia",
  "4": "medial_tibial_cartilage",
  "5": "lateral_tibial_cartilage"
}
```

If another dataset includes additional structures (such as patella or fibula):
```json
{
  "1": "femur",
  "2": "tibia",
  "3": "patella",
  "4": "fibula"
}
```
You can pass this configuration via `--config custom_labels.json` or as a Python dictionary. Absent labels are reported with a warning and skipped without breaking the pipeline.

---

## 6. Installation

The 3D reconstruction engine requires only standard scientific Python libraries and runs entirely on the CPU:

```bash
pip install -r requirements_3d.txt
```

Core libraries:
- `SimpleITK`: Reading spatial metadata, spacing, and LPS affine
- `scikit-image`: Fast Marching Cubes implementation
- `trimesh`: Mesh manipulation, Taubin smoothing, and STL/OBJ export
- `scipy`: Connected-component morphological cleaning
- `numpy`: Array manipulation and coordinate transforms
- `matplotlib`: 3D anatomical visualization

---

## 7. Dataset Placement

Place your dataset segmentation files in a structured folder:

```
data/
└── OAIZIB_CM/
    ├── case_001/
    │   ├── image.nii.gz         (Optional source MRI)
    │   └── segmentation.nii.gz  (Ground-truth label map)
    ├── case_002/
    │   └── segmentation.nii.gz
    └── ...
```

---

## 8. Usage

### A. Python API
```python
from reconstruction3d import generate_meshes

results = generate_meshes(
    segmentation_path="data/OAIZIB_CM/case_001/segmentation.nii.gz",
    output_directory="outputs/case_001",
    label_map={
        1: "femur",
        2: "femoral_cartilage",
        3: "tibia",
        4: "medial_tibial_cartilage",
        5: "lateral_tibial_cartilage"
    },
    taubin_lambda=0.5,
    taubin_nu=-0.53,
    taubin_iterations=20
)

print("Generated structures:", results["manifest"]["total_structures"])
```

### B. Command-Line Interface (CLI)
```bash
python reconstruction3d/reconstruct_3d.py \
    --segmentation data/OAIZIB_CM/case_001/segmentation.nii.gz \
    --output outputs/case_001 \
    --config reconstruction3d/labels.json \
    --case-id case_001
```

### C. Jupyter Notebook
Open and run [`notebooks/Test_3D_Reconstruction.ipynb`](file:///d:/SDC_2/ROSA_NEW/notebooks/Test_3D_Reconstruction.ipynb):
1. **Cell 1:** Import dependencies.
2. **Cell 2:** Set input NIfTI path (includes automatic fallback demo volume).
3. **Cell 3:** Inspect dimensions, spacing, origin, direction matrix.
4. **Cell 4:** Display voxel counts and physical volume per label.
5. **Cell 5:** Run 3D reconstruction.
6. **Cell 6:** Verify generated files on disk.
7. **Cell 7:** Audit mesh QA metrics and volume drift table.
8. **Cell 8:** Render the reconstructed distal femur in 3D.
9. **Cell 9:** Render the multi-color assembled knee joint (Femur, Cartilages, Tibia).

---

## 9. Output Directory Structure

For a case `case_001`, the output directory contains:

```
outputs/
└── case_001/
    ├── meshes/
    │   ├── femur_raw.stl
    │   ├── femur_smooth.stl
    │   ├── femur_raw.obj
    │   ├── femur_smooth.obj
    │   ├── femoral_cartilage_raw.stl
    │   ├── femoral_cartilage_smooth.stl
    │   ├── femoral_cartilage_raw.obj
    │   ├── femoral_cartilage_smooth.obj
    │   ├── tibia_raw.stl
    │   ├── tibia_smooth.stl
    │   ├── tibia_raw.obj
    │   ├── tibia_smooth.obj
    │   ├── medial_tibial_cartilage_raw.stl
    │   ├── medial_tibial_cartilage_smooth.stl
    │   ├── lateral_tibial_cartilage_raw.stl
    │   └── lateral_tibial_cartilage_smooth.stl
    │
    ├── mesh_qa.json
    └── mesh_manifest.json
```

### `mesh_manifest.json` (for API & Frontend)
```json
{
  "case_id": "case_001",
  "total_structures": 5,
  "meshes": [
    {
      "name": "femur",
      "label": 1,
      "stl": "meshes/femur_smooth.stl",
      "obj": "meshes/femur_smooth.obj",
      "volume_mm3": 245020.15,
      "surface_area_mm2": 31200.4,
      "watertight": true
    }
  ]
}
```

### `mesh_qa.json` (for Quality Auditing)
```json
{
  "case_id": "case_001",
  "femur": {
    "raw": {
      "vertices": 124500,
      "faces": 249000,
      "surface_area_mm2": 31450.2,
      "volume_mm3": 245820.0,
      "watertight": true
    },
    "smoothed": {
      "vertices": 124500,
      "faces": 249000,
      "surface_area_mm2": 31200.4,
      "volume_mm3": 245020.15,
      "watertight": true
    },
    "volume_drift_percent": -0.325
  }
}
```

---

## 10. Seamless Transition to Model Predictions

When the TensorFlow segmentation model is trained later on the college GPU, swap the input path:

```python
# During development (Current):
segmentation_path = "data/ground_truth_segmentation.nii.gz"

# In production (Future):
segmentation_path = "models/predictions/predicted_segmentation.nii.gz"

# ZERO changes to reconstruction logic:
results = generate_meshes(segmentation_path, output_dir)
```

---

## 11. Future Integration: FastAPI & Three.js

### FastAPI Route Example:
```python
from fastapi import APIRouter, BackgroundTasks
from reconstruction3d import generate_meshes, DEFAULT_LABEL_MAP

router = APIRouter()

@router.post("/reconstruct/{case_id}")
async def reconstruct_knee(case_id: str):
    seg_path = f"uploads/{case_id}/segmentation.nii.gz"
    out_dir = f"outputs/{case_id}"
    
    result = generate_meshes(
        segmentation_path=seg_path,
        output_directory=out_dir,
        label_map=DEFAULT_LABEL_MAP,
        case_id=case_id
    )
    return result["manifest"]
```

### Three.js / Frontend Loading:
The React frontend can fetch `/api/reconstruct/{case_id}` and load the resulting STL/OBJ meshes directly via `STLLoader` or `OBJLoader`:
```javascript
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

const loader = new STLLoader();
loader.load('/outputs/case_001/meshes/femur_smooth.stl', (geometry) => {
    const material = new THREE.MeshStandardMaterial({ color: 0xe0d6c3 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
});
```
