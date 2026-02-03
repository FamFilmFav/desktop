const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'src/tests/integration',
  testMatch: '**/*.test.ts',
});