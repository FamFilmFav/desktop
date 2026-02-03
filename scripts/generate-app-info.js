// scripts/generate-app-info.js
const fs = require('fs');
const path = require('path');

const pkg = require('../package.json'); // full dev package.json

// Pick only the fields you want
const subset = {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description
};

// Write it into dist/main
const destDirs = [
  path.resolve(__dirname, '../dist/main'),
  path.resolve(__dirname, '../src/main'),
];

for (const outDir of destDirs) {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(outDir, 'app-info.json'),
    JSON.stringify(subset, null, 2)
  );
}

console.log('Generated app-info.json in destination directories');
