/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

module.exports = {
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/unit/**/*.test.tsx'],
  testEnvironment: 'node',
  // Transform TypeScript and JavaScript files with @swc/jest so ESM packages
  // like `lodash-es` can be transpiled for the Jest runtime.
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['@swc/jest'],
  },
  // By default Jest ignores node_modules. We need to transform `lodash-es`
  // (and other ESM-only packages) — exclude it from the ignore list.
  transformIgnorePatterns: ['node_modules/(?!(lodash-es)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!tests/**/*', '!src/**/*.d.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
};
