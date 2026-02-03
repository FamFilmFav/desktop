const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'main', 'testing-noop');
const destDir = path.join(__dirname, '..', 'src', 'main', 'testing');

if (!fs.existsSync(srcDir)) {
  console.warn('No src/main/testing-noop directory found');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

const files = fs.readdirSync(srcDir);
for (const file of files) {
  if (file.endsWith('.ts')) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
}

console.info('Copied testing-noop files to src/main/testing');

const testDir = path.join(__dirname, '..', 'dist', 'tests');

if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
  console.info('Removed dist/tests directory');
}
