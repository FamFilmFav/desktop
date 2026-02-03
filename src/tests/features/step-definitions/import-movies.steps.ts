import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../support/world';
import { MovieData } from '../../../main/db/models/Movies';

// Store the current movie being examined
let currentMovie: MovieData | undefined;

Given('the application is running with a test database', async function (this: CustomWorld) {
  // App is launched in Before hook
  await this.initMockDatabase();
});

Given('stub Watchmode data is loaded from {string}', async function (this: CustomWorld, dataSource: string) {
  await this.loadStubWatchmodeData(dataSource);
});

Given('stub TMDB data is loaded from {string}', async function (this: CustomWorld, dataSource: string) {
  await this.loadStubTmdbData(dataSource);
});

When('I look up the movie with TMDB ID {string}', async function (this: CustomWorld, tmdbId: string) {
  currentMovie = await this.homePage.getMovieByTmdbId(tmdbId);
});

When('I look up the movie with Watchmode ID {string}', async function (this: CustomWorld, watchmodeId: string) {
  currentMovie = await this.homePage.getMovieByWatchmodeId(watchmodeId);
});

Then('I should see {int} movies in the database', async function (this: CustomWorld, expectedCount: number) {
  const movieCount = await this.homePage.getMovieCount();
  expect(movieCount).toBe(expectedCount);
});

Then('the movie should have a null year value', async function (this: CustomWorld) {
  expect(currentMovie).toBeDefined();
  expect(currentMovie!.year).toBeNull();
});

Then('the movie should have a null popularity value', async function (this: CustomWorld) {
  expect(currentMovie).toBeDefined();
  expect(currentMovie!.popularity).toBeNull();
});

Then('the movie should exist', async function (this: CustomWorld) {
  expect(currentMovie).toBeDefined();
});

Then('the original movie title should be {string}', async function (this: CustomWorld, expectedTitle: string) {
  expect(currentMovie).toBeDefined();
  expect(currentMovie!.original_title).toBe(expectedTitle);
});
