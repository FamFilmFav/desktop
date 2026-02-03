/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import MoviesModel from './db/models/Movies';


// eslint-disable-next-line @typescript-eslint/no-require-imports
const appInfoJson = require(path.join(__dirname, 'app-info.json')) as { name: string };

interface DbModels {
  movies: MoviesModel;
}

let db: Database.Database | null = null;
let models: DbModels | null = null;

function getAppDataDir(): string {
  const appName = appInfoJson.name;

  if (process.platform === 'win32') {
    const appData = process.env.APPDATA;
    if (!appData) throw new Error('APPDATA is not set');
    return path.join(appData, appName, 'sqlite');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', appName, 'sqlite');
  }
  return path.join(os.homedir(), '.config', appName, 'sqlite');
}

function runMigrations(): void {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const migrationsDir = path.join(__dirname, 'db', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.error('No migrations directory found');
    return;
  }

  const migrationFiles = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.info(`Running migration: ${file}`);
    db.exec(sql);
  }
}

function initModels(): void {
  if (!db) {
    throw new Error('Database not initialized');
  }
  models = {
    movies: new MoviesModel(db as Database.Database)
  };
}

export function initDatabase(): void {
  const appDataDir = getAppDataDir();

  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }

  const dbPath = path.join(appDataDir, 'FamilyWatchNight.db');
  db = new Database(dbPath);
  runMigrations();
  initModels();
}

export function initMockDatabase(testDb?: Database.Database | null): void {
  if (!testDb) {
    db = new Database(':memory:');
  } else {
    db = testDb;
  }
  runMigrations();
  initModels();
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    models = null;
  }
}

export function getModels(): DbModels {
  if (!models) {
    throw new Error('Database not initialized');
  }
  return models;
}

export function getStatus(): { dbInitialized: boolean; dbConnected: boolean } {
  return {
    dbInitialized: !!db,
    dbConnected: !!db
  };
}
