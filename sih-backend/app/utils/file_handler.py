import os
import aiofiles
import hashlib

async def save_upload_file_temp(upload_file, temp_dir="temp_uploads"):
    """Uploaded file ko disk pe save karta hai (ELA OpenCV read ke liye zaroori hai)"""
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, upload_file.filename)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await upload_file.read()
        await out_file.write(content)
        
    # File pointer reset for other processes
    await upload_file.seek(0)
    return file_path, content

def generate_file_hash(file_bytes: bytes) -> str:
    """Document ka SHA256 hash generate karta hai"""
    return hashlib.sha256(file_bytes).hexdigest()