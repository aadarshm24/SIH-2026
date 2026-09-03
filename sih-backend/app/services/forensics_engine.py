# app/services/forensics_engine.py
"""
Image forensics: Error Level Analysis (ELA) + Copy-Move detection.

BUG FIX: ELA previously wrote a temp file named "temp_ela_compression.jpg"
in the CWD.  Under concurrent requests the same file would be read/written
by multiple coroutines simultaneously, causing corrupt results or crashes.
Now uses tempfile.mkstemp() to guarantee a unique path per request.
"""
import cv2
import numpy as np
import os
import tempfile


def run_ela(image_path: str, quality: int = 90) -> float:
    """
    Error Level Analysis (ELA):
    Compare the original image against a re-compressed version at `quality`%.
    Edited/spliced areas retain a higher error level (pixel difference).
    Returns the mean absolute pixel difference as a float score.
    """
    original = cv2.imread(image_path)
    if original is None:
        return 0.0

    # BUG FIX: Use a unique temp file per call to avoid race conditions.
    fd, temp_path = tempfile.mkstemp(suffix=".jpg")
    os.close(fd)  # Close the file descriptor; cv2.imwrite will reopen it.

    try:
        cv2.imwrite(temp_path, original, [cv2.IMWRITE_JPEG_QUALITY, quality])
        resaved = cv2.imread(temp_path)
        if resaved is None:
            return 0.0

        diff      = cv2.absdiff(original, resaved)
        ela_score = float(np.mean(diff))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    return ela_score


def copy_move_detection(image_path: str) -> dict:
    """
    Copy-Move Detection using OpenCV ORB feature matching.
    Looks for duplicate feature patches within the same image.
    Returns forgery_detected (bool) and suspicious_matches (int).
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return {"forgery_detected": False, "suspicious_matches": 0}

    orb = cv2.ORB_create(nfeatures=1000)
    kp, des = orb.detectAndCompute(img, None)

    if des is None or len(des) < 2:
        return {"forgery_detected": False, "suspicious_matches": 0}

    # Brute-Force Matcher with Hamming distance (suited for ORB binary descriptors)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = bf.knnMatch(des, des, k=2)

    suspicious_matches = 0
    for match_pair in matches:
        if len(match_pair) == 2:
            m, n = match_pair
            # Ratio test: strong identical patch found
            if m.distance < 0.6 * n.distance:
                pt1 = np.array(kp[m.queryIdx].pt)
                pt2 = np.array(kp[m.trainIdx].pt)
                # Spatial distance filter: patches must be far apart in the image
                if np.linalg.norm(pt1 - pt2) > 30:
                    suspicious_matches += 1

    return {
        "forgery_detected": suspicious_matches > 15,
        "suspicious_matches": suspicious_matches,
    }