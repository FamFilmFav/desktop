const fs = require('fs');
const path = require('path');

const srcMigrations = path.join(__dirname, '..', 'src', 'db', 'migrations');
const destMigrations = path.join(__dirname, '..', 'dist', 'db', 'migrations');

if (!fs.existsSync(srcMigrations)) {
  console.warn('No src/db/migrations directory found');
  process.exit(0);
}

if (!fs.existsSync(path.join(__dirname, '..', 'dist'))) {
  console.warn('dist/ not found; run tsc first');
  process.exit(1);
}

fs.mkdirSync(destMigrations, { recursive: true });
const files = fs.readdirSync(srcMigrations);
for (const file of files) {
  if (file.endsWith('.sql')) {
    fs.copyFileSync(path.join(srcMigrations, file), path.join(destMigrations, file));
  }
}
console.info('Copied migrations to dist/db/migrations');
