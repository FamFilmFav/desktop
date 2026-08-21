# Copyright (c) 2026 Steve Dwire
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, version 3.

@ui
@component
Feature: Page component testing
  As a tester
  I want to verify the Page component behavior through the Page Framework test page
  So that changes to layout props are validated by BDD tests

  Scenario: Page component displays dynamic title, class, and centered styling
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Page Framework test page is open for testing
    And the page title is set to "Hello Page"
    And the page is centered
    And the page class name is set to "custom-page-class"
    Then the Page component should display the title "Hello Page"
    And the Page component should have the class name "custom-page-class"
    And the Page component should be centered
