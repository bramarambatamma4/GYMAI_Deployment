from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

# 1. Initialize FastAPI Application
app = FastAPI()

# 2. Add CORSMiddleware (Fixes the Cross-Origin Blocked Error)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows your live frontend site to connect cleanly
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"],
)

# --- Your Database engine and session setup goes here ---
# (Ensure you are using create_async_engine and async_sessionmaker)

# 3. Fix the Email Status Route (Fixes the MissingGreenlet 500 Error)
# Notice the "async def" and the "await" keyword on session.execute
@app.get("/api/auth/email-status")
async def check_email_status(email: str, db: AsyncSession = Depends(get_db)):
    try:
        # We MUST use await here so SQLAlchemy doesn't block the loop
        statement = select(User).where(User.email == email)
        result = await db.execute(statement)
        user = result.scalar_one_or_none()
        
        if not user:
            return {"exists": False}
            
        return {"exists": True, "status": user.status}
        
    except Exception as e:
        # This catches crashes and returns a readable message instead of a generic 500
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database execution failed: {str(e)}"
        )

