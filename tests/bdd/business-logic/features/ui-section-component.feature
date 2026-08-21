# Copyright (c) 2026 Steve Dwire
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, version 3.

@ui
@component
Feature: Section component testing
  As a tester
  I want to verify the Section component behavior through the Page Framework test page
  So that Section title and styling are validated by BDD tests

  Scenario: Section component displays dynamic title and class name
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Page Framework test page is open for testing
    And the section title is set to "Section Alpha"
    And the section class name is set to "custom-section-class"
    Then the Section component should display the title "Section Alpha"
    And the Section component should have the class name "custom-section-class"
