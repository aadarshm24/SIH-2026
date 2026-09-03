// src/services/api.js
import axios from 'axios';

const API_BASE_URL = "http://localhost:8000/api/v1";

export const verifyDocumentAPI = async (documentFile, livePhotoFile) => {
    const formData = new FormData();
    formData.append("document", documentFile);
    formData.append("live_photo", livePhotoFile);

    try {
        const response = await axios.post(`${API_BASE_URL}/verify-document`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            timeout: 120000, // 2 min timeout for ML inference
        });
        return response.data;
    } catch (error) {
        console.error("Verification failed:", error);

        // Surface the real server error message so the user sees exactly what went wrong
        const serverDetail = error.response?.data?.detail;
        const serverMsg    = typeof error.response?.data === 'string'
            ? error.response.data
            : JSON.stringify(error.response?.data);

        if (error.code === 'ECONNREFUSED' || !error.response) {
            throw { message: "Cannot reach backend server. Is uvicorn running on port 8000?" };
        }
        if (error.response?.status === 500) {
            throw { message: `Server error (500): ${serverDetail || serverMsg || error.message}` };
        }
        throw error.response?.data || { message: error.message };
    }
};