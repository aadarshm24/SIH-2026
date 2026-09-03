from fastapi import APIRouter, UploadFile, File
from app.services.forensics_engine import run_ela, copy_move_detection
from app.utils.file_handler import save_upload_file_temp
import os

router = APIRouter()

@router.post("/detect-forgery")
async def detect_forgery_endpoint(file: UploadFile = File(...)):
    # Disk pe save karo for OpenCV
    file_path, _ = await save_upload_file_temp(file)
    
    ela_score = run_ela(file_path)
    copy_move = copy_move_detection(file_path)
    
    os.remove(file_path) # Cleanup
    
    return {"ela_score": ela_score, "copy_move": copy_move}