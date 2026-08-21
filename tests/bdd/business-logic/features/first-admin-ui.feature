@ui
@bootstrap
Feature: First admin user interface
  As a new user
  I want to create the first administrator account
  So that I can get the application ready to use

  Scenario: Create the first admin with optional details
    Given I open the app window as an unauthenticated user
    And the first admin setup is visible
    When I submit the first admin form with username "first-admin", password "secret", email "admin@example.com", and display name "First Admin"
    Then the first admin creation success message is visible
    And the first admin setup is no longer visible

  Scenario: Create the first admin without optional details
    Given I open the app window as an unauthenticated user
    And the first admin setup is visible
    When I submit the first admin form with username "minimal-admin" and no optional details
    Then the first admin creation success message is visible
    And the first admin setup is no longer visible

  Scenario: Username is required
    Given I open the app window as an unauthenticated user
    And the first admin setup is visible
    When I submit the first admin form without a username
    Then the first admin error message is visible

  Scenario: Whitespace-only username is rejected
    Given I open the app window as an unauthenticated user
    And the first admin setup is visible
    When I submit the first admin form with username "   " and no optional details
    Then the first admin error message is visible

  Scenario: Bootstrap setup is hidden when a user already exists
    Given a user exists with username "existing-user"
    And I open the app window as an unauthenticated user
    Then the first admin setup is not visible
