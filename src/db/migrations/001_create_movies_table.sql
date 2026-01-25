-- Migration: Create Movies table
CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchdog_id TEXT,
    tmdb_id TEXT,
    title TEXT,
    year TEXT,
    popularity REAL,
    has_video INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movies_watchdog_id ON movies(watchdog_id);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);