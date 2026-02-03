Feature: Import Movies
  As a user
  I want to import movie data from external sources
  So that I can track my family's favorite films

  Background:
    Given the application is running with a test database

  @import @tmdb
  Scenario: Import movies from TMDB and Watchmode data
    Given stub Watchmode data is loaded from "src/tests/test-double-data/watchmode/import/title_id_map.csv"
    And stub TMDB data is loaded from "src/tests/test-double-data/tmdb/import/movie_ids.json"
    Then I should see 23 movies in the database

  @import @tmdb @missing-data
  Scenario: Movies missing from Watchmode are handled gracefully
    Given stub Watchmode data is loaded from "src/tests/test-double-data/watchmode/import/title_id_map.csv"
    And stub TMDB data is loaded from "src/tests/test-double-data/tmdb/import/movie_ids.json"
    When I look up the movie with TMDB ID "1622513"
    Then the movie should have a null year value

  @import @watchmode @missing-data
  Scenario: Movies missing from TMDB are handled gracefully
    Given stub Watchmode data is loaded from "src/tests/test-double-data/watchmode/import/title_id_map.csv"
    And stub TMDB data is loaded from "src/tests/test-double-data/tmdb/import/movie_ids.json"
    When I look up the movie with Watchmode ID "11083261"
    Then the movie should have a null popularity value
