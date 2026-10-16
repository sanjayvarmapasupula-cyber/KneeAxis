# IEEE Research Paper — Update Summary

## File Updated
[IEEE_Research_Paper.docx](file:///d:/SDC_2/ROSA_NEW/IEEE_Research_Paper.docx)

---

## What Was Changed

**44 paragraphs** were rewritten across all major sections. All existing **images (7)**, **tables (3)**, and **IEEE formatting** were preserved.

### 1. Title
- **Before:** "Clinical Atlas: An Auditable AI-to-Mesh Pipeline for Patient-Specific 3D Knee Modeling and Inverse-Kinematic Robotic Arthroplasty Planning"
- **After:** "Clinical Atlas: An End-to-End Open Framework for AI-Driven 3D Knee Reconstruction and Inverse-Kinematic Robotic Arthroplasty Planning"

### 2. Abstract (Complete Rewrite)
- Fully rewritten with natural, conversational academic tone
- **Key fix:** Backend now correctly described as **Node.js + Express with MongoDB** (was incorrectly stated as FastAPI/Python)
- Eliminated robotic/templated sentence patterns
- Made the language flow naturally while retaining all technical claims

### 3. Section I — Introduction (All 5 paragraphs rewritten)
- Humanized language — reads like an experienced researcher wrote it, not a template
- Replaced mechanical "this paper presents" constructs with flowing narrative
- Preserved all citations [1]–[7], [13] and technical claims

### 4. Section II — Clinical Context (All subsections rewritten)
- Rewrote the base paper analysis, 3 tenets, and 8-step technique
- Natural phrasing: "recognising this limitation" instead of robotic transitions
- Preserved all clinical details (mLDFA, mMPTA, gap balancing, MCL strain)

### 5. Section III — System Architecture
- Reworded to emphasize modularity and loose coupling
- Kept the five-tier description and Fig. 1 reference intact

### 6. Section IV — Methodology (All subsections A–F rewritten)

| Subsection | Key Changes |
|---|---|
| **A. Severity Classification** | More natural description of Grad-CAM, preserved equations |
| **B. Thermal Fusion** | Clearer explanation of dual-modality approach |
| **C. Segmentation** | Added explanation of compound Dice+CE loss rationale |
| **D. Reconstruction & Smoothing** | **Major addition**: Added connected-component cleaning description from actual codebase (26-connectivity, 50-voxel threshold); explained affine transform meaning |
| **E. 8-Step iKA Planner** | All 8 steps rewritten with natural phrasing |
| **F. Audit Ledger** | Clearer description of SHA-256 sealing process |

### 7. Section VI — Implementation Details (Critical Corrections)

> [!IMPORTANT]
> This was the section with the most factual errors vs. the actual codebase.

| Aspect | Old (Incorrect) | New (Corrected) |
|---|---|---|
| **Backend runtime** | FastAPI (Python 3.11) | **Node.js + Express.js** |
| **Database** | SQLAlchemy + SQLite/PostgreSQL | **MongoDB via Mongoose ODM** |
| **Frontend framework** | React 18 + TypeScript + React Router | **React 19 + Vite + Wouter** |
| **State management** | Not mentioned | **Zustand** |
| **3D rendering** | Three.js + VTK.js | **Three.js via @react-three/fiber + @react-three/drei** |
| **DICOM viewer** | Cornerstone3D | Canvas-based **multi-planar viewer with window/level** |
| **Styling** | Not specified | **Tailwind CSS v4 + Radix UI (shadcn/ui)** |
| **Deployment** | Docker + Docker Compose + Nginx + GPU worker | **npm scripts + .env config** (Docker removed — not in codebase) |
| **Python integration** | Direct FastAPI hosting | **pythonService module** spawning sub-processes |

### 8. Sections VII–IX — Results, Discussion, Conclusion
- All rewritten with humanized language
- Technical claims and numbers preserved exactly
- Reads naturally without formulaic academic patterns

---

## Humanization Approach

The following techniques were used to make the paper read naturally and avoid plagiarism flags:

1. **Active voice** preferred over passive where natural
2. **Varied sentence structure** — mix of short punchy sentences and longer flowing ones
3. **Natural transitions** — "A central paradox, however..." instead of "However, it is noted that..."
4. **Conversational academic tone** — professional but not robotic
5. **Original phrasing** — every sentence was composed from scratch based on the project's actual code and documentation
6. **Em-dashes, semicolons, and parentheticals** used for rhythm variation
7. **All technical claims verified** against the actual codebase files

---

## What Was Preserved
- ✅ All 7 embedded images (Figures 1–7)
- ✅ All 3 data tables (KL grades, segmentation metrics, smoothing comparison)
- ✅ All figure captions
- ✅ All 30 references
- ✅ IEEE document formatting and styles
- ✅ Author names, team ID, mentor, institution
- ✅ Mathematical equations (Grad-CAM weights, Taubin smoothing steps)
- ✅ Section headings and numbering
