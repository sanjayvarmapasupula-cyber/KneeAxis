# KneeAxis — Dataset Acquisition and Organization Guide

This document details where and how to obtain the public datasets required for training and evaluating KneeAxis models on your college GPU server.

---

## 1. Overview of Datasets

| Dataset | Modality | Primary Use Case | Scale | Access Model |
| :--- | :--- | :--- | :--- | :--- |
| **OAI (Osteoarthritis Initiative)** | Bilateral Knee AP Radiographs | ResNet50 KL Grading (Train/Val/Test) | ~4,700 subjects / >8,000 X-rays | Public / DUA / Academic |
| **MOST Study** | Knee Radiographs | External Validation for KL Classifier | Independent cohort | Public / Academic Access |
| **OAIZIB-CM** | 3D Sagittal DESS MRI | 3D U-Net Knee Segmentation | 507 3D Knee MRI scans | Open Access (Zenodo `14934086`) |
| **TotalSegmentator** | CT / MRI (Multi-organ) | External baseline & pre-annotation | Pretrained model | Open Source (Apache 2.0) |

---

## 2. Model A: OAI Dataset (KL Classification)

### Acquisition
The Osteoarthritis Initiative (OAI) dataset is hosted by the National Institute of Arthritis and Musculoskeletal and Skin Diseases (NIAMS) and National Institute on Aging (NIA).
- **Official NIH Portal**: [https://nda.nih.gov/oai/](https://nda.nih.gov/oai/)
- **Curated Academic Mirrors**: Academic research mirrors and Kaggle dataset mirrors (e.g., *OAI Knee KL Grading Dataset*) provide cropped bilateral knee joint X-ray images (JPEG/PNG) labeled with Kellgren-Lawrence grades 0 to 4.

### Directory Organization
Place images in:
```text
datasets/OAI/
├── images/
│   ├── 9001234_left.png
│   ├── 9001234_right.png
│   └── ...
└── oai_kl_grades.csv
```

### Manifest Columns Required (`oai_kl_grades.csv`):
```csv
image_path,subject_id,kl_grade
images/9001234_left.png,9001234,2
images/9001234_right.png,9001234,3
```

> [!IMPORTANT]
> **Subject-Level Split**: KneeAxis strictly enforces splitting by `subject_id` rather than image-level shuffling. This guarantees that images from the same patient never appear in both training and test sets, eliminating data leakage.

---

## 3. External Validation: MOST Study Dataset

### Acquisition
The Multicenter Osteoarthritis Study (MOST) serves as the **independent external validation cohort** to verify that your ResNet50 classifier generalises across different clinical sites, imaging equipment, and patient populations.
- **Portal**: [https://agingresearchbiobank.nia.nih.gov/studies/most/](https://agingresearchbiobank.nia.nih.gov/studies/most/)

### Directory Organization
```text
datasets/MOST/
├── images/
│   ├── M001_left.png
│   └── ...
└── most_kl_grades.csv
```

---

## 4. Model B: OAIZIB-CM Dataset (3D Segmentation)

### Acquisition (Direct Zenodo Download)
The OAI Zuse Institute Berlin Cartilage & Meniscus (OAIZIB-CM) dataset is available directly via Zenodo:
- **Zenodo DOI**: [10.5281/zenodo.14934086](https://zenodo.org/records/14934086)

### Command-line Download on Server:
```bash
cd datasets/OAIZIB_CM
# Example download using wget/curl (replace with direct Zenodo URL if using token)
curl -L -O "https://zenodo.org/records/14934086/files/oaizib_cm_dataset.tar.gz"
tar -xzf oaizib_cm_dataset.tar.gz
```

### Directory Structure:
```text
datasets/OAIZIB_CM/
├── imagesTr/
│   ├── 9003316_00.nii.gz
│   ├── 9003380_00.nii.gz
│   └── ...
├── labelsTr/
│   ├── 9003316_00.nii.gz
│   ├── 9003380_00.nii.gz
│   └── ...
├── imagesTs/
│   └── ...
└── labelsTs/
    └── ...
```

### Anatomical Label Breakdown (6 Classes):
- `0`: **Background**
- `1`: **Femur (Distal Bone)**
- `2`: **Femoral Cartilage**
- `3`: **Tibia (Proximal Bone)**
- `4`: **Medial Tibial Cartilage**
- `5`: **Lateral Tibial Cartilage**

> [!WARNING]
> **No Patella or Fibula**: OAIZIB-CM does NOT include labels for the patella or fibula. The TensorFlow 3D U-Net in this package outputs exactly these 6 classes. Do not claim patella segmentation from an OAIZIB-CM-trained model.

---

## 5. Model C: TotalSegmentator (Baseline Reference Only)

TotalSegmentator is an external PyTorch-based multi-organ segmentation tool (developed by Wasserthal et al., University Hospital Basel). It is NOT trained via this TensorFlow package, but is included as an optional reference baseline or pre-annotation tool:
- **Repository**: [https://github.com/wasserth/TotalSegmentator](https://github.com/wasserth/TotalSegmentator)
- **Installation**:
  ```bash
  pip install TotalSegmentator
  ```
- **CLI Usage**:
  ```bash
  TotalSegmentator -i sample_ct.nii.gz -o segmentations/ --task total
  ```
TotalSegmentator can segment 117 anatomical structures on CT, including femur, tibia, and patella, and can be used to generate initial masks if working with whole-body or full-extremity CT scans.

---

## 6. Manifest Generation and Verification

Once your datasets are downloaded, run the automated preparation script:
```bash
python scripts/prepare_manifests.py
python scripts/validate_datasets.py
```
This inspects image dimensions, confirms matching Tr/Ts pairs, and outputs validated CSV manifests in `manifests/`.
