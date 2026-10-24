import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import String

# =====================================================================
# 1. DATABASE CONFIGURATION (Neon PostgreSQL Async Driver Patch)
# =====================================================================
DATABASE_URL = os.getenv("DATABASE_URL")

# Auto-correct the database prefix to use asyncpg driver if Render passes postgresql://
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# Fallback string for local fallback testing if environment variable is missing
if not DATABASE_URL:
    DATABASE_URL = "postgresql+asyncpg://user:password@localhost/dbname"

# Create the Asynchronous SQLAlchemy Database Engine
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# Create an async session factory
async_session = async_sessionmaker(
    bind=engine, 
    class_=AsyncSession, 
    expire_on_commit=False
)

Base = declarative_base()

# =====================================================================
# 2. ORM DATABASE MODEL
# =====================================================================
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active")

# Database dependency injector for FastAPI routes
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

# =====================================================================
# 3. FASTAPI INITIALIZATION & CORS MIDDLEWARE (Fixes CORS Error)
# =====================================================================
app = FastAPI(title="GymAI Backend Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows your live frontend deployment to communicate cleanly
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"],  # Allows all authentication/content headers
)

# =====================================================================
# 4. REQUEST VALIDATION SCHEMAS (Pydantic)
# =====================================================================
class EmailCheckRequest(BaseModel):
    email: EmailStr

# =====================================================================
# 5. API ENDPOINTS (Fixes MissingGreenlet 500 Error)
# =====================================================================
@app.get("/")
async def root():
    return {"status": "online", "project": "gymai API"}

@app.get("/api/auth/email-status")
async def check_email_status(email: str, db: AsyncSession = Depends(get_db)):
    """
    Checks if a user exists in the database by email address.
    Uses clean asynchronous await patterns to bypass the MissingGreenlet exception.
    """
    try:
        # Create an async query statement
        statement = select(User).where(User.email == email)
        
        # Await the execution cleanly inside the asynchronous event loop
        result = await db.execute(statement)
        user = result.scalar_one_or_none()
        
        if not user:
            return {"exists": False, "email": email}
            
        return {
            "exists": True, 
            "email": user.email, 
            "status": user.status
        }
        
    except Exception as e:
        # Prevent silent backend failures; return explicit debugging context to browser logs
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Asynchronous database operation failed: {str(e)}"
        )
