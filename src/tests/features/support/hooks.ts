import { After, Before, Status } from '@cucumber/cucumber';
import { CustomWorld } from './world';

// Before each scenario - launch the app
Before(async function (this: CustomWorld) {
  await this.launchApp();
});

// After each scenario - cleanup
After(async function (this: CustomWorld, scenario) {
  // Close database connection
  if (this.app) {
    try {
      await this.closeDatabase();
    } catch (error) {
      // Database may not have been initialized in some scenarios
      console.log('Note: Could not close database (may not have been initialized)');
    }

    // Take screenshot on failure for debugging
    if (scenario.result?.status === Status.FAILED) {
      try {
        const window = await this.app.firstWindow();
        const screenshot = await window.screenshot();
        this.attach(screenshot, 'image/png');
      } catch (screenshotError) {
        console.error('Could not capture screenshot:', screenshotError);
      }
    }

    // Close the app
    await this.closeApp();
  }
});
