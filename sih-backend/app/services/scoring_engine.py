# app/services/scoring_engine.py

def generate_officer_summary(trust_score: float, mrz_valid: bool, ela_score: float, copy_move_detected: bool, face_similarity: float, risk_level: str):
    summary_lines = []
    
    # 1. Face evaluation
    if face_similarity >= 0.75:
        summary_lines.append(f"Biometric verification successful with high confidence ({face_similarity*100:.1f}% match).")
    elif face_similarity >= 0.45:
        summary_lines.append(f"Biometric match is moderate ({face_similarity*100:.1f}%). Manual visual inspection recommended.")
    else:
        summary_lines.append(f"CRITICAL: Biometric mismatch detected between document and live capture ({face_similarity*100:.1f}%).")
        
    # 2. Document/MRZ evaluation
    if mrz_valid:
        summary_lines.append("MRZ checksum validation passed; document structural integrity verified.")
    else:
        summary_lines.append("Warning: MRZ checksum verification failed or format anomaly detected.")
        
    # 3. Forensics evaluation
    if ela_score > 5.0 or copy_move_detected:
        summary_lines.append(f"Forensic alert: Potential digital tampering detected (ELA Score: {ela_score:.2f}).")
    else:
        summary_lines.append("Forensic analysis clean; no pixel-level manipulation or cloning found.")
        
    # Final verdict sentence
    if trust_score >= 75:
        verdict = "Recommended for expedited clearance."
    elif trust_score >= 45:
        verdict = "Flagged for secondary manual inspection."
    else:
        verdict = "Recommended for immediate detention/rejection due to high risk factors."
        
    summary_lines.append(verdict)
    
    return " ".join(summary_lines)

def calculate_trust_score(mrz_valid: bool, ela_score: float, copy_move_detected: bool, face_similarity: float,
is_blacklisted: bool = False):
    """
    Weighted Trust Score Calculator (0 to 100):
    - Face Match: 40% weight
    - MRZ Validation: 30% weight
    - Forensics (ELA & Tampering): 30% weight
    """
    score = 0.0

    if is_blacklisted:
        return {
            "trust_score": 0.0,
            "risk_level": "HIGH RISK - BLACKLISTED INDIVIDUAL / LOOKOUT NOTICE",
            "officer_summary": "CRITICAL ALERT: Document number matched with national/international security blacklist database. Immediate detention and secondary verification protocol required."
        }
    
    # 1. Face Match Component (Max 40 points)
    if face_similarity >= 0.45:
        face_points = min(40.0, (face_similarity / 0.8) * 40.0)
        score += face_points
        
    # 2. MRZ Validation Component (Max 30 points)
    if mrz_valid:
        score += 30.0
    else:
        score += 10.0 
        
    # 3. Forensics Component (Max 30 points)
    forensic_penalty = 0.0
    if ela_score > 5.0:
        forensic_penalty += 15.0
    if copy_move_detected:
        forensic_penalty += 15.0
        
    forensic_points = max(0.0, 30.0 - forensic_penalty)
    score += forensic_points
    
    final_score = round(score, 2)
    
    # Risk Level determination
    if final_score >= 75:
        risk_level = "LOW RISK (Verified Genuine)"
    elif final_score >= 45:
        risk_level = "MEDIUM RISK (Manual Review Recommended)"
    else:
        risk_level = "HIGH RISK (Potential Forgery / Mismatch)"
        
    # Generate officer summary text
    summary = generate_officer_summary(
        trust_score=final_score,
        mrz_valid=mrz_valid,
        ela_score=ela_score,
        copy_move_detected=copy_move_detected,
        face_similarity=face_similarity,
        risk_level=risk_level
    )
        
    return {
        "trust_score": final_score,
        "risk_level": risk_level,
        "officer_summary": summary
    }