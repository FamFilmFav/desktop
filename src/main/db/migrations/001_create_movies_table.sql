-- Migration: Create Movies table
CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchmode_id TEXT,
    tmdb_id TEXT,
    original_title TEXT,
    normalized_title TEXT,
    year TEXT,
    popularity REAL,
    has_video INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_movies_watchmode_id ON movies(watchmode_id);
CREATE INDEX IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id);