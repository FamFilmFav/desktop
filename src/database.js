const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');
const packageJson = require('../package.json');

// Get platform-specific app data directory
function getAppDataDir() {
  const appName = packageJson.name;

  if (process.platform === 'win32') {
    // Windows: %APPDATA%\FamFilmFav
    return path.join(process.env.APPDATA, appName, 'sqlite');
  } else if (process.platform === 'darwin') {
    // macOS: ~/Library/Application Support/FamFilmFav
    return path.join(os.homedir(), 'Library', 'Application Support', appName, 'sqlite');
  } else {
    // Linux: ~/.config/FamFilmFav
    return path.join(os.homedir(), '.config', appName, 'sqlite');
  }
}

let db = null;
let models = null;

function runMigrations() {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const migrationsDir = path.join(__dirname, 'db', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found');
    return;
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Ensure migrations run in order

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Running migration: ${file}`);
    db.exec(sql);
  }
}

function initModels() {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const MoviesModel = require('./db/models/Movies');

  models = {
    movies: new MoviesModel(db)
  };
}

function initDatabase() {
  const appDataDir = getAppDataDir();

  // Create directory if it doesn't exist
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
  }

  const dbPath = path.join(appDataDir, 'famfilmfav.db');

  // Open or create database
  db = new Database(dbPath);

  runMigrations();
  initModels();
}

function initMockDatabase(testDb) {
  if (!testDb) {
    db = new Database(':memory:');
  }
  else {
    db = testDb;
  }

  runMigrations();
  initModels();
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    models = null;
  }
}

function getModels() {
  if (!models) {
    throw new Error('Database not initialized');
  }
  return models;
}

function getStatus() {
  return {
    dbInitialized: !!db,
    dbConnected: !!(db && db.open),
  };
}

module.exports = {
  initDatabase,
  initMockDatabase,
  closeDatabase,
  getModels,
  getStatus,
};
