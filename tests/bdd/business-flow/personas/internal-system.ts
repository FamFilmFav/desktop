/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { Browser, Page } from 'playwright';

import {
  createAuthContext,
  createSystemContext,
  type AuthContext,
  type AuthContextPayload,
} from '../../../../src/main/auth/context-manager';
import { PERMISSIONS } from '../../../../src/main/auth/permissions';
import { Role } from '../../../../src/main/db/models/Roles';
import { User } from '../../../../src/main/db/models/Users';
import { AuthenticatedUser, FirstAdminUserData } from '../../../../src/main/services/UserService';
import { withTestHooks } from '../../technical/infrastructure/utils';
import { CustomWorld } from '../../technical/infrastructure/world';
/**
 * Internal System Persona - represents trusted backend operations
 * for testing business logic without transport concerns.
 */
export class InternalSystemPersona {
  public authContext: AuthContext;

  private isUnauthenticated: boolean = false;
  private customPermissions: string[] | null = null;

  constructor(private world: CustomWorld) {
    this.authContext = createSystemContext();
  }

  //
  // App operations
  //
  async isAppReady(): Promise<boolean> {
    return (await this.world.app.evaluate(async (electron) => {
      const app = electron.app as { isReady(): boolean };
      return app.isReady();
    })) as boolean;
  }

  async openMainWindow(): Promise<{ page: Page; browser?: Browser }> {
    return await this.world.uiApi.openMainWindow();
  }

  async signalPreInitComplete(): Promise<void> {
    // This will call the test hook to signal preInit steps are done
    await withTestHooks(this.world.app, async (hooks) => {
      hooks.appLifecycle.signalPreInitComplete();
    });
  }

  //
  // Background task operations
  //
  private getAuthContextPayload(): AuthContextPayload | undefined {
    if (this.isUnauthenticated) {
      return undefined;
    }
    if (this.customPermissions !== null) {
      return {
        userId: 0, // Test user ID
        permissions: this.customPermissions,
      };
    }
    return {
      userId: this.authContext.userId,
      permissions: this.authContext.permissions,
    };
  }

  async enqueueTask(taskType: string, args?: Record<string, unknown>) {
    return await this.world.backgroundTasksApi.enqueue(
      taskType,
      args,
      this.getAuthContextPayload(),
    );
  }

  async getTaskState() {
    return await this.world.backgroundTasksApi.getState(this.getAuthContextPayload());
  }

  async cancelActiveTask() {
    return await this.world.backgroundTasksApi.cancelActive(this.getAuthContextPayload());
  }

  async removeQueuedTask(taskId: string) {
    return await this.world.backgroundTasksApi.removeQueued(taskId, this.getAuthContextPayload());
  }

  // Test Tasks
  async setupTestTaskType() {
    return await this.world.backgroundTasksApi.setupTestTaskType();
  }

  async setTaskProgress(current: number, max: number, description: string) {
    return await this.world.backgroundTasksApi.setTaskProgress(current, max, description);
  }

  async setTaskDescription(description: string) {
    return await this.world.backgroundTasksApi.setTaskDescription(description);
  }

  async setTaskCurrent(current: number) {
    return await this.world.backgroundTasksApi.setTaskCurrent(current);
  }

  async setTaskMax(max: number) {
    return await this.world.backgroundTasksApi.setTaskMax(max);
  }

  async completeTask() {
    return await this.world.backgroundTasksApi.completeTask();
  }

  //
  // Database operations
  //
  async initDatabase(): Promise<void> {
    return await this.world.dbApi.initMockDatabase();
  }

  async loadStubTmdbData(dataSource: string): Promise<void> {
    return await this.world.dataApi.loadStubTmdbData(dataSource);
  }

  async loadStubWatchmodeData(dataSource: string): Promise<void> {
    return await this.world.dataApi.loadStubWatchmodeData(dataSource);
  }

  async closeDatabase(): Promise<void> {
    return await this.world.dbApi.closeDatabase();
  }

  async getDatabaseStatus() {
    return await this.world.dbApi.getStatus();
  }

  //
  // Event operations
  //
  async clearRecordedEvents() {
    return await this.world.eventNotificationsApi.clearRecordedEvents();
  }

  async getRecordedEvents() {
    return await this.world.eventNotificationsApi.getRecordedEvents();
  }

  async findEventByType(type: string) {
    return await this.world.eventNotificationsApi.findEventByType(type);
  }

  async filterEventsByType(type: string) {
    return await this.world.eventNotificationsApi.filterEventsByType(type);
  }

  async setupEventRecording() {
    return await this.world.eventNotificationsApi.setupEventRecording();
  }

  //
  // Movie operations
  //
  async getMovieById(id: number) {
    return await this.world.moviesApi.getMovieById(id, this.getAuthContextPayload());
  }

  async getMovieByTmdbId(tmdbId: string) {
    return await this.world.moviesApi.getMovieByTmdbId(tmdbId, this.getAuthContextPayload());
  }

  async getMovieByWatchmodeId(watchmodeId: string) {
    return await this.world.moviesApi.getMovieByWatchmodeId(
      watchmodeId,
      this.getAuthContextPayload(),
    );
  }

  async searchMoviesByTitle(searchTerm: string) {
    return await this.world.moviesApi.searchByTitle(searchTerm, this.getAuthContextPayload());
  }

  //
  // Role operations
  //
  async createRole(name: string, permissionStubs: string[] = []): Promise<Role> {
    return await this.world.rolesApi.createRole(
      name,
      permissionStubs,
      this.getAuthContextPayload(),
    );
  }

  async deleteRole(id: number): Promise<void> {
    return await this.world.rolesApi.deleteRole(id, this.getAuthContextPayload());
  }

  async getRoleById(id: number): Promise<Role | null> {
    return await this.world.rolesApi.getRoleById(id, this.getAuthContextPayload());
  }

  async getRoleByStub(stub: string): Promise<Role | null> {
    return await this.world.rolesApi.getRoleByStub(stub, this.getAuthContextPayload());
  }

  async getAllRoles(): Promise<Role[]> {
    return await this.world.rolesApi.getAllRoles(this.getAuthContextPayload());
  }

  async getRolePermissions(roleId: number): Promise<string[]> {
    return await this.world.rolesApi.getRolePermissions(roleId, this.getAuthContextPayload());
  }

  async getAllPermissions(): Promise<string[]> {
    return await this.world.rolesApi.getAllPermissions(this.getAuthContextPayload());
  }

  async getUsersWithRole(roleId: number): Promise<number[]> {
    return await this.world.rolesApi.getUsersWithRole(roleId, this.getAuthContextPayload());
  }

  async duplicateRole(sourceRoleId: number): Promise<number> {
    return await this.world.rolesApi.duplicateRole(sourceRoleId, this.getAuthContextPayload());
  }

  async setRolePermissions(roleId: number, permissionStubs: string[]): Promise<void> {
    return await this.world.rolesApi.setRolePermissions(
      roleId,
      permissionStubs,
      this.getAuthContextPayload(),
    );
  }

  async updateRole(
    id: number,
    data: Partial<import('../../../../src/main/db/models/Roles').RoleData>,
  ): Promise<void> {
    return await this.world.rolesApi.updateRole(id, data, this.getAuthContextPayload());
  }

  async updateRoleDisplayName(id: number, displayName: string): Promise<void> {
    return await this.world.rolesApi.updateRoleDisplayName(
      id,
      displayName,
      this.getAuthContextPayload(),
    );
  }

  async updateRoleHiddenStatus(id: number, isHidden: boolean): Promise<void> {
    return await this.world.rolesApi.updateRoleHiddenStatus(
      id,
      isHidden,
      this.getAuthContextPayload(),
    );
  }

  //
  // Settings operations
  //
  async initializeSettings(testSettings?: Record<string, unknown>) {
    return await this.world.settingsApi.initializeMockSettings(testSettings);
  }

  async getSetting(key: string) {
    return await this.world.settingsApi.getSetting(key, this.getAuthContextPayload());
  }

  async setSetting(key: string, value: unknown) {
    return await this.world.settingsApi.setSetting(key, value, this.getAuthContextPayload());
  }

  async loadSettings() {
    return await this.world.settingsApi.loadSettings(this.getAuthContextPayload());
  }

  async saveSettings(settings: Record<string, unknown>) {
    return await this.world.settingsApi.saveSettings(settings, this.getAuthContextPayload());
  }

  //
  // User operations
  //
  async hasUsers(): Promise<boolean> {
    return await this.world.usersApi.hasUsers();
  }

  async createFirstAdmin(data: FirstAdminUserData): Promise<User> {
    return await this.world.usersApi.createFirstAdmin(data);
  }

  async createUser(data: {
    username: string;
    email?: string;
    password?: string;
  }): Promise<AuthenticatedUser> {
    return await this.world.usersApi.createUser(data, this.getAuthContextPayload());
  }

  async authenticateUser(username: string, password: string): Promise<AuthenticatedUser | null> {
    const result = await this.world.usersApi.authenticateUser(
      username,
      password,
      this.getAuthContextPayload(),
    );
    if (result?.id) {
      await this.runAsUser(result.id as number);
    }
    return result;
  }

  async getUserById(id: number): Promise<AuthenticatedUser | null> {
    return await this.world.usersApi.getUserById(id, this.getAuthContextPayload());
  }

  async getUsersWithPermissions(permissions: string[]): Promise<AuthenticatedUser[]> {
    return await this.world.usersApi.getUsersWithPermissions(
      permissions,
      this.getAuthContextPayload(),
    );
  }

  async updateUserProfile(
    id: number,
    profileData: { displayName?: string | null; profileImagePath?: string | null },
  ): Promise<void> {
    return await this.world.usersApi.updateUserProfile(
      id,
      profileData,
      this.getAuthContextPayload(),
    );
  }

  async saveProfileImage(userId: number, imageBuffer: Buffer, mimeType: string): Promise<string> {
    return await this.world.usersApi.saveProfileImage(
      userId,
      imageBuffer,
      mimeType,
      this.getAuthContextPayload(),
    );
  }

  async deleteProfileImage(userId: number): Promise<void> {
    return await this.world.usersApi.deleteProfileImage(userId, this.getAuthContextPayload());
  }

  async changePassword(userId: number, newPassword: string): Promise<void> {
    return await this.world.usersApi.changePassword(
      userId,
      newPassword,
      this.getAuthContextPayload(),
    );
  }

  async assignRoleToUser(userId: number, roleId: number): Promise<void> {
    return await this.world.usersApi.assignRoleToUser(userId, roleId, this.getAuthContextPayload());
  }

  async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    return await this.world.usersApi.removeRoleFromUser(
      userId,
      roleId,
      this.getAuthContextPayload(),
    );
  }

  async getRolesForUser(userId: number): Promise<number[]> {
    return await this.world.usersApi.getRolesForUser(userId, this.getAuthContextPayload());
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    return await this.world.usersApi.getUserPermissions(userId, this.getAuthContextPayload());
  }

  // Authorization operations
  async checkUserHasPermission(userId: number, permissionStub: string): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permissionStub);
  }

  // Auth context control for testing
  runUnauthenticated(): void {
    this.isUnauthenticated = true;
    this.customPermissions = null;
  }

  runWithPermissions(permissionStubs: string[]): void {
    this.isUnauthenticated = false;
    this.customPermissions = permissionStubs;
  }

  runWithoutPermissions(excludedPermissionStubs: string[]): void {
    this.isUnauthenticated = false;
    const allPermissions = PERMISSIONS.map((p) => p.stub);
    const excluded = new Set(['can-admin', ...excludedPermissionStubs]);
    this.customPermissions = allPermissions.filter((p) => !excluded.has(p));
  }

  async runAsUser(userId: number): Promise<void> {
    // Set authContext directly to represent the real authenticated user
    // With customPermissions = null, getAuthContextPayload will use the real authContext
    this.isUnauthenticated = false;
    this.customPermissions = null;

    // Build authContext with the user's actual permissions from the system
    const systemAuthContextPayload = {
      userId: -1,
      permissions: ['can-admin'],
    } as AuthContextPayload;
    const permissions = await this.world.usersApi.getUserPermissions(
      userId,
      systemAuthContextPayload,
    );
    this.authContext = createAuthContext(userId, permissions);
  }
}
