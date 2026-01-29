const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests/integration',
  testMatch: '**/*.test.js',
});