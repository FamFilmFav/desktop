# Copyright (c) 2026 Steve Dwire
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, version 3.

@ui
@end-to-end
Feature: Basic UI Infrastructure
  As a user
  I want the application UI to be stable and responsive
  So that I can interact with the app reliably

  @smoke
  Scenario: User can navigate to Settings page
    Given a user exists with username "hide-bootstrap-panel" and no password
    And I open the app window as an unauthenticated user
    When the user navigates to the Settings page
    Then the Settings page is visible


#  The following scenario illustrates how to validate that settings that are
#  configured PRIOR to app launch are correctly applied in the application.
#  It's commented out right now because viewing settings requires an administrative
#  user, and we currently don't have the capability to log in to the UI with any
#  user context at all. That's coming in a later commit. So for now, we won't run
#  this test, but it will be a useful reference for how to test settings in the future.
#
#  @smoke
#  Scenario: Settings page displays current settings
#    Given the application has the following initial settings:
#      """
#      {
#        "webPort": 5000,
#        "tmdbApiKey": "temp-tmdb",
#        "watchmodeApiKey": ""
#      }
#      """
#    And a user "test-admin" exists with the role "admin" assigned
#    And I open the app window as the user "test-admin"
#    When the user navigates to the Settings page
#    Then the Settings page should display the following settings:
#      """
#      {
#        "webPort": 5000,
#        "tmdbApiKey": "temp-tmdb",
#        "watchmodeApiKey": ""
#      }
#      """