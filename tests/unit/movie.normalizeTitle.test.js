test('db/models/Movies/normalizeTitle test', () => {
    const { initMockDatabase, getModels } = require('../../src/database');

    const db = {
        prepare: jest.fn(),
    };

    initMockDatabase(db);

    const movies = getModels().movies;

    const testCases = [
        { input: '“Café Society”', expected: '"Cafe Society"' },
        { input: 'Amélie', expected: 'Amelie' },
        { input: 'Léon – The ‘Professional’', expected: 'Leon - The \'Professional\'' },
        { input: 'Fargo', expected: 'Fargo' },
        { input: 'Señorita', expected: 'Senorita' },
        { input: 'Pokémon — The First Movie', expected: 'Pokemon - The First Movie' },
        { input: 'Björk’s Dancer in the Dark', expected: 'Bjork\'s Dancer in the Dark' },
        { input: 'Smörgåsbord', expected: 'Smorgasbord' },
        { input: 'The Hobbit — An Unexpected Journey', expected: 'The Hobbit - An Unexpected Journey' },
        { input: 'Zoë’s Extraordinary Playlist', expected: 'Zoe\'s Extraordinary Playlist' },
    ];

    testCases.forEach(({ input, expected }) => {
        const normalized = movies.normalizeTitle(input);
        expect(normalized).toBe(expected);
    });
});