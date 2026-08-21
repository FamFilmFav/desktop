import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';

import { CustomWorld } from '../../technical/infrastructure/world';
import { FirstAdminPage } from '../../technical/page-objects';

function getFirstAdminPage(world: CustomWorld): FirstAdminPage {
  const existingPageObject = world.getStateObject('pageObject') as FirstAdminPage;
  if (existingPageObject) {
    return existingPageObject;
  } else {
    const newPageObject = new FirstAdminPage(world);
    world.setStateObject('pageObject', newPageObject);
    return newPageObject;
  }
}

Given('the first admin setup is visible', async function (this: CustomWorld) {
  await getFirstAdminPage(this).waitForVisible('pageRoot');
});

When(
  'I submit the first admin form with username {string}, password {string}, email {string}, and display name {string}',
  async function (
    this: CustomWorld,
    username: string,
    password: string,
    email: string,
    displayName: string,
  ) {
    const page = getFirstAdminPage(this);
    await page.enterDetails({ username, password, email, displayName });
    await page.submit();
  },
);

When(
  'I submit the first admin form with username {string} and no optional details',
  async function (this: CustomWorld, username: string) {
    const page = getFirstAdminPage(this);
    await page.enterDetails({ username });
    await page.submit();
  },
);

When('I submit the first admin form without a username', async function (this: CustomWorld) {
  await getFirstAdminPage(this).submit();
});

Then('the first admin creation success message is visible', async function (this: CustomWorld) {
  await getFirstAdminPage(this).waitForVisible('successMessage');
});

Then('the first admin setup is no longer visible', async function (this: CustomWorld) {
  await getFirstAdminPage(this).waitForDismissal();
  expect(await getFirstAdminPage(this).isVisible('pageRoot')).toBe(false);
});

Then('the first admin error message is visible', async function (this: CustomWorld) {
  await getFirstAdminPage(this).waitForVisible('errorMessage');
});

Then('the first admin setup is not visible', async function (this: CustomWorld) {
  expect(await getFirstAdminPage(this).isVisible('pageRoot')).toBe(false);
});
