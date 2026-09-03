# app/services/preprocessor.py
"""
Document image pre-processing: deskew + contrast enhancement.
"""
import numpy as np


def preprocess_document(image_bytes: bytes):
    """
    Pre-process a document image from raw bytes:
      1. Grayscale + CLAHE (contrast enhancement)
      2. Deskew via minAreaRect angle correction

    Returns a deskewed OpenCV BGR numpy array.
    """
    import cv2  # lazy import so server boots without opencv installed

    nparr = np.frombuffer(image_bytes, np.uint8)
    img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # 1. Grayscale + CLAHE contrast enhancement
    gray    = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe   = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # 2. Deskewing via minAreaRect angle
    coords = np.column_stack(np.where(enhanced > 0))
    angle  = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    (h, w)      = img.shape[:2]
    center      = (w // 2, h // 2)
    M           = cv2.getRotationMatrix2D(center, angle, 1.0)
    straightened = cv2.warpAffine(
        img, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )

    return straightened