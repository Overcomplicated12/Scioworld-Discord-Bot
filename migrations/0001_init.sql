-- No student names, emails, or message contents are collected.
-- IDs are Discord snowflakes stored as text (avoid JS precision issues).
CREATE TABLE IF NOT EXISTS players (
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  wood INTEGER NOT NULL DEFAULT 0 CHECK (wood >= 0),
  stone INTEGER NOT NULL DEFAULT 0 CHECK (stone >= 0),
  artifacts INTEGER NOT NULL DEFAULT 0 CHECK (artifacts >= 0),
  contributed INTEGER NOT NULL DEFAULT 0 CHECK (contributed >= 0),
  last_explore_at INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS worlds (
  guild_id TEXT PRIMARY KEY,
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0)
);

CREATE TABLE IF NOT EXISTS contributions (
  interaction_id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  resource TEXT NOT NULL CHECK (resource IN ('wood', 'stone')),
  amount INTEGER NOT NULL CHECK (amount BETWEEN 1 AND 20),
  points INTEGER NOT NULL CHECK (
    points = CASE resource WHEN 'wood' THEN amount ELSE amount * 2 END
  ),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- The insert, inventory deduction, and world contribution succeed or fail together.
CREATE TRIGGER IF NOT EXISTS check_contribution
BEFORE INSERT ON contributions
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM players WHERE guild_id = NEW.guild_id AND user_id = NEW.user_id
    AND (CASE NEW.resource WHEN 'wood' THEN wood ELSE stone END) >= NEW.amount
  ) THEN RAISE(ABORT, 'INSUFFICIENT_RESOURCES') END;
END;

CREATE TRIGGER IF NOT EXISTS apply_contribution
AFTER INSERT ON contributions
BEGIN
  UPDATE players SET
    wood = wood - CASE NEW.resource WHEN 'wood' THEN NEW.amount ELSE 0 END,
    stone = stone - CASE NEW.resource WHEN 'stone' THEN NEW.amount ELSE 0 END,
    contributed = contributed + NEW.points
  WHERE guild_id = NEW.guild_id AND user_id = NEW.user_id;
  UPDATE worlds SET total_points = total_points + NEW.points
  WHERE guild_id = NEW.guild_id;
END;

CREATE INDEX IF NOT EXISTS idx_players_contributions
  ON players(guild_id, contributed DESC);
