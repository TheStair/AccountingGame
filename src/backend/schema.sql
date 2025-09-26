CREATE ROLE game_app LOGIN PASSWORD 'Turmoil4-Mouse8-Attic8-Shorthand4-Catsup8' NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- create the database owned by that role
CREATE DATABASE leaderboard OWNER game_app;

-- Raw score attempts
CREATE TABLE scores (
  game     TEXT NOT NULL CHECK (game IN ('game1','game2','game3')),
  username VARCHAR(3) NOT NULL CHECK (username ~ '^[a-z A-Z 0-9]{3}$'),
  score    INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- hidden tie-breaker
  PRIMARY KEY (game, username)   -- one best per username per game
);

CREATE INDEX ON scores (game, score DESC, created_at ASC, username ASC);

CREATE OR REPLACE FUNCTION prune_topN() RETURNS trigger AS $$
DECLARE
  N integer := 100;
BEGIN
  WITH to_drop AS (
    SELECT username
    FROM scores
    WHERE game = NEW.game
    ORDER BY score DESC, created_at ASC, username ASC
    OFFSET N
  )
  DELETE FROM scores s
  USING to_drop d
  WHERE s.game = NEW.game AND s.username = d.username;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scores_keep_topN
AFTER INSERT OR UPDATE OF score ON scores
FOR EACH ROW EXECUTE FUNCTION prune_topN();

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO game_app;

