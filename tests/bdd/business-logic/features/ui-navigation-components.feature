# Copyright (c) 2026 Steve Dwire
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, version 3.

@ui
@component
Feature: Navigation component testing
  As a tester
  I want to verify MenuItem, ExpandableMenuSection, and Button components through their test pages
  So that real renderer behavior is validated in the browser-based test UI

  Scenario: MenuItem renders label, badge, and active state
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the MenuItem test page is open for testing
    And the menu item label is set to "Watch Now"
    And the menu item badge is set to 5
    And the menu item is active
    Then the menu item preview should display the label "Watch Now"
    And the menu item preview badge should be 5
    And the menu item preview should be active

  Scenario: ExpandableMenuSection expands and collapses
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Expandable Section test page is open for testing
    And the expandable section is expanded
    Then the expandable section toggle should have aria-expanded "true"
    And the expandable section content should be visible
    When I toggle the expandable section
    Then the expandable section toggle should have aria-expanded "false"
    And the expandable section content should be hidden

  Scenario: Button size and variant selection
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Button test page is open for testing
    And the button variant is set to "secondary"
    And the button size is set to "large"
    And the buttons are disabled
    Then button 1 should have class name "btn-secondary"
    And button 1 should be disabled
