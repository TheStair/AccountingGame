# main.py
import os
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Integer, Text, CheckConstraint, ForeignKey, func, select, desc
from sqlalchemy.orm import Mapped, mapped_column, relationship, declarative_base
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

# ---- Static tokens for POC ----
TOKENS = {
    "student_token": "student",
    "faculty_token": "professor",
}
def get_role_from_token(token: str) -> str:
    role = TOKENS.get(token)
    if not role:
        raise HTTPException(status_code=401, detail="Invalid token")
    return role

# ---- DB setup ----
engine = create_async_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    scores: Mapped[List["ScoreAttempt"]] = relationship(back_populates="user")
    __table_args__ = (CheckConstraint("role in ('student','professor','admin')", name="role_check"),)

class ScoreAttempt(Base):
    __tablename__ = "score_attempts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
    user: Mapped[User] = relationship(back_populates="scores")
    __table_args__ = (CheckConstraint("score >= 0", name="score_nonnegative"),)

async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session

# ---- Schemas ----
class SubmitScoreBody(BaseModel):
    token: str = Field(..., description="Use 'student_token' for POC")
    username: str = Field(..., min_length=1, max_length=64)
    score: int = Field(..., ge=0)

class LeaderboardRow(BaseModel):
    username: str
    max_score: int
    last_attempt_at: datetime

class AttemptRow(BaseModel):
    username: str
    score: int
    created_at: datetime

# ---- App ----
app = FastAPI(title="Leaderboard API (POC)")
if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

@app.on_event("startup")
async def startup():
    # Ensure tables exist if you didn't run schema.sql (harmless if they do)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.post("/scores", status_code=201)
async def submit_score(payload: SubmitScoreBody, db: AsyncSession = Depends(get_db)):
    role = get_role_from_token(payload.token)
    if role != "student":
        raise HTTPException(status_code=403, detail="Only students can submit scores")

    # get-or-create user as student
    res = await db.execute(select(User).where(User.username == payload.username))
    user = res.scalar_one_or_none()
    if user is None:
        user = User(username=payload.username, role="student")
        db.add(user)
        await db.flush()
    elif user.role != "student":
        raise HTTPException(status_code=403, detail="Username reserved for non-student")

    db.add(ScoreAttempt(user_id=user.id, score=payload.score))
    await db.commit()
    return {"ok": True, "message": "Score recorded."}

@app.get("/leaderboard", response_model=List[LeaderboardRow])
async def leaderboard(
    token: str = Query(..., description="student_token or faculty_token"),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    _ = get_role_from_token(token)
    stmt = (
        select(
            User.username.label("username"),
            func.max(ScoreAttempt.score).label("max_score"),
            func.max(ScoreAttempt.created_at).label("last_attempt_at"),
        )
        .join(ScoreAttempt, ScoreAttempt.user_id == User.id)
        .group_by(User.username)
        .order_by(desc(func.max(ScoreAttempt.score)), desc(func.max(ScoreAttempt.created_at)))
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    return [LeaderboardRow(**dict(r._mapping)) for r in rows]

@app.get("/attempts", response_model=List[AttemptRow])
async def attempts(
    token: str = Query(...),
    username: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    role = get_role_from_token(token)
    if role != "professor":
        raise HTTPException(status_code=403, detail="Professors only")

    stmt = (
        select(User.username, ScoreAttempt.score, ScoreAttempt.created_at)
        .join(ScoreAttempt, ScoreAttempt.user_id == User.id)
        .order_by(desc(ScoreAttempt.created_at))
        .limit(limit)
    )
    if username:
        stmt = stmt.where(User.username == username)

    rows = (await db.execute(stmt)).all()
    return [AttemptRow(**dict(r._mapping)) for r in rows]
