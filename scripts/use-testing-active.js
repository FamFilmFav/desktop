const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'main', 'testing-active');
const destDir = path.join(__dirname, '..', 'src', 'main', 'testing');

if (!fs.existsSync(srcDir)) {
  console.warn('No src/main/testing-active directory found');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

const files = fs.readdirSync(srcDir);
for (const file of files) {
  if (file.endsWith('.ts')) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  }
}

console.info('Copied testing-active files to src/main/testing');