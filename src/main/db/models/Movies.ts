import type Database from 'better-sqlite3';

export interface MovieRow {
  id: number;
  watchmode_id: string | null;
  tmdb_id: string | null;
  original_title: string | null;
  normalized_title: string | null;
  year: string | null;
  popularity: number | null;
  has_video: number;
}

export interface Movie {
  id: number;
  watchmode_id: string | null;
  tmdb_id: string | null;
  original_title: string | null;
  normalized_title: string | null;
  year: string | null;
  popularity: number | null;
  has_video: boolean;
}

export interface MovieData {
  watchmode_id: string | null;
  tmdb_id: string | null;
  original_title: string | null;
  normalized_title: string | null;
  year: string | null;
  popularity: number | null;
  has_video: boolean;
}

export default class MoviesModel {
  private db: Database.Database;
  private insertStmt!: Database.Statement;
  private getByIdStmt!: Database.Statement;
  private getByWatchmodeIdStmt!: Database.Statement;
  private getByTmdbIdStmt!: Database.Statement;
  private getAllStmt!: Database.Statement;
  private updateStmt!: Database.Statement;
  private deleteStmt!: Database.Statement;
  private searchByTitleStmt!: Database.Statement;

  constructor(db: Database.Database) {
    this.db = db;
    this.initStatements();
  }

  private initStatements(): void {
    this.insertStmt = this.db.prepare(`
      INSERT INTO movies (watchmode_id, tmdb_id, original_title, normalized_title, year, popularity, has_video)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = this.db.prepare(`
      SELECT * FROM movies WHERE id = ?
    `);

    this.getByWatchmodeIdStmt = this.db.prepare(`
      SELECT * FROM movies WHERE watchmode_id = ?
    `);

    this.getByTmdbIdStmt = this.db.prepare(`
      SELECT * FROM movies WHERE tmdb_id = ?
    `);

    this.getAllStmt = this.db.prepare(`
      SELECT * FROM movies ORDER BY normalized_title
    `);

    this.updateStmt = this.db.prepare(`
      UPDATE movies
      SET watchmode_id = ?, tmdb_id = ?, original_title = ?, normalized_title = ?, year = ?, popularity = ?, has_video = ?
      WHERE id = ?
    `);

    this.deleteStmt = this.db.prepare(`
      DELETE FROM movies WHERE id = ?
    `);

    this.searchByTitleStmt = this.db.prepare(`
      SELECT * FROM movies WHERE normalized_title LIKE ? ORDER BY normalized_title
    `);
  }

  create(movieData: MovieData): number {
    const { watchmode_id, tmdb_id, original_title, normalized_title, year, popularity, has_video } = movieData;
    const result = this.insertStmt.run(
      watchmode_id,
      tmdb_id,
      original_title,
      normalized_title,
      year,
      popularity,
      has_video ? 1 : 0
    );
    return Number(result.lastInsertRowid);
  }

  getById(id: number): Movie | null {
    const row = this.getByIdStmt.get(id) as MovieRow | undefined;
    return row ? this.formatMovie(row) : null;
  }

  getByWatchmodeId(watchmodeId: string): Movie | null {
    const row = this.getByWatchmodeIdStmt.get(watchmodeId) as MovieRow | undefined;
    return row ? this.formatMovie(row) : null;
  }

  getByTmdbId(tmdbId: string): Movie | null {
    const row = this.getByTmdbIdStmt.get(tmdbId) as MovieRow | undefined;
    return row ? this.formatMovie(row) : null;
  }

  getAll(): Movie[] {
    const rows = this.getAllStmt.all() as MovieRow[];
    return rows.map((row) => this.formatMovie(row));
  }

  update(id: number, movieData: MovieData): boolean {
    const { watchmode_id, tmdb_id, original_title, normalized_title, year, popularity, has_video } = movieData;
    const result = this.updateStmt.run(
      watchmode_id,
      tmdb_id,
      original_title,
      normalized_title,
      year,
      popularity,
      has_video ? 1 : 0,
      id
    );
    return result.changes > 0;
  }

  delete(id: number): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  searchByTitle(searchTerm: string): Movie[] {
    const rows = this.searchByTitleStmt.all(`%${searchTerm}%`) as MovieRow[];
    return rows.map((row) => this.formatMovie(row));
  }

  upsertFromWatchmode(
    watchmodeId: string,
    tmdbId: string,
    title: string,
    year: string | null
  ): number {
    const existing = this.getByWatchmodeId(watchmodeId);

    if (existing) {
      const updateData: MovieData = {
        watchmode_id: watchmodeId,
        tmdb_id: tmdbId,
        year: year,
        popularity: existing.popularity,
        has_video: existing.has_video,
        original_title: !existing.original_title || existing.original_title.trim() === '' ? title : existing.original_title,
        normalized_title:
          !existing.original_title || existing.original_title.trim() === ''
            ? this.normalizeTitle(title)
            : existing.normalized_title
      };
      this.update(existing.id, updateData);
      return existing.id;
    }
    const movieData: MovieData = {
      watchmode_id: watchmodeId,
      tmdb_id: tmdbId,
      original_title: title,
      normalized_title: this.normalizeTitle(title),
      year: year,
      popularity: null,
      has_video: false
    };
    return this.create(movieData);
  }

  upsertFromTmdb(
    tmdbId: string,
    title: string,
    popularity: number | null,
    has_video: boolean
  ): number {
    const existing = this.getByTmdbId(tmdbId);

    if (existing) {
      const updateData: MovieData = {
        watchmode_id: existing.watchmode_id,
        tmdb_id: tmdbId,
        year: existing.year,
        popularity,
        has_video,
        original_title:
          !existing.original_title || existing.original_title.trim() === '' ? title : existing.original_title,
        normalized_title:
          !existing.original_title || existing.original_title.trim() === ''
            ? this.normalizeTitle(title)
            : existing.normalized_title
      };
      this.update(existing.id, updateData);
      return existing.id;
    }
    const movieData: MovieData = {
      watchmode_id: null,
      tmdb_id: tmdbId,
      original_title: title,
      normalized_title: this.normalizeTitle(title),
      year: null,
      popularity,
      has_video
    };
    return this.create(movieData);
  }

  formatMovie(row: MovieRow): Movie {
    return {
      id: row.id,
      watchmode_id: row.watchmode_id,
      tmdb_id: row.tmdb_id,
      original_title: row.original_title,
      normalized_title: row.normalized_title,
      year: row.year,
      popularity: row.popularity,
      has_video: Boolean(row.has_video)
    };
  }

  normalizeTitle(title: string): string {
    return title
      // 1. Normalize accented characters → base letters
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      // 2. Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // 3. Normalize dashes
      .replace(/[–—―]/g, '-');
  }
}
