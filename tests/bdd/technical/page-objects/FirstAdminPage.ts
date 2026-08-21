/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3 of the License.
*/

import { BasePage } from './BasePage';

export class FirstAdminPage extends BasePage {
  readonly selectors = {
    pageRoot: '[data-testid="first-admin-overlay"]',
    usernameInput: '[data-testid="first-admin-username-input"]',
    passwordInput: '[data-testid="first-admin-password-input"]',
    emailInput: '[data-testid="first-admin-email-input"]',
    displayNameInput: '[data-testid="first-admin-display-name-input"]',
    submitButton: '[data-testid="first-admin-submit-button"]',
    errorMessage: '[data-testid="first-admin-error-message"]',
    successMessage: '[data-testid="first-admin-success-message"]',
  };

  async enterDetails(data: {
    username: string;
    password?: string;
    email?: string;
    displayName?: string;
  }): Promise<void> {
    await this.setInputText('usernameInput', data.username);
    if (data.password !== undefined) {
      await this.setInputText('passwordInput', data.password);
    }
    if (data.email !== undefined) {
      await this.setInputText('emailInput', data.email);
    }
    if (data.displayName !== undefined) {
      await this.setInputText('displayNameInput', data.displayName);
    }
  }

  async submit(): Promise<void> {
    await this.click('submitButton');
  }

  async waitForDismissal(): Promise<void> {
    const page = await this.getPage();
    await page.locator(this.getSelector('pageRoot')).waitFor({ state: 'hidden' });
  }
}
