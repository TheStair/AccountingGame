CREATE ROLE game_app LOGIN PASSWORD 'Turmoil4-Mouse8-Attic8-Shorthand4-Catsup8' NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- create the database owned by that role
CREATE DATABASE leaderboard OWNER game_app;

-- Raw score attempts
CREATE TABLE scores (
  id SERIAL PRIMARY KEY,
  game TEXT NOT NULL CHECK (game IN ('game1', 'game2', 'game3-1', 'game3-2', 'game3-3')),
  username VARCHAR(3) NOT NULL CHECK (username ~ '^[a-zA-Z]{3}$'),
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON scores (id, game, score DESC, created_at ASC, username ASC);

DROP FUNCTION IF EXISTS prune_topN() CASCADE;

CREATE OR REPLACE FUNCTION prune_topN()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    N integer := 100;
BEGIN
    WITH to_drop AS (
        SELECT id
        FROM scores
        WHERE game = NEW.game
        ORDER BY score DESC, created_at ASC, username ASC
        OFFSET N
    )
    DELETE FROM scores s
    USING to_drop d
    WHERE s.id = d.id;

    RETURN NULL;
END;
$$;





CREATE TRIGGER scores_keep_topN
AFTER INSERT OR UPDATE OF score ON scores
FOR EACH ROW EXECUTE FUNCTION prune_topN();


GRANT CONNECT ON DATABASE leaderboard TO game_app;
GRANT USAGE ON SCHEMA public TO game_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE scores TO game_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO game_app;

GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.scores_id_seq TO game_app;

