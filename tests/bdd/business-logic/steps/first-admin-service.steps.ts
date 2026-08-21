import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

import type { FirstAdminUserData } from '../../../../src/main/services/UserService';
import { InternalSystemPersona } from '../../business-flow/personas/internal-system';
import { attemptAsync } from '../../technical/infrastructure/utils';
import { CustomWorld } from '../../technical/infrastructure/world';

function getSystemPersona(world: CustomWorld): InternalSystemPersona {
  const state = world.getStateStore('personas');
  if (!state.system) state.system = new InternalSystemPersona(world);
  return state.system as InternalSystemPersona;
}

function getFirstAdmin(world: CustomWorld) {
  return world.getStateObject('users') as { id: number; email: string | null; username: string };
}

async function createFirstAdmin(world: CustomWorld, data: FirstAdminUserData): Promise<void> {
  const system = getSystemPersona(world);
  const user = await system.createFirstAdmin(data);
  world.setStateObject('users', user);
}

Given('the database has no users', async function (this: CustomWorld) {
  expect(await this.usersApi.hasUsers()).toBe(false);
});

When(
  'I create the first admin with username {string}, email {string}, password {string}, and display name {string}',
  async function (
    this: CustomWorld,
    username: string,
    email: string,
    password: string,
    displayName: string,
  ) {
    await createFirstAdmin(this, {
      username,
      email,
      password,
      displayName,
    });
  },
);

When(
  'I create the first admin with username {string} and no optional values',
  async function (this: CustomWorld, username: string) {
    await createFirstAdmin(this, { username });
  },
);

When(
  'I attempt to create the first admin with username {string} and no optional values',
  async function (this: CustomWorld, username: string) {
    await attemptAsync(this, () => createFirstAdmin(this, { username }));
  },
);

Then('the first admin should be created successfully', function (this: CustomWorld) {
  expect(getFirstAdmin(this).id).toBeDefined();
});

Then(
  'the first admin profile should contain email {string} and display name {string}',
  async function (this: CustomWorld, email: string, displayName: string) {
    const firstAdmin = getFirstAdmin(this);
    expect(firstAdmin.email).toBe(email);
    const profile = (await getSystemPersona(this).getUserById(firstAdmin.id))?.profile;
    expect(profile?.displayName).toBe(displayName);
  },
);

Then('the database should have no users', async function (this: CustomWorld) {
  expect(await this.usersApi.hasUsers()).toBe(false);
});
