# app/db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# BUG FIX: Provide a SQLite fallback so the server never crashes with None.
# If DATABASE_URL is absent from .env, we default to a local SQLite file.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./veritas.db")

# BUG FIX: SQLite requires check_same_thread=False for FastAPI's async context.
# For Postgres the connect_args dict is harmless (just ignored by psycopg2).
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()