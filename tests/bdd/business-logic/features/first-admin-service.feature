@auth
@bootstrap
Feature: First admin user bootstrap service
  The first user can be created without authentication and receives the administrator role.

  Scenario: Create the first admin with optional account and profile data
    Given the database has no users
    When I create the first admin with username "first-admin", email "admin@example.com", password "secret", and display name "First Admin"
    Then the first admin should be created successfully
    And the user's roles should be exactly "admin"
    And the first admin profile should contain email "admin@example.com" and display name "First Admin"

  Scenario: Create the first admin without optional values
    Given the database has no users
    When I create the first admin with username "minimal-admin" and no optional values
    Then the first admin should be created successfully
    And the user's roles should be exactly "admin"

  Scenario: Bootstrap is rejected when a user already exists
    Given a user exists with username "existing-user"
    When I attempt to create the first admin with username "second-admin" and no optional values
    Then an AuthenticationError should be thrown
