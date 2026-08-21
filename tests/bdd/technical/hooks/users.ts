/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { ElectronApplication } from 'playwright';

import { type AuthContextPayload } from '../../../src/main/auth/context-manager';
import { User } from '../../../src/main/db/models/Users';
import { AuthenticatedUser, FirstAdminUserData } from '../../../src/main/services/UserService';
import { withTestHooks } from '../infrastructure/utils';

/**
 * API layer for exposing user-related functionality in the electron app to Cucumber tests.
 */
export class Users {
  private app: ElectronApplication;

  constructor(app: ElectronApplication) {
    this.app = app;
  }

  hasUsers(): Promise<boolean> {
    return withTestHooks(this.app, async (hooks) => hooks.users.hasUsers());
  }

  async createFirstAdmin(data: FirstAdminUserData): Promise<User> {
    return await withTestHooks(
      this.app,
      async (hooks, data) => {
        return hooks.users.createFirstAdmin(data);
      },
      data,
    );
  }

  /**
   * Create a new user
   */
  async createUser(
    data: { username: string; email?: string; password?: string },
    authContext?: AuthContextPayload,
  ): Promise<AuthenticatedUser> {
    return await withTestHooks(
      this.app,
      async (hooks, data, authContext) => {
        return hooks.users.createTestUser(data, authContext);
      },
      data,
      authContext,
    );
  }

  /**
   * Authenticate a user with username and password
   */
  async authenticateUser(
    username: string,
    password: string,
    authContext?: AuthContextPayload,
  ): Promise<AuthenticatedUser | null> {
    return await withTestHooks(
      this.app,
      async (hooks, username, password, authContext) => {
        return hooks.users.authenticateTestUser(username, password, authContext);
      },
      username,
      password,
      authContext,
    );
  }

  /**
   * Get a user by ID
   */
  async getUserById(
    id: number,
    authContext?: AuthContextPayload,
  ): Promise<AuthenticatedUser | null> {
    return await withTestHooks(
      this.app,
      async (hooks, id, authContext) => {
        return hooks.users.getTestUserById(id, authContext);
      },
      id,
      authContext,
    );
  }

  /**
   * Update a user's profile
   */
  async updateUserProfile(
    id: number,
    profileData: { displayName?: string | null; profileImagePath?: string | null },
    authContext?: AuthContextPayload,
  ): Promise<void> {
    return await withTestHooks(
      this.app,
      async (hooks, id, profileData, authContext) => {
        return hooks.users.updateTestUserProfile(id, profileData, authContext);
      },
      id,
      profileData,
      authContext,
    );
  }

  /**
   * Assign a role to a user
   */
  async assignRoleToUser(
    userId: number,
    roleId: number,
    authContext?: AuthContextPayload,
  ): Promise<void> {
    return await withTestHooks(
      this.app,
      async (hooks, userId, roleId, authContext) => {
        return hooks.users.assignRoleToUser(userId, roleId, authContext);
      },
      userId,
      roleId,
      authContext,
    );
  }

  /**
   * Remove a role from a user
   */
  async removeRoleFromUser(
    userId: number,
    roleId: number,
    authContext?: AuthContextPayload,
  ): Promise<void> {
    return await withTestHooks(
      this.app,
      async (hooks, userId, roleId, authContext) => {
        return hooks.users.removeRoleFromUser(userId, roleId, authContext);
      },
      userId,
      roleId,
      authContext,
    );
  }

  /**
   * Get role IDs assigned to a user
   */
  async getRolesForUser(userId: number, authContext?: AuthContextPayload): Promise<number[]> {
    return await withTestHooks(
      this.app,
      async (hooks, userId, authContext) => {
        return hooks.users.getRolesForUser(userId, authContext);
      },
      userId,
      authContext,
    );
  }

  /**
   * Get permissions assigned to a user through roles
   */
  async getUserPermissions(userId: number, authContext?: AuthContextPayload): Promise<string[]> {
    return await withTestHooks(
      this.app,
      async (hooks, userId, authContext) => {
        return hooks.users.getUserPermissions(userId, authContext);
      },
      userId,
      authContext,
    );
  }

  /**
   * Get all users that have specified permissions
   */
  async getUsersWithPermissions(
    permissions: string[],
    authContext?: AuthContextPayload,
  ): Promise<AuthenticatedUser[]> {
    return await withTestHooks(
      this.app,
      async (hooks, permissions, authContext) => {
        return hooks.users.getUsersWithPermissions(permissions, authContext);
      },
      permissions,
      authContext,
    );
  }

  /**
   * Save a profile image for a user
   */
  async saveProfileImage(
    userId: number,
    imageBuffer: Buffer,
    mimeType: string,
    authContext?: AuthContextPayload,
  ): Promise<string> {
    return await withTestHooks(
      this.app,
      async (hooks, userId, imageBuffer, mimeType, authContext) => {
        return hooks.users.saveProfileImage(userId, imageBuffer, mimeType, authContext);
      },
      userId,
      imageBuffer,
      mimeType,
      authContext,
    );
  }

  /**
   * Delete a user's profile image
   */
  async deleteProfileImage(userId: number, authContext?: AuthContextPayload): Promise<void> {
    return await withTestHooks(
      this.app,
      async (hooks, userId, authContext) => {
        return hooks.users.deleteProfileImage(userId, authContext);
      },
      userId,
      authContext,
    );
  }

  /**
   * Change a user's password
   */
  async changePassword(
    userId: number,
    newPassword: string,
    authContext?: AuthContextPayload,
  ): Promise<void> {
    return await withTestHooks(
      this.app,
      async (hooks, userId, newPassword, authContext) => {
        return hooks.users.changePassword(userId, newPassword, authContext);
      },
      userId,
      newPassword,
      authContext,
    );
  }
}
