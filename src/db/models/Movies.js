const Database = require('better-sqlite3');

// Movies table operations
class MoviesModel {
  constructor(db) {
    this.db = db;
    this.initStatements();
  }

  initStatements() {
    // Prepared statements for CRUD operations
    this.insertStmt = this.db.prepare(`
      INSERT INTO movies (watchdog_id, tmdb_id, title, year, popularity, has_video)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = this.db.prepare(`
      SELECT * FROM movies WHERE id = ?
    `);

    this.getByWatchdogIdStmt = this.db.prepare(`
      SELECT * FROM movies WHERE watchdog_id = ?
    `);

    this.getByTmdbIdStmt = this.db.prepare(`
      SELECT * FROM movies WHERE tmdb_id = ?
    `);

    this.getAllStmt = this.db.prepare(`
      SELECT * FROM movies ORDER BY title
    `);

    this.updateStmt = this.db.prepare(`
      UPDATE movies
      SET watchdog_id = ?, tmdb_id = ?, title = ?, year = ?, popularity = ?, has_video = ?
      WHERE id = ?
    `);

    this.deleteStmt = this.db.prepare(`
      DELETE FROM movies WHERE id = ?
    `);

    this.searchByTitleStmt = this.db.prepare(`
      SELECT * FROM movies WHERE title LIKE ? ORDER BY title
    `);
  }

  // Create a new movie
  create(movieData) {
    const { watchdog_id, tmdb_id, title, year, popularity, has_video } = movieData;
    const result = this.insertStmt.run(watchdog_id, tmdb_id, title, year, popularity, has_video ? 1 : 0);
    return result.lastInsertRowid;
  }

  // Get movie by ID
  getById(id) {
    const row = this.getByIdStmt.get(id);
    return row ? this.formatMovie(row) : null;
  }

  // Get movie by Watchdog ID
  getByWatchdogId(watchdogId) {
    const row = this.getByWatchdogIdStmt.get(watchdogId);
    return row ? this.formatMovie(row) : null;
  }

  // Get movie by TMDB ID
  getByTmdbId(tmdbId) {
    const row = this.getByTmdbIdStmt.get(tmdbId);
    return row ? this.formatMovie(row) : null;
  }

  // Get all movies
  getAll() {
    const rows = this.getAllStmt.all();
    return rows.map(row => this.formatMovie(row));
  }

  // Update movie
  update(id, movieData) {
    const { watchdog_id, tmdb_id, title, year, popularity, has_video } = movieData;
    const result = this.updateStmt.run(watchdog_id, tmdb_id, title, year, popularity, has_video ? 1 : 0, id);
    return result.changes > 0;
  }

  // Delete movie
  delete(id) {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  // Search movies by title (partial match)
  searchByTitle(searchTerm) {
    const rows = this.searchByTitleStmt.all(`%${searchTerm}%`);
    return rows.map(row => this.formatMovie(row));
  }

  // Upsert from Watchmode data
  upsertFromWatchmode(watchmodeId, tmdbId, title, year) {
    // Check if movie exists by watchmode_id
    const existing = this.getByWatchdogId(watchmodeId);
    
    if (existing) {
      // Update existing movie
      const updateData = {
        watchdog_id: watchmodeId,
        tmdb_id: tmdbId,
        year: year,
        has_video: existing.has_video // Keep existing value
      };
      
      // Only update title if it's currently blank or missing
      if (!existing.title || existing.title.trim() === '') {
        updateData.title = title;
      } else {
        updateData.title = existing.title;
      }
      
      this.update(existing.id, updateData);
      return existing.id;
    } else {
      // Create new movie
      const movieData = {
        watchdog_id: watchmodeId,
        tmdb_id: tmdbId,
        title: title,
        year: year,
        popularity: null, // Will be filled by TMDB import
        has_video: false // Default
      };
      
      return this.create(movieData);
    }
  }

  // Helper to format movie data (convert has_video to boolean)
  formatMovie(row) {
    return {
      id: row.id,
      watchdog_id: row.watchdog_id,
      tmdb_id: row.tmdb_id,
      title: row.title,
      year: row.year,
      popularity: row.popularity,
      has_video: Boolean(row.has_video)
    };
  }
}

module.exports = MoviesModel;