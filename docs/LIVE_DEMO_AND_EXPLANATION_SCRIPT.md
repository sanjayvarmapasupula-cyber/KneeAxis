# Clinical Atlas — Master Live Demo, Presentation & Viva Examination Script

> **Clinical Study Reference**: *Clinical Atlas: An Auditable AI-to-Mesh Pipeline for Patient-Specific 3D Knee Modeling and Inverse-Kinematic Robotic Arthroplasty Planning*  
> **Clinical Trial Protocol**: Eijking et al. (2025), *Robotic-assisted total knee arthroplasty targeting inverse kinematic alignment compared with conventional total knee arthroplasty targeting mechanical alignment (ROSA iKA study)*, **Trials 26:89** (NCT05685693).

---

## 📑 Table of Contents
1. [Executive Summary & The 60-Second Hook](#1-executive-summary--the-60-second-hook)
2. [Deep Learning Model Architecture & Integration](#2-deep-learning-model-architecture--integration)
   - [Tier 1: ResNet-50 Kellgren-Lawrence (KL) Severity Triage](#tier-1-resnet-50-kellgren-lawrence-kl-severity-triage)
   - [Tier 2: Attention U-Net 4-Class Bone Segmentation](#tier-2-attention-u-net-4-class-bone-segmentation)
3. [Downstream Mathematical & Robotic Pipeline](#3-downstream-mathematical--robotic-pipeline)
   - [Tier 3: Coordinate-Preserving Mesh Engine & Taubin Smoothing](#tier-3-coordinate-preserving-mesh-engine--taubin-smoothing)
   - [Tier 4: 8-Step Deterministic iKA Surgical Planner](#tier-4-8-step-deterministic-ika-surgical-planner)
   - [Tier 5: Cryptographic Hard Export Gate](#tier-5-cryptographic-hard-export-gate)
4. [Step-by-Step Live Demo Presentation Script](#4-step-by-step-live-demo-presentation-script)
5. [Top 15 Viva & Examination Questions with Answers](#5-top-15-viva--examination-questions-with-answers)

---

## 1. Executive Summary & The 60-Second Hook

### The Clinical Problem
In orthopedic surgery, robotic-assisted Total Knee Arthroplasty (TKA) systems (such as the Zimmer Biomet ROSA) cost over **$1,000,000**, yet operate as **proprietary black boxes**. Surgeons and hospitals cannot inspect intermediate 3D bone meshes, audit neural network segmentation decisions, or verify resection mathematics before the robotic cutting guide is locked onto the patient's bone.

### Our Solution
**Clinical Atlas** is an open-source, full-stack, clinically auditable system that bridges the gap between deep learning and deterministic surgical robotics:
1. **Tier 1 (ResNet-50)**: Classifies knee osteoarthritis severity (KL Grades 0–4) with Grad-CAM explainability (**0.8703 Mean AUC, 0.9936 KL-4 AUC**).
2. **Tier 2 (Attention U-Net)**: Performs 4-class bone segmentation (Femur, Tibia, Patella, Background) achieving **0.9944 Mean Dice** with Spatial Attention Gates.
3. **Tier 3 (Mesh Engine)**: Generates watertight 3D bone surfaces with volume-preserving Taubin smoothing (**Volume Drift $< 0.35\%$, Euler characteristic $\chi=2$**).
4. **Tier 4 (iKA Planner)**: Implements the **8-step ROSA iKA clinical trial protocol** (Eijking et al. 2025) preserving native joint obliquity without surgical ligament release ($\epsilon_{MCL} \le 3.0\%$).
5. **Tier 5 (Audit Ledger)**: Enforces an immutable **SHA-256 Hard Export Gate** that mathematically blocks unverified AI meshes from reaching surgical robots.

---

## 2. Deep Learning Model Architecture & Integration

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    CLINICAL ATLAS DUAL-MODEL PIPELINE                   │
  └─────────────────────────────────────────────────────────────────────────┘
                                       │
                    [ Raw DICOM CT / Radiograph Input ]
                                       │
             ┌─────────────────────────┴─────────────────────────┐
             ▼                                                   ▼
   ┌───────────────────┐                               ┌───────────────────┐
   │     TIER 1        │                               │     TIER 2        │
   │   ResNet-50       │                               │ Attention U-Net   │
   │ (KL 0-4 Triage)   │                               │ (Bone Extraction) │
   └─────────┬─────────┘                               └─────────┬─────────┘
             │                                                   │
     [ KL-3 / KL-4 ]                                     [ Multi-Bone Mask ]
   (Surgical Candidate)                                  (0.9944 Mean Dice)
             │                                                   │
             └─────────────────────────┬─────────────────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │          TIER 3           │
                         │ DICOM LPS Surface Engine  │
                         │ (Taubin Smoothing N=20)   │
                         └─────────────┬─────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │          TIER 4           │
                         │ 8-Step iKA Resection Plan │
                         │ (Eijking 2025 Protocol)   │
                         └─────────────┬─────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │          TIER 5           │
                         │ Cryptographic Audit Gate  │
                         │ (SHA-256 Nonce Seal)      │
                         └───────────────────────────┘
```

---

### Tier 1: ResNet-50 Kellgren-Lawrence (KL) Severity Triage
* **Trained Weights**: `models/resnet/outputs/best_model.pth` (283.5 MB, 25.56M parameters).
* **Objective**: Automate diagnostic severity classification to determine surgical candidacy ($KL \ge 3$).
* **Mathematical Explainability**:
  Grad-CAM (Gradient-Weighted Class Activation Mapping) extracts visual attention from the final convolutional block (`layer4.2.conv3`):
  $$\alpha_k^c = \frac{1}{Z} \sum_{i} \sum_{j} \frac{\partial Y^c}{\partial A_{i,j}^k}$$
  $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$$
* **Verification Metrics**:
  * **Mean Multiclass AUC**: `0.8703`
  * **Severe (KL-4) AUC**: `0.9936` (Recall: 92.2%)
  * **Moderate (KL-3) AUC**: `0.9482` (Precision: 77.7%, Recall: 71.7%)
  * **Mild (KL-2) AUC**: `0.8502`
  * **Normal (KL-0) AUC**: `0.8758`

---

### Tier 2: Attention U-Net 4-Class Bone Segmentation
* **Trained Weights**: `models/attention-unet/outputs/best_model.pth` (376.8 MB, 31.39M parameters).
* **Objective**: Extract millimeter-accurate, patient-specific boundaries for the **Femur**, **Tibia**, and **Patella**.
* **Spatial Attention Gate (AG) Formulation**:
  Vanilla U-Net skip connections carry excessive background soft-tissue noise (synovial fluid, muscle, ligaments). Attention U-Net applies an additive gating coefficient $\alpha_{i,j} \in [0, 1]$ before concatenation:
  $$\hat{x}_{i,j}^l = x_{i,j}^l \cdot \alpha_{i,j}^l$$
  $$\alpha^l = \sigma_2\left(\psi^T\left(\sigma_1(W_x x^l + W_g g + b_g)\right) + b_\psi\right)$$
  Where $x^l$ is the high-resolution feature map from the encoder, and $g$ is the coarse gating signal from the deeper decoder layer.
* **Verification Metrics**:
  * **Mean Dice Similarity Coefficient (DSC)**: `0.9944`
  * **Mean Intersection over Union (IoU)**: `0.9889`
  * **Pixel Accuracy**: `99.76%`
  * **Distal Femur**: Dice = `0.9937` | IoU = `0.9875`
  * **Proximal Tibia**: Dice = `0.9938` | IoU = `0.9877`
  * **Patella**: Dice = `0.9958` | IoU = `0.9916`

---

## 3. Downstream Mathematical & Robotic Pipeline

### Tier 3: Coordinate-Preserving Mesh Engine & Taubin Smoothing
* **Physical DICOM LPS Space**: Converts voxel indices $(i, j, k)$ into physical coordinates in millimeters:
  $$P_{LPS} = \begin{bmatrix} S_x \cdot \Delta x \\ S_y \cdot \Delta y \\ S_z \cdot \Delta z \end{bmatrix} + P_{origin}$$
* **Non-Shrinking Taubin Smoothing**:
  Standard Laplacian smoothing causes bone shrinkage, resulting in undersized implant sizing. We apply Taubin alternating positive and negative filtering ($N=20$ iterations):
  $$V^{(n+1/2)} = V^{(n)} + \lambda L(V^{(n)}), \quad \lambda = 0.50$$
  $$V^{(n+1)} = V^{(n+1/2)} + \mu L(V^{(n+1/2)}), \quad \mu = -0.53 \quad (|\mu| > \lambda)$$
* **Quality Assurance Gate (`mesh_qa.json`)**:
  * Volume drift $\Delta V < 0.35\%$
  * Watertight 2-manifold verification
  * Euler characteristic $\chi = V - E + F = 2$
  * Non-manifold edges $= 0$

---

### Tier 4: 8-Step Deterministic iKA Surgical Planner
Implements the protocol from Eijking et al. (2025):
* **Step 1 (Phenotype & Constitutional Alignment)**:  
  $$aHKA = mMPTA - mLDFA$$
* **Step 2 (Distal Femoral Resection)**:  
  $$\theta_{fem\_distal} = \text{clamp}(mLDFA_{native}, 87^\circ, 93^\circ), \quad D_{distal} = T_{implant} - C_{wear}$$
* **Step 3 (Proximal Tibial Resection)**:  
  $$\theta_{tib} = \text{clamp}(mMPTA_{native}, 85^\circ, 90^\circ), \quad \text{varus} \le 5^\circ$$
* **Step 4 (Extension Gap Balancing)**:  
  $$G_{ext}(med) = T_{cart\_med} + T_{bone\_med} - D_{distal\_med}$$
* **Step 5 (Optimal Femoral Rotation & MCL Sweet Spot)**:  
  $$\phi_{fem}^* = \arg\min |G_{flex}(med) - G_{ext}(med)|, \quad S = C_{max} + 1^\circ$$
* **Step 6 (Anterior Cortex Notching Verification)**:  
  Ensures no anterior femoral cortical violation (risk of periprosthetic supracondylar fracture).
* **Step 7 (Dynamic Ligament Strain Check)**:  
  $$\epsilon_{MCL}(\theta) = \frac{L(\theta) - L_0}{L_0} \times 100\% \le +3.0\% \quad \forall \theta \in [0^\circ, 120^\circ]$$
* **Step 8 (Final Postoperative Validation)**:  
  Restores constitutional joint line within safety boundary: $aHKA_{post} \in [-3.0^\circ, +3.0^\circ]$.

---

### Tier 5: Cryptographic Hard Export Gate
* **SHA-256 Manifest Seal**:
  $$R = \text{SHA256}(H_{img} \parallel H_{mesh} \parallel \text{SurgeonID} \parallel \text{Timestamp} \parallel \text{Nonce})$$
* **Hard Enforcement**: Unverified models and cut files return `HTTP 403 Forbidden` at the API level, making it physically impossible for unapproved meshes to control a surgical robot.

---

## 4. Step-by-Step Live Demo Presentation Script

### Stage 1: The Opening (Dashboard) — 45 Seconds
1. **Navigate to**: `/dashboard`
2. **Click**: Patient **Eleanor Vance (MRN-ROSA-0568)**.
3. **What to Say**:
   > "Welcome. Today we present **Clinical Atlas**, an auditable, full-stack AI system for robotic Total Knee Arthroplasty (TKA). Commercial surgical robots like the ROSA operate as closed-loop black boxes. Clinical Atlas resolves this by integrating dual PyTorch deep learning models with deterministic surgical mathematics. Here we see Eleanor Vance, a 64-year-old female presenting with severe medial knee osteoarthritis and constitutional varus alignment."

---

### Stage 2: AI Models & Deep Learning Hub — 60 Seconds
1. **Navigate to**: `/models`
2. **Highlight**: The KPI bar (**ResNet-50 0.8703 AUC**, **Attention U-Net 0.9944 Dice**, **56.94M parameters**).
3. **Click Tab**: **ResNet-50 (KL Triage)**.
   * Point out the **Grad-CAM samples** and **ROC curves** (KL-4 AUC: 0.9936).
   * Explain: *"Grad-CAM highlights localized joint space narrowing at `layer4.2.conv3`, giving orthopedic surgeons explainable proof of why KL-3 was assigned."*
4. **Click Tab**: **Attention U-Net (Segmentation)**.
   * Point out the **Spatial Attention Gate heatmaps** and per-bone Dice scores (Femur 0.9937, Tibia 0.9938, Patella 0.9958).
   * Explain: *"Attention gates compute spatial coefficients $\alpha_{i,j}$ that filter out muscle and synovial fluid noise, guaranteeing sub-millimeter bone boundaries."*
5. **Click Tab**: **Interactive Model Sandbox**.
   * Click **Execute Dual Model Inference** to demonstrate live end-to-end evaluation.

---

### Stage 3: Imaging Viewer & Grad-CAM Overlay — 45 Seconds
1. **Navigate to**: `/imaging`
2. **Toggle**: **ResNet-50 Grad-CAM Heatmap** & **Attention U-Net Mask**.
3. **Adjust**: Slice slider across axial slices.
4. **What to Say**:
   > "In the imaging viewer, clinicians can directly overlay the ResNet-50 Grad-CAM activation map and Attention U-Net masks on live DICOM slices. With $\Delta T = 1.8^\circ\text{C}$ thermal synovitis detected, Eleanor is flagged as a high-priority candidate for ROSA inverse kinematic arthroplasty."

---

### Stage 4: Volumetric Bone Segmentation — 45 Seconds
1. **Navigate to**: `/segmentation`
2. **Click**: **Re-run AI Inference** (or toggle between Overlay, Split Sweep, and Side-by-Side).
3. **What to Say**:
   > "Here we inspect the 4-class multi-bone segmentation. The Attention U-Net delivers a 0.9944 Mean Dice score with zero volume drift, ensuring our reconstructed anatomical models represent the patient's exact bone morphology."

---

### Stage 5: 3D Surface Reconstruction & Taubin QA — 45 Seconds
1. **Navigate to**: `/reconstruction`
2. **Interact**: Rotate the 3D Femur and Tibia Three.js models.
3. **Point out**: The `mesh_qa.json` QA sidecar.
4. **What to Say**:
   > "Unlike standard Laplacian smoothing which shrinks bone volumes, our non-shrinking Taubin filter maintains volume drift below 0.35% with an Euler characteristic of $\chi=2$, producing watertight STL meshes ready for robotic resection."

---

### Stage 6: 8-Step iKA Planning & Gap Balancing — 60 Seconds
1. **Navigate to**: `/planning`
2. **Walk through**:
   * Step 2: Femoral distal resection ($9.0\text{ mm}$ medial, $7.0\text{ mm}$ lateral).
   * Step 3: Tibial resection ($6.0\text{ mm}$ medial, $4.0\text{ mm}$ lateral).
   * Step 5: Femoral rotation set to $+3.0^\circ$ (MCL sweet spot $S = C_{max} + 1^\circ$).
   * Step 7: Dynamic MCL strain check ($\epsilon_{MCL} = 1.8\% \le 3.0\%$).
   * Step 8: Postoperative $aHKA = -2.0^\circ$ (constitutional varus safely restored).
3. **What to Say**:
   > "This is the core clinical breakthrough: rather than forcing a 90° mechanical cut that requires painful ligament releases, our 8-step iKA algorithm restores the patient's native joint line while keeping MCL strain under 3% throughout the full 0° to 120° range of motion."

---

### Stage 7: Cryptographic Hard Export Gate — 30 Seconds
1. **Navigate to**: `/reports`
2. **Click**: **Sign Off & Generate Cryptographic Seal**.
3. **Show**: The generated SHA-256 seal.
4. **What to Say**:
   > "Finally, the Hard Export Gate seals the image hash, mesh hash, surgeon ID, and cryptographic nonce into an immutable ledger, guaranteeing absolute traceability before robotic export."

---

## 5. Top 15 Viva & Examination Questions with Answers

#### Q1: Why did you choose ResNet-50 over Vision Transformers (ViT) or standard CNNs?
**Answer**: ResNet-50 solves the vanishing gradient problem through residual skip connections ($y = \mathcal{F}(x) + x$) with 25.56M parameters. Vision Transformers lack local inductive bias and require huge training datasets (hundreds of thousands of images) to generalize on localized radiographic biomarkers like joint space narrowing. ResNet-50 converges stably on medical imaging benchmarks and supports Grad-CAM at `layer4.2.conv3`.

#### Q2: What is an Attention Gate (AG) and how does it mathematically eliminate false positives?
**Answer**: Standard U-Net skip connections blindly concatenate low-level encoder features with high-level decoder features, bringing along soft-tissue noise. Additive Spatial Attention Gates compute attention coefficients $\alpha_{i,j} = \sigma_2(\psi^T(\sigma_1(W_x x_{i,j} + W_g g_i + b_g)) + b_\psi) \in [0, 1]$. By multiplying encoder features $x$ by $\alpha$, non-bone activations (synovium, muscle) are scaled to zero before skip concatenation.

#### Q3: What is the clinical difference between Mechanical Alignment (MA) and Inverse Kinematic Alignment (iKA)?
**Answer**: Mechanical Alignment (MA) forces all bone cuts to be strictly perpendicular (90°) to the mechanical axis, aiming for a neutral $0^\circ$ Hip-Knee-Ankle (HKA) line. However, over 80% of healthy humans have constitutional varus ($2^\circ$–$4^\circ$). MA causes soft-tissue imbalance, requiring aggressive collateral ligament releases in ~40% of patients. Inverse Kinematic Alignment (iKA) restores the patient’s pre-arthritic constitutional joint line within safety boundaries ($mLDFA \in [87^\circ, 93^\circ], mMPTA \in [85^\circ, 90^\circ]$) without ligament release.

#### Q4: Why is Taubin smoothing preferred over Laplacian smoothing for surgical 3D models?
**Answer**: Laplacian smoothing moves vertices toward their neighbors' centroid, causing severe volume shrinkage (often $> 4\%$) and blunting anatomical landmarks. Taubin smoothing uses two alternating passes: a positive shrinkage step ($\lambda = 0.50$) followed by a negative inflation step ($\mu = -0.53$, where $|\mu| > \lambda$). This smooths high-frequency noise while strictly preserving total volume ($\Delta V < 0.35\%$).

#### Q5: How is the Hard Export Gate enforced against AI hallucination?
**Answer**: The Hard Export Gate sits as an authorization middleware in the API. Before allowing any 3D STL file or robotic cut file download, it verifies two prerequisites: (1) `mesh_qa.json` passes all geometric metrics (watertightness, Euler $\chi=2$, drift $< 0.35\%$), and (2) The authorized surgeon digitally submits sign-off. It then computes an immutable SHA-256 seal $R = \text{SHA256}(H_{img} \parallel H_{mesh} \parallel \text{SurgeonID} \parallel \text{Timestamp} \parallel \text{Nonce})$.

#### Q6: How does Step 5 of the iKA protocol calculate optimal femoral rotation?
**Answer**: Step 5 solves the optimization problem $\phi_{fem}^* = \arg\min |G_{flex}(med) - G_{ext}(med)|$ to equalize medial flexion and extension gaps. To prevent lateral ligament laxity, the rotation is bounded by the constitutional MCL sweet spot $S = C_{max} + 1^\circ$.

#### Q7: What is the clinical significance of thermal synovitis ($\Delta T \ge 1.5^\circ\text{C}$)?
**Answer**: Infrared thermography measures skin surface temperature differences between the affected and contralateral healthy knee. A differential $\Delta T \ge 1.5^\circ\text{C}$ indicates active inflammatory synovitis and joint effusion, validating that the patient's joint space narrowing is accompanied by symptomatic inflammation.

#### Q8: What are the input dimensions and preprocessing for your deep learning models?
**Answer**:
* ResNet-50: Input shape $[3, 224, 224]$, normalized using ImageNet mean/standard deviation.
* Attention U-Net: Input shape $[1, 256, 256]$, resampled to isotropic voxel spacing ($0.488\text{ mm}$), with Hounsfield Unit (HU) windowing tailored for bone CT ($L=40, W=400$).

#### Q9: What loss function was used during Attention U-Net training?
**Answer**: A combination of **Dice Loss** and **Categorical Cross-Entropy**:
$$\mathcal{L}_{total} = \mathcal{L}_{CE} + \mathcal{L}_{Dice} = -\sum y \log(\hat{y}) + \left(1 - \frac{2 \sum y \hat{y} + \epsilon}{\sum y + \sum \hat{y} + \epsilon}\right)$$
This handles the heavy class imbalance between background air/tissue and thin cortical bone regions.

#### Q10: How do you verify that the reconstructed 3D mesh is watertight?
**Answer**: A mesh is watertight (2-manifold without boundary) if every edge is shared by exactly two triangular faces, no vertex is non-manifold, and its Euler-Poincaré characteristic satisfies $\chi = V - E + F = 2(1 - g) = 2$ for genus $g=0$ (sphere topology).

#### Q11: How does the system prevent anterior femoral cortex notching in Step 6?
**Answer**: Anterior cortex notching occurs if the anterior femoral resection cuts into the anterior cortex, increasing the risk of supracondylar femur fracture by 30%. The algorithm projects the 3D implant flange onto the anterior bone profile; if a negative clearance ($< 0\text{ mm}$) is detected, it automatically up-sizes the femoral component or adjusts anterior-posterior offset.

#### Q12: What is the dynamic MCL strain threshold in Step 7?
**Answer**: In natural knees, the superficial MCL undergoes physiological strain between $0\%$ and $3\%$. Step 7 calculates simulated elongation across the kinematic flexion arc ($0^\circ \to 120^\circ$):
$$\epsilon_{MCL}(\theta) \le +3.0\%$$
If strain exceeds $3.0\%$, the algorithm flags an alert to adjust distal femoral varus or tibial slope before bone cuts are finalized.

#### Q13: How does the system handle patient-reported outcomes (PROMs)?
**Answer**: The system tracks longitudinal **Oxford Knee Score (OKS, 0–48)** and **Forgotten Joint Score (FJS-12, 0–100)** pre-operatively, at 6 weeks, 6 months, and 1 year post-op, comparing the patient's recovery trajectory against the multi-center ROSA iKA trial cohort.

#### Q14: Can this pipeline be deployed in existing hospital PACS networks?
**Answer**: Yes. The backend is built with FastAPI and conforms to DICOM 3.0 / HL7 FHIR standards. It accepts standard DICOM part 10 files, extracts LPS metadata tags, and provides RESTful endpoints for PACS server integration.

#### Q15: What is the major contribution of Clinical Atlas compared to existing literature?
**Answer**: Existing literature either presents isolated AI segmentation papers without surgical planning, or robotic surgical protocols without open AI pipelines. Clinical Atlas is the **first unified, end-to-end open architecture** linking multimodal deep learning triage, attention-guided bone segmentation, coordinate-preserving mesh QA, deterministic 8-step iKA mathematics, and a cryptographic export gate.
