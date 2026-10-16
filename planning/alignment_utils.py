"""
Knee Alignment and Individualized Kinematic Alignment (iKA) Calculations
========================================================================
Implements mathematical models for:
- Mechanical Lateral Distal Femoral Angle (mLDFA)
- Medial Proximal Tibial Angle (MPTA)
- Hip-Knee-Ankle (HKA) coronal alignment
- Joint Line Obliquity (JLO)
- Safe boundary enforcement for Restricted / Individualized Kinematic Alignment (rKA / iKA)
"""

from typing import Dict, Any


def calculate_alignment_angles(
    femur_landmarks: Dict[str, Any],
    tibia_landmarks: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compute coronal alignment angles from anatomical landmarks.

    Parameters
    ----------
    femur_landmarks : dict
        Landmarks from extract_femur_landmarks()
    tibia_landmarks : dict
        Landmarks from extract_tibia_landmarks()

    Returns
    -------
    dict
        Calculated angles (mLDFA, MPTA, HKA, JLO).
    """
    # Default clinical targets in healthy population
    # mLDFA: 87.0 degrees (3 degrees valgus relative to femoral shaft)
    # MPTA: 87.0 degrees (3 degrees varus relative to tibial shaft)
    # HKA: 180.0 degrees (0 degrees deviation / neutral mechanical axis)
    
    # Estimate coronal slope of distal femoral joint line from medial & lateral low points
    med_pt = femur_landmarks.get("distal_medial_point", [0, 0, 0])
    lat_pt = femur_landmarks.get("distal_lateral_point", [70, 0, 0])

    dx = lat_pt[0] - med_pt[0]
    dz = lat_pt[2] - med_pt[2]

    # Angle of joint line relative to horizontal
    femoral_obliquity_rad = np_arctan2 = 0.0
    if abs(dx) > 1e-3:
        femoral_obliquity_rad = (dz / dx)

    # Convert to standard orthopedic angles
    femoral_valgus_deg = float(femoral_obliquity_rad * (180.0 / 3.14159265))
    mldfa = 90.0 - femoral_valgus_deg
    mldfa = max(83.0, min(93.0, mldfa)) # clamp to physiological bounds

    # Tibial plateau inclination
    t_med = tibia_landmarks.get("medial_plateau_center", [0, 0, 0])
    t_lat = tibia_landmarks.get("lateral_plateau_center", [70, 0, 0])
    t_dx = t_lat[0] - t_med[0]
    t_dz = t_lat[2] - t_med[2]

    tibial_varus_deg = 3.0
    if abs(t_dx) > 1e-3:
        tibial_varus_deg = float((t_dz / t_dx) * (180.0 / 3.14159265))
    mpta = 90.0 - tibial_varus_deg
    mpta = max(83.0, min(93.0, mpta))

    # HKA: Mechanical alignment deviation from 180 (Varus = negative, Valgus = positive)
    hka_deviation = (180.0 - (mldfa + mpta))

    return {
        "mLDFA_deg": round(mldfa, 1),
        "MPTA_deg": round(mpta, 1),
        "femoral_valgus_cut_deg": round(90.0 - mldfa, 1),
        "tibial_varus_cut_deg": round(90.0 - mpta, 1),
        "HKA_deviation_deg": round(hka_deviation, 1),
        "constitutional_phenotype": "Varus" if hka_deviation < -1.5 else ("Valgus" if hka_deviation > 1.5 else "Neutral"),
    }


def enforce_ika_safe_boundaries(
    angles: Dict[str, Any],
    min_mldfa: float = 85.0,
    max_mldfa: float = 90.0,
    min_mpta: float = 85.0,
    max_mpta: float = 90.0,
    max_hka_drift: float = 3.0,
) -> Dict[str, Any]:
    """
    Enforce Restricted Kinematic Alignment (rKA / iKA) safe surgical boundaries:
    - Femoral cut clamped to [min_mldfa, max_mldfa]
    - Tibial cut clamped to [min_mpta, max_mpta]
    - Overall HKA clamped within [-max_hka_drift, +max_hka_drift]

    Returns
    -------
    dict
        Boundary check results and clamped recommended surgical cuts.
    """
    raw_mldfa = angles["mLDFA_deg"]
    raw_mpta = angles["MPTA_deg"]
    raw_hka = angles["HKA_deviation_deg"]

    clamped_mldfa = max(min_mldfa, min(max_mldfa, raw_mldfa))
    clamped_mpta = max(min_mpta, min(max_mpta, raw_mpta))

    adjusted_hka = (180.0 - (clamped_mldfa + clamped_mpta))
    if abs(adjusted_hka) > max_hka_drift:
        # Correct towards neutral boundary
        adjusted_hka = max_hka_drift if adjusted_hka > 0 else -max_hka_drift

    mldfa_safe = (raw_mldfa == clamped_mldfa)
    mpta_safe = (raw_mpta == clamped_mpta)

    return {
        "mLDFA_safe": mldfa_safe,
        "MPTA_safe": mpta_safe,
        "clamped_mLDFA_deg": round(clamped_mldfa, 1),
        "clamped_MPTA_deg": round(clamped_mpta, 1),
        "planned_femoral_cut_deg": round(90.0 - clamped_mldfa, 1),
        "planned_tibial_cut_deg": round(90.0 - clamped_mpta, 1),
        "planned_HKA_deg": round(adjusted_hka, 1),
        "safe_boundaries": {
            "mLDFA_range": [min_mldfa, max_mldfa],
            "MPTA_range": [min_mpta, max_mpta],
            "HKA_range": [-max_hka_drift, max_hka_drift],
        },
    }
