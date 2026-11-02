CREATE TABLE hill_players (token TEXT PRIMARY KEY, id TEXT NOT NULL, car TEXT NOT NULL, input TEXT NOT NULL, updated INTEGER NOT NULL, last_input INTEGER NOT NULL, last_seen INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0);
CREATE INDEX hill_players_seen ON hill_players(last_seen);
