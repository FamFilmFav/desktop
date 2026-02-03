/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { initMockDatabase, getModels } from '../../main/database';

const mockStatement = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
};

test('db/models/Movies/normalizeTitle test', () => {
  const db = {
    prepare: jest.fn(() => mockStatement),
    exec: jest.fn(),
  };

  initMockDatabase(db as never);

  const movies = getModels().movies;

  const testCases: Array<{ input: string; expected: string }> = [
    { input: '"Café Society"', expected: '"Cafe Society"' },
    { input: 'Amélie', expected: 'Amelie' },
    { input: 'Léon – The \'Professional\'', expected: 'Leon - The \'Professional\'' },
    { input: 'Fargo', expected: 'Fargo' },
    { input: 'Señorita', expected: 'Senorita' },
    { input: 'Pokémon — The First Movie', expected: 'Pokemon - The First Movie' },
    { input: 'Björk\'s Dancer in the Dark', expected: 'Bjork\'s Dancer in the Dark' },
    { input: 'Smörgåsbord', expected: 'Smorgasbord' },
    { input: 'The Hobbit — An Unexpected Journey', expected: 'The Hobbit - An Unexpected Journey' },
    { input: 'Zoë\'s Extraordinary Playlist', expected: 'Zoe\'s Extraordinary Playlist' },
  ];

  testCases.forEach(({ input, expected }) => {
    const normalized = movies.normalizeTitle(input);
    expect(normalized).toBe(expected);
  });
});
