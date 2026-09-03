# app/config.py
import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

class Settings:
    PROJECT_NAME: str = "SIH Document Verification API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./test.db") # Fallback to sqlite if postgres fails
    WEB3_PROVIDER_URL: str = os.getenv("WEB3_PROVIDER_URL", "http://127.0.0.1:7545")
    WALLET_ADDRESS: str = os.getenv("WALLET_ADDRESS", "")
    WALLET_PRIVATE_KEY: str = os.getenv("WALLET_PRIVATE_KEY", "")
    CHAIN_ID: int = int(os.getenv("CHAIN_ID", 1337))

settings = Settings()