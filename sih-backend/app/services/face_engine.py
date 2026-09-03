# app/services/face_engine.py
"""
Face biometrics using InsightFace ArcFace embeddings.

IMPROVEMENT: Model initialization is now lazy (on first call) instead of
at import-time. This means if insightface/onnxruntime aren't installed the
server still boots — only the /verify-document endpoint will return an error.
"""
import numpy as np

_face_app = None  # Lazy singleton


def _get_face_app():
    """Initialise and cache the InsightFace FaceAnalysis model on first use."""
    global _face_app
    if _face_app is None:
        try:
            from insightface.app import FaceAnalysis
            print("[face_engine] Loading InsightFace ArcFace model...")
            _face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
            _face_app.prepare(ctx_id=0, det_size=(640, 640))
            print("[face_engine] InsightFace model loaded successfully.")
        except ImportError as e:
            raise RuntimeError(
                f"InsightFace is not installed. Run: pip install insightface onnxruntime. "
                f"Original error: {e}"
            )
    return _face_app


def get_face_embedding(img_bytes: bytes):
    """
    Return a 512-dimensional ArcFace embedding from raw image bytes.
    Returns None if no face is detected.
    """
    import cv2
    nparr = np.frombuffer(img_bytes, np.uint8)
    img   = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return None

    face_app = _get_face_app()
    faces    = face_app.get(img)
    if len(faces) == 0:
        return None

    # Return the most prominent (highest-confidence) face embedding
    return faces[0].embedding


def calculate_cosine_similarity(embedding1, embedding2) -> float:
    """
    Compute cosine similarity between two face embeddings.
    Returns a float in [0, 1]; higher means more similar.
    """
    if embedding1 is None or embedding2 is None:
        return 0.0

    dot_product = np.dot(embedding1, embedding2)
    norm_a      = np.linalg.norm(embedding1)
    norm_b      = np.linalg.norm(embedding2)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(dot_product / (norm_a * norm_b))