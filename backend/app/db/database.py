import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Determine Database Engine Connection URL
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Fallback for local dev/test environment if PostgreSQL is not reachable
if "sqlite" in db_url.lower():
    engine = create_engine(
        db_url, connect_args={"check_same_thread": False}
    )
else:
    try:
        temp_engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20
        )
        with temp_engine.connect() as test_conn:
            pass
        engine = temp_engine
    except Exception as e:
        print(f"[Database Notice] PostgreSQL is unreachable ({e}). Using SQLite fallback: {settings.SQLITE_FALLBACK_URL}")
        db_url = settings.SQLITE_FALLBACK_URL
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
    """Initializes database tables and auto-migrates missing columns if needed."""
    import app.db.models  # Ensure models are loaded
    Base.metadata.create_all(bind=engine)

    # Auto-migration fallback for existing SQLite or un-migrated tables
    try:
        with engine.begin() as conn:
            from sqlalchemy import inspect, text
            inspector = inspect(engine)
            if "users" in inspector.get_table_names():
                existing_cols = [c["name"] for c in inspector.get_columns("users")]
                if "is_admin" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
                if "is_banned" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE"))
                if "plan_tier" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN plan_tier VARCHAR(50) DEFAULT 'free'"))
                if "stripe_customer_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255)"))
                if "stripe_subscription_id" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255)"))
                if "subscription_status" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50)"))
                if "current_period_end" not in existing_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN current_period_end TIMESTAMP"))

            if "contact_messages" in inspector.get_table_names():
                existing_contact_cols = [c["name"] for c in inspector.get_columns("contact_messages")]
                if "thread_history" not in existing_contact_cols:
                    conn.execute(text("ALTER TABLE contact_messages ADD COLUMN thread_history TEXT"))
                if "updated_at" not in existing_contact_cols:
                    conn.execute(text("ALTER TABLE contact_messages ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))

            if "ocr_jobs" in inspector.get_table_names():
                existing_job_cols = [c["name"] for c in inspector.get_columns("ocr_jobs")]
                if "user_id" not in existing_job_cols:
                    conn.execute(text("ALTER TABLE ocr_jobs ADD COLUMN user_id VARCHAR(36)"))
                if "job_token" not in existing_job_cols:
                    conn.execute(text("ALTER TABLE ocr_jobs ADD COLUMN job_token VARCHAR(64)"))
    except Exception as e:
        print(f"Auto-migration notice: {e}")


