CREATE ROLE game_app LOGIN PASSWORD 'Turmoil4-Mouse8-Attic8-Shorthand4-Catsup8' NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- create the database owned by that role
CREATE DATABASE leaderboard OWNER game_app;

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('student','professor','admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Raw score attempts
CREATE TABLE IF NOT EXISTS score_attempts (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL CHECK (score >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_score_attempts_user_id ON score_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_score_attempts_score   ON score_attempts(score DESC);

-- Optional seed
INSERT INTO users (username, role) VALUES
  ('alice', 'student'),
  ('bob', 'student'),
  ('dr_smith', 'professor')
ON CONFLICT DO NOTHING;

INSERT INTO score_attempts (user_id, score)
SELECT id, (random()*1000)::int FROM users WHERE role='student';