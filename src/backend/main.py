# main.py
import os
from datetime import datetime
from typing import List, Literal, TypedDict, Optional
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Body, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import re

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
ALLOWED_GAMES = {"game1", "game2", "game3-1", "game3-2", "game3-3"}
USERNAME_RE = re.compile(r"^[A-Za-z]{3}$")
TOP_N = 100

GAME_ALIASES = {
    "game1": "game1",
    "game2": "game2",
    "gm3-level1": "game3-1",
    "gm3-level2": "game3-2",
    "gm3-level3": "game3-3"
}
 
@asynccontextmanager
async def lifespan(app: FastAPI):
    global pool
    # startup
    pool = SimpleConnectionPool(minconn=1, maxconn=10, dsn=DATABASE_URL)
    yield
    # shutdown
    if pool:
        pool.closeall()
        pool = None

app = FastAPI(lifespan=lifespan, title="Arcade Leaderboard API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # <-- allow all domains
    allow_credentials=True,
    allow_methods=["*"],        # <-- allow all methods (GET, POST, etc.)
    allow_headers=["*"],        # <-- allow all headers
)

class LeaderboardRow(BaseModel):
    rank: int
    score: int
    username: str


SQL_GET_LEADERBOARD = """
SELECT
  RANK() OVER (ORDER BY score DESC, created_at ASC, username ASC) AS rank,
  score,
  username
FROM scores
WHERE scores.game = %s
ORDER BY rank
LIMIT %s;
"""

# SELECT
#   RANK() OVER (ORDER BY score DESC, created_at ASC, username ASC) AS rank,
#   score,
#   username
# FROM scores
# WHERE scores.game = 'game1'
# ORDER BY rank
# LIMIT 10;


@app.get(
    "/leaderboard/{game}",
    response_model=List[LeaderboardRow],
    summary="Get leaderboard for a game",
    description="Returns rank, score, username for the requested game."
)
def get_leaderboard(
    game: str = Path(..., description="Game identifier (e.g., 'game1')"),
    limit: int = Query(TOP_N, ge=1, le=100, description="Number of rows to return (1–100)."),
):
    game = GAME_ALIASES.get(game.lower(), game.lower())

    if game not in ALLOWED_GAMES:
        raise HTTPException(status_code=404, detail="Unknown game")

    if pool is None:
        raise HTTPException(status_code=500, detail="DB not initialized")

    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            cur.execute(SQL_GET_LEADERBOARD, (game, limit))
            rows = cur.fetchall()
        # rows: List[tuple(rank, score, username)]
        return [{"rank": r, "score": s, "username": u.strip() if isinstance(u, str) else u} for (r, s, u) in rows]
    finally:
        pool.putconn(conn)

# WITH ranked AS (
#   SELECT score
#   FROM scores
#   WHERE game = $1
#   ORDER BY score DESC, created_at ASC, username ASC
#   OFFSET $2 - 1   -- $2 = N
#   LIMIT 1
# )
# SELECT score FROM ranked;

# INSERT INTO scores (game, username, score)
# VALUES ($1, UPPER($2), $3)
# ON CONFLICT (game, username)
# DO UPDATE SET
#   score = GREATEST(scores.score, EXCLUDED.score),
#   created_at = CASE
#                  WHEN EXCLUDED.score > scores.score THEN NOW()
#                  ELSE scores.created_at
#                END
# RETURNING game, username, score;

SQL_GET_CUTOFF = """
-- Nth best score for this game (NULL if fewer than N rows)
WITH ranked AS (
  SELECT score
  FROM public.scores
  WHERE game = %s
  ORDER BY score DESC, created_at ASC, username ASC
  OFFSET %s - 1
  LIMIT 1
)
SELECT score FROM ranked;
"""

SQL_UPSERT = """
INSERT INTO public.scores (game, username, score)
VALUES (%s, %s, %s)
RETURNING id, game, score;
"""

SQL_PRUNE = """
-- Keep only Top-N rows for this game (score DESC, then created_at, then username)
WITH to_drop AS (
  SELECT id
  FROM public.scores
  WHERE game = %s
  ORDER BY score DESC, created_at ASC, username ASC
  OFFSET %s
)
DELETE FROM public.scores s
USING to_drop d
WHERE s.id = d.id;
"""

SQL_GET_RANK_FOR_USER = """
SELECT rank FROM (
  SELECT
    id,
    RANK() OVER (ORDER BY score DESC, created_at ASC, username ASC) AS rank
  FROM public.scores
  WHERE game = %s
) r
WHERE r.id = %s;
"""

class SubmitPayload(BaseModel):
    game: str = Field(..., examples=["game1"])
    username: str = Field(..., min_length=3, max_length=3, examples=["ABC"])
    score: int = Field(..., ge=0, examples=[12345])

class SubmitResult(BaseModel):
    accepted: bool          # True if it made/stayed in Top-N after pruning
    rank: Optional[int]     # rank if accepted, else None
    score: int              # stored/best score for that username in this game
    username: str
    game: str

@app.post("/submit", response_model=SubmitResult, summary="Submit a score (Top-N only)")
def submit_score(payload: SubmitPayload = Body(...)):

    game = GAME_ALIASES.get(payload.game.lower(), payload.game.lower())

    if game not in ALLOWED_GAMES:
        raise HTTPException(status_code=400, detail="Unknown game")
    if not USERNAME_RE.fullmatch(payload.username):
        raise HTTPException(status_code=400, detail="Username must be 3 letters A–Z")
    username = payload.username.upper()

    if pool is None:
        raise HTTPException(status_code=500, detail="DB not initialized")

    conn = pool.getconn()
    try:
        with conn:
            with conn.cursor() as cur:
                # 1) Check Nth cutoff (None if board not full)
                cur.execute(SQL_GET_CUTOFF, (game, TOP_N))
                row = cur.fetchone()
                cutoff = row[0] if row else None


                cur.execute(SQL_UPSERT, (game, username, payload.score))
                row_id, stored_game, stored_score = cur.fetchone()

                # 3) Prune beyond Top-N for this game
                cur.execute(SQL_PRUNE, (payload.game, TOP_N))


                # 5) Fetch its rank (by id, not username)
                cur.execute(SQL_GET_RANK_FOR_USER, (payload.game, row_id))
                r = cur.fetchone()
                if not r:
                    # Rare case: pruned before rank check
                    return SubmitResult(
                        accepted=False,
                        rank=None,
                        score=stored_score,
                        username=username,
                        game=payload.game,
                    )

                return SubmitResult(
                    accepted=True,
                    rank=int(r[0]),
                    score=stored_score,
                    username=username,
                    game=stored_game,
                )
    finally:
        pool.putconn(conn)

SQL_PREVIEW = """
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE score > %s) AS cnt_gt,
    COUNT(*) FILTER (WHERE score = %s) AS cnt_eq,
    COUNT(*)                             AS rows_total
  FROM public.scores
  WHERE game = %s
)
SELECT
  1 + cnt_gt + cnt_eq AS preview_rank,
  (rows_total < %s) OR (1 + cnt_gt + cnt_eq) <= %s AS qualifies,
  rows_total AS current_rows
FROM stats;
"""

class PreviewResponse(BaseModel):
    preview_rank: int
    qualifies: bool
    current_rows: int
    top_n: int
    game: str
    score: int

@app.get("/preview", response_model=PreviewResponse, summary="Preview rank for a score (no insert)")
def preview_rank(game: str, score: int, n: int = TOP_N):

    game = GAME_ALIASES.get(game.lower(), game.lower())

    if pool is None:
        raise HTTPException(status_code=500, detail="DB not initialized")
    if game not in ALLOWED_GAMES:
        raise HTTPException(status_code=400, detail="Unknown game")
    if score < 0:
        raise HTTPException(status_code=400, detail="Score must be >= 0")


    conn = pool.getconn()
    try:
        with conn.cursor() as cur:
            # Note the order of params matches %s positions
            cur.execute(SQL_PREVIEW, (score, score, game, n, n))
            r = cur.fetchone()
            if not r:
                # empty table case shouldn't happen because query always returns 1 row
                return PreviewResponse(
                    preview_rank=1, qualifies=True, current_rows=0, top_n=n, game=game, score=score
                )
            preview_rank, qualifies, current_rows = r
            return PreviewResponse(
                preview_rank=int(preview_rank),
                qualifies=bool(qualifies),
                current_rows=int(current_rows),
                top_n=n,
                game=game,
                score=score,
            )
    finally:
        pool.putconn(conn)