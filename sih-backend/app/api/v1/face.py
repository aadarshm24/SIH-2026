# app/api/v1/face.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.face_engine import get_face_embedding, calculate_cosine_similarity

router = APIRouter()

@router.post("/match-face")
async def match_face_endpoint(document_photo: UploadFile = File(...), live_photo: UploadFile = File(...)):
    doc_bytes = await document_photo.read()
    live_bytes = await live_photo.read()
    
    doc_embedding = get_face_embedding(doc_bytes)
    live_embedding = get_face_embedding(live_bytes)
    
    if doc_embedding is None:
        raise HTTPException(status_code=400, detail="Document photo mein koi chehra (face) nahi mila!")
        
    if live_embedding is None:
        raise HTTPException(status_code=400, detail="Live photo mein koi chehra (face) nahi mila!")
        
    similarity = calculate_cosine_similarity(doc_embedding, live_embedding)
    
    # Agar similarity 0.45 ya usse zyada hai, toh match successful maana jayega
    is_match = similarity >= 0.45
    
    return {
        "status": "SUCCESS",
        "similarity_score": round(similarity, 4),
        "is_match": is_match,
        "message": "Face matched successfully!" if is_match else "Face match failed! Chehre alag hain."
    }