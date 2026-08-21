# Copyright (c) 2026 Steve Dwire
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, version 3.

@ui
@component
@form-controls
Feature: Form Controls
  In order to validate form structure, semantics, and control wiring
  As a tester
  I want the Form Controls test page to expose inputs, fieldsets, and submit behavior

  Scenario: The controlled form updates state and displays current values
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Form Controls test page is open for testing
    When I enter "Alice" into the "controlledNameInput" input
    And I enter "alice@example.com" into the "controlledEmailInput" input
    And I submit the controlled form
    And I check the "controlledNewsletterInput" checkbox
    And I select "Premium" for the "controlledRadioGroup" radio group
    And I choose "Drama" from the "controlledSelectGenre" select
    And I check the "controlledInputNotificationEmail" checkbox
    And I check the "controlledInputNotificationPush" checkbox
    Then the "controlledNameDisplay" element should say "Name: Alice"
    And the "controlledEmailDisplay" element should say "Email: alice@example.com"
    And the "controlledPersonalInformationFieldset" fieldset should have the legend "Controlled Personal Information"
    And the "controlledNewsletterDisplay" element should say "Newsletter: true"
    And the "controlledAccountTypeDisplay" element should say "Account type: premium"
    And the "controlledGenreDisplay" element should say "Favorite genre: drama"
    And the "controlledNotificationMethodsDisplay" element should say "Notification methods: email, push"

  Scenario: The uncontrolled form submits DOM-updated values
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Form Controls test page is open for testing
    And the uncontrolled form is ready with no initial values
    And the "uncontrolledNameInput" input field has the value "Bob"
    And the "uncontrolledEmailInput" input field has the value "bob@example.com"
    And the "uncontrolledNewsletterInput" checkbox is checked
    And the "uncontrolledInputNotificationEmail" checkbox is checked
    And the "uncontrolledInputNotificationSms" checkbox is checked
    When I select "Premium" for the "uncontrolledRadioGroup" radio group
    And I choose "Action" from the "uncontrolledSelectGenre" select
    And I submit the uncontrolled form
    Then the "uncontrolledNameDisplay" element should say "Name: Bob"
    And the "uncontrolledEmailDisplay" element should say "Email: bob@example.com"
    And the "uncontrolledPersonalInformationFieldset" fieldset should have the legend "Uncontrolled Personal Information"
    Then the "uncontrolledNewsletterDisplay" element should say "Newsletter: true"
    And the "uncontrolledAccountTypeDisplay" element should say "Account type: premium"
    And the "uncontrolledGenreDisplay" element should say "Favorite genre: action"
    And the "uncontrolledNotificationMethodsDisplay" element should say "Notification methods: email, sms"
    When I request the uncontrolled form values
    Then the uncontrolled form values should equal:
      """
      {
        "name": "Bob",
        "email": "bob@example.com",
        "acceptedTerms": false,
        "newsletter": ["yes"],
        "notificationMethods": ["email", "sms"],
        "plan": "premium",
        "favoriteGenre": "action"
      }
      """

  Scenario: Uncontrolled form initializes with no initial values
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Form Controls test page is open for testing
    And the uncontrolled form is ready with no initial values
    Then the uncontrolled form fields should display default values

  Scenario: Uncontrolled form initializes with provided initial values
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Form Controls test page is open for testing
    And the uncontrolled form is ready with initial values:
      """
      {
        "name": "Charlie",
        "email": "charlie@example.com",
        "acceptedTerms": true,
        "newsletter": ["yes"],
        "notificationMethods": ["email", "sms"],
        "plan": "premium",
        "favoriteGenre": "action"
      }
      """
    Then the uncontrolled form fields should be populated from the provided initial values

  Scenario: Uncontrolled form starts not ready, then becomes ready
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Form Controls test page is open for testing
    And the uncontrolled form is initially not ready
    Then the uncontrolled form fields should be disabled
    When the uncontrolled form becomes ready with initial values:
      """
      {
        "name": "Diana",
        "email": "diana@example.com",
        "acceptedTerms": false,
        "newsletter": [],
        "notificationMethods": [],
        "plan": "basic",
        "favoriteGenre": "action"
      }
      """
    Then the uncontrolled form fields should be enabled
    And the uncontrolled form fields should be populated from the provided initial values

  Scenario: Resetting the uncontrolled form restores default values
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Form Controls test page is open for testing
    And the uncontrolled form is ready with no initial values
    When I enter "Eve" into the "uncontrolledNameInput" input
    And I enter "eve@example.com" into the "uncontrolledEmailInput" input
    And I check the "uncontrolledNewsletterInput" checkbox
    And I check the "uncontrolledInputNotificationEmail" checkbox
    And I select "Premium" for the "uncontrolledRadioGroup" radio group
    And I choose "Drama" from the "uncontrolledSelectGenre" select
    When I reset the uncontrolled form
    Then the uncontrolled form fields should display default values

  Scenario: Resetting the uncontrolled form restores provided initial values
    Given a user exists with username "hide-bootstrap-panel" and no password
    And the Form Controls test page is open for testing
    And the uncontrolled form is ready with initial values:
      """
      {
        "name": "Eve",
        "email": "eve@example.com",
        "acceptedTerms": false,
        "newsletter": ["yes"],
        "notificationMethods": ["email"],
        "plan": "premium",
        "favoriteGenre": "action"
      }
      """
    When I enter "Eva" into the "uncontrolledNameInput" input
    And I enter "eva@example.com" into the "uncontrolledEmailInput" input
    And I check the "uncontrolledInputNotificationPush" checkbox
    And I select "Basic" for the "uncontrolledRadioGroup" radio group
    And I choose "Comedy" from the "uncontrolledSelectGenre" select
    And I reset the uncontrolled form
    Then the uncontrolled form fields should be populated from the provided initial values
