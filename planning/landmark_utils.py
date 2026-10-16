"""
Landmark Extraction Utilities for Knee Arthroplasty Planning
============================================================
Extracts key anatomical landmarks from reconstructed 3D surface meshes (femur and tibia)
for surgical axis alignment, including:
- Distal femoral condyles (Medial & Lateral lowest points)
- Posterior femoral condyles (Medial & Lateral posterior extremities)
- Transepicondylar Axis (TEA) - Medial & Lateral Epicondyles
- Whiteside's Line (Trochlear groove axis)
- Tibial Plateau (Medial & Lateral articular centers)
- Akagi's Line (Tibial anteroposterior orientation)
"""

from typing import Dict, Any, Tuple
import numpy as np
import trimesh


def extract_femur_landmarks(femur_mesh: trimesh.Trimesh) -> Dict[str, Any]:
    """
    Extract anatomical landmarks from the reconstructed distal femur mesh.

    Parameters
    ----------
    femur_mesh : trimesh.Trimesh
        Reconstructed distal femur mesh in physical coordinates (mm).

    Returns
    -------
    dict
        Extracted landmark 3D coordinates.
    """
    vertices = femur_mesh.vertices
    if len(vertices) == 0:
        return {}

    bounds = femur_mesh.bounding_box.bounds
    min_pt, max_pt = bounds[0], bounds[1]
    center = (min_pt + max_pt) / 2.0

    # Distal direction is typically minimum Z in knee imaging (or based on anatomy)
    # Medial/Lateral is along X; Anterior/Posterior is along Y; Superior/Inferior along Z
    z_min = min_pt[2]
    distal_threshold = z_min + 0.15 * (max_pt[2] - z_min)
    distal_verts = vertices[vertices[:, 2] <= distal_threshold]

    if len(distal_verts) == 0:
        distal_verts = vertices

    # Medial Distal Condyle (X < center_x) vs Lateral Distal Condyle (X >= center_x)
    medial_mask = distal_verts[:, 0] < center[0]
    lateral_mask = distal_verts[:, 0] >= center[0]

    med_distal_verts = distal_verts[medial_mask] if np.any(medial_mask) else distal_verts
    lat_distal_verts = distal_verts[lateral_mask] if np.any(lateral_mask) else distal_verts

    # Lowest Z points (contact points)
    distal_medial_point = med_distal_verts[np.argmin(med_distal_verts[:, 2])]
    distal_lateral_point = lat_distal_verts[np.argmin(lat_distal_verts[:, 2])]

    # Posterior Condyles (most posterior / minimum Y in distal region)
    posterior_medial_point = med_distal_verts[np.argmin(med_distal_verts[:, 1])]
    posterior_lateral_point = lat_distal_verts[np.argmin(lat_distal_verts[:, 1])]

    # Epicondyles: extreme medial (min X) and extreme lateral (max X) points
    medial_epicondyle = vertices[np.argmin(vertices[:, 0])]
    lateral_epicondyle = vertices[np.argmax(vertices[:, 0])]

    # Transepicondylar Axis (TEA) vector
    tea_vector = lateral_epicondyle - medial_epicondyle
    tea_length = float(np.linalg.norm(tea_vector))
    tea_dir = tea_vector / (tea_length + 1e-9)

    # Posterior Condylar Axis (PCA) vector
    pca_vector = posterior_lateral_point - posterior_medial_point
    pca_length = float(np.linalg.norm(pca_vector))
    pca_dir = pca_vector / (pca_length + 1e-9)

    # Trochlear groove / Whiteside's line anterior reference
    anterior_distal_verts = distal_verts[distal_verts[:, 1] >= center[1]]
    trochlear_point = (
        anterior_distal_verts[np.argmax(anterior_distal_verts[:, 1])]
        if len(anterior_distal_verts) > 0
        else center
    )

    return {
        "distal_medial_point": [round(float(v), 2) for v in distal_medial_point],
        "distal_lateral_point": [round(float(v), 2) for v in distal_lateral_point],
        "posterior_medial_point": [round(float(v), 2) for v in posterior_medial_point],
        "posterior_lateral_point": [round(float(v), 2) for v in posterior_lateral_point],
        "medial_epicondyle": [round(float(v), 2) for v in medial_epicondyle],
        "lateral_epicondyle": [round(float(v), 2) for v in lateral_epicondyle],
        "tea_length_mm": round(tea_length, 2),
        "pca_length_mm": round(pca_length, 2),
        "trochlear_sulcus": [round(float(v), 2) for v in trochlear_point],
    }


def extract_tibia_landmarks(tibia_mesh: trimesh.Trimesh) -> Dict[str, Any]:
    """
    Extract anatomical landmarks from the reconstructed proximal tibia mesh.

    Parameters
    ----------
    tibia_mesh : trimesh.Trimesh
        Reconstructed proximal tibia mesh in physical coordinates (mm).

    Returns
    -------
    dict
        Extracted tibial plateau landmarks.
    """
    vertices = tibia_mesh.vertices
    if len(vertices) == 0:
        return {}

    bounds = tibia_mesh.bounding_box.bounds
    min_pt, max_pt = bounds[0], bounds[1]
    center = (min_pt + max_pt) / 2.0

    # Proximal tibial plateau is highest Z
    z_max = max_pt[2]
    plateau_threshold = z_max - 0.12 * (z_max - min_pt[2])
    plateau_verts = vertices[vertices[:, 2] >= plateau_threshold]

    if len(plateau_verts) == 0:
        plateau_verts = vertices

    # Medial (X < center_x) vs Lateral (X >= center_x)
    med_mask = plateau_verts[:, 0] < center[0]
    lat_mask = plateau_verts[:, 0] >= center[0]

    med_plateau = plateau_verts[med_mask] if np.any(med_mask) else plateau_verts
    lat_plateau = plateau_verts[lat_mask] if np.any(lat_mask) else plateau_verts

    # Articular center points (mean coordinate of superior facet)
    medial_plateau_center = np.mean(med_plateau, axis=0)
    lateral_plateau_center = np.mean(lat_plateau, axis=0)

    # Tibial tuberosity (most anterior point on proximal anterior crest)
    anterior_verts = vertices[vertices[:, 1] >= center[1] + 0.2 * (max_pt[1] - min_pt[1])]
    tuberosity = (
        anterior_verts[np.argmax(anterior_verts[:, 1])]
        if len(anterior_verts) > 0
        else max_pt
    )

    # Plateau width (Medial-to-Lateral extent)
    plateau_width = float(np.linalg.norm(lateral_plateau_center - medial_plateau_center))

    return {
        "plateau_center": [round(float(v), 2) for v in center],
        "medial_plateau_center": [round(float(v), 2) for v in medial_plateau_center],
        "lateral_plateau_center": [round(float(v), 2) for v in lateral_plateau_center],
        "tibial_tuberosity": [round(float(v), 2) for v in tuberosity],
        "plateau_width_mm": round(plateau_width, 2),
    }
