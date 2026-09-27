import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Determine Database Engine Connection URL
db_url = settings.DATABASE_URL

# Fallback for local dev/test environment if PostgreSQL is not reachable
if "sqlite" in db_url.lower():
    engine = create_engine(
        db_url, connect_args={"check_same_thread": False}
    )
else:
    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
    except Exception:
        # Fallback to local SQLite file for offline test runs
        engine = create_engine(
            settings.SQLITE_FALLBACK_URL, connect_args={"check_same_thread": False}
        )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI dependency for yielding database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes database tables if they do not already exist."""
    Base.metadata.create_all(bind=engine)
