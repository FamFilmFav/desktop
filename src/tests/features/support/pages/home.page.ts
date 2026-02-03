/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { ElectronApplication, Page } from 'playwright';
import { MovieData } from '../../../../main/db/models/Movies';

/**
 * Page Object for the Home/Movies page
 * Provides methods to interact with the movie list and movie data
 */
export class HomePage {
  private app: ElectronApplication;

  constructor(app: ElectronApplication) {
    this.app = app;
  }

  /**
   * Get the first window of the application
   */
  async getWindow(): Promise<Page> {
    return await this.app.firstWindow();
  }

  /**
   * Get all movies from the database via the electron API
   */
  async getAllMovies(): Promise<MovieData[]> {
    const window = await this.getWindow();
    const result = await window.evaluate(async () => {
      const w = window as unknown as {
        electron: {
          movies: {
            getAll: () => Promise<{ success: boolean; data: MovieData[] }>;
          };
        };
      };
      return await w.electron.movies.getAll();
    });
    
    if (!result.success) {
      throw new Error('Failed to get movies from database');
    }
    
    return result.data;
  }

  /**
   * Get a movie by its TMDB ID
   */
  async getMovieByTmdbId(tmdbId: string): Promise<MovieData | undefined> {
    const window = await this.getWindow();
    const result = await window.evaluate(async (id: string) => {
      const w = window as unknown as {
        electron: {
          movies: {
            getByTmdbId: (id: string) => Promise<{ data?: MovieData }>;
          };
        };
      };
      return await w.electron.movies.getByTmdbId(id);
    }, tmdbId);
    
    return result.data;
  }

  /**
   * Get a movie by its Watchmode ID
   */
  async getMovieByWatchmodeId(watchmodeId: string): Promise<MovieData | undefined> {
    const window = await this.getWindow();
    const result = await window.evaluate(async (id: string) => {
      const w = window as unknown as {
        electron: {
          movies: {
            getByWatchdogId: (id: string) => Promise<{ data?: MovieData }>;
          };
        };
      };
      return await w.electron.movies.getByWatchdogId(id);
    }, watchmodeId);
    
    return result.data;
  }

  /**
   * Get the count of movies in the database
   */
  async getMovieCount(): Promise<number> {
    const movies = await this.getAllMovies();
    return movies.length;
  }
}
