/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import fs from 'fs';
import path from 'path';

import bcrypt from 'bcryptjs';
import log from 'electron-log/main';

import { AuthContext } from '../auth/context-manager';
import { AuthenticationError, AuthorizationError } from '../auth/errors';
import { type PermissionStub, PERMISSIONS } from '../auth/permissions';
import { getDb, getModels } from '../database';
import { type UserProfile, type UserProfileData } from '../db/models/UserProfiles';
import { type User, type UserData } from '../db/models/Users';
import i18n from '../i18n';
import { getAppDataRoot } from '../paths';
import { assertPathInsideAllowedDirs, safeJoin } from '../security';

export type CreateUserData = UserData;

export interface AuthenticatedUser extends User {
  profile: UserProfile | null;
}

export interface BasicUserInfo {
  username: string;
  profile: { displayName: string | null; profileImagePath: string | null } | null;
}

export interface PermissionInfo {
  stub: PermissionStub;
  displayName: string;
}

export interface FirstAdminUserData {
  username: string;
  email?: string | null;
  password?: string;
  displayName?: string | null;
}

export class UserService {
  private t = i18n.getFixedT(null, 'auth');

  private validateAuthContext(authContext?: AuthContext, targetUserId?: number): void {
    if (!authContext) {
      throw new AuthenticationError(this.t('errors.authenticationRequired'));
    }

    // Allow self-access or user manager access
    const canAccess =
      (targetUserId && authContext.userId === targetUserId) ||
      authContext.hasPermission('can-manage-users');

    if (!canAccess) {
      throw new AuthorizationError(this.t('errors.insufficientPermissions'));
    }
  }

  hasUsers(): boolean {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const result = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return result.count > 0;
  }

  async createUser(data: CreateUserData, authContext?: AuthContext): Promise<AuthenticatedUser> {
    // Bootstrap mode: allow creating first user without authentication
    if (!this.hasUsers()) {
      // This is bootstrap - allow creating admin user
    } else {
      // Normal mode: require authentication and permissions
      if (!authContext) {
        throw new AuthenticationError(this.t('errors.cannotBootstrapAdmin'));
      }
      if (!authContext.hasPermission('can-manage-users')) {
        throw new AuthorizationError(this.t('errors.insufficientPermissions'));
      }
    }

    try {
      const { users, userProfiles } = getModels();
      const userId = await users.create(data);
      const user = users.getById(userId);
      if (!user) throw new Error('Failed to retrieve created user');
      const profile = userProfiles.getByUserId(userId);
      return { ...user, profile };
    } catch (error) {
      log.error('[UserService.createUser] Error creating user:', error, 'data:', data);
      if (error instanceof Error) {
        log.error('[UserService.createUser] Stack:', error.stack);
      }
      throw error;
    }
  }

  async createFirstAdmin(data: FirstAdminUserData): Promise<User> {
    if (this.hasUsers()) {
      throw new AuthenticationError(this.t('errors.cannotBootstrapAdmin'));
    }

    const username = typeof data?.username === 'string' ? data.username.trim() : '';
    if (!username) {
      throw new Error(this.t('errors.usernameRequired'));
    }

    const { users, userProfiles, roles, userRoles } = getModels();
    const adminRole = roles.getBySystemStub('admin');
    if (!adminRole) {
      throw new Error(this.t('errors.adminRoleNotFound'));
    }

    const userId = await users.create({
      username,
      email: data.email,
      password: data.password,
    });

    try {
      const db = getDb();
      if (!db) throw new Error(this.t('errors.databaseNotInitialized'));
      db.transaction(() => {
        userProfiles.create(userId, {
          displayName: data.displayName,
        });
        userRoles.assignRoleToUser(userId, adminRole.id);
      })();

      const user = users.getById(userId);
      if (!user) throw new Error(this.t('errors.createdUserUnavailable'));
      return user;
    } catch (error) {
      users.delete(userId);
      throw error;
    }
  }

  async authenticateUser(
    username: string,
    password: string,
    authContext?: AuthContext,
  ): Promise<AuthenticatedUser | null> {
    const { users, userProfiles } = getModels();
    const userRow = users.getByUsername(username);
    if (!userRow) return null;

    if (authContext && authContext.userId !== userRow.id) {
      // If already authenticated, do not allow re-authentication as someone else (to prevent abuse of this method)
      throw new AuthorizationError(this.t('errors.mustBeLoggedOut'));
    }

    let isValid = false;

    if (userRow.password_hash) {
      // This user has a password. Validate it.
      isValid = await bcrypt.compare(password, userRow.password_hash);
    } else {
      // If no password set, only an empty or missing password is accepted
      if (password === '' || password === null || password === undefined) {
        isValid = true;
      }
    }

    if (!isValid) return null;

    const profile = userProfiles.getByUserId(userRow.id);

    users.updateLastLogin(userRow.id);
    const user = users.getById(userRow.id);
    return user ? { ...user, profile } : null;
  }

  getUserById(id: number, authContext?: AuthContext): AuthenticatedUser | BasicUserInfo | null {
    let canSeeUserDetails = false;

    if (authContext) {
      canSeeUserDetails =
        authContext.userId === id || authContext.hasPermission('can-manage-users');
    }

    const { users, userProfiles } = getModels();
    const user = users.getById(id);
    if (!user) return null;

    const profile = userProfiles.getByUserId(user.id);

    if (canSeeUserDetails) {
      return { ...user, profile };
    } else {
      return {
        username: user.username,
        profile: {
          displayName: profile?.displayName || null,
          profileImagePath: profile?.profileImagePath || null,
        },
      };
    }
  }

  async updateUserProfile(
    userId: number,
    data: UserProfileData,
    authContext?: AuthContext,
  ): Promise<void> {
    this.validateAuthContext(authContext, userId);

    const { userProfiles } = getModels();
    const existingProfile = userProfiles.getByUserId(userId);
    if (existingProfile) {
      userProfiles.update(userId, data);
    } else {
      userProfiles.create(userId, data);
    }
  }

  async changePassword(
    userId: number,
    newPassword: string,
    authContext?: AuthContext,
  ): Promise<void> {
    this.validateAuthContext(authContext, userId);

    const { users } = getModels();
    await users.updatePassword(userId, newPassword);
  }

  getUsersWithPermissions(
    permissions: PermissionStub[],
    authContext?: AuthContext,
  ): BasicUserInfo[] {
    if (authContext) {
      // We really don't expect this ever to be called when someone is logged in.
      // The purpose is to get a list of users who *can* log in.
      // If we ever use it for something different, then we need to rethink it.
      // So for now, fail if that ever happens.
      throw new AuthorizationError(this.t('errors.mustBeLoggedOut'));
    }

    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { users, userProfiles } = getModels();

    // Build query to get user IDs with specified permissions
    const placeholders = permissions.map(() => '?').join(',');
    const query = `
      SELECT DISTINCT u.id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      WHERE rp.permission_stub IN (${placeholders})
    `;

    const userIds = (db.prepare(query).all(...permissions) as Array<{ id: number }>).map(
      (row) => row.id,
    );

    // Check for can-admin (grants all permissions)
    const adminUsers = this.getUsersWithAdminPermission();

    // Combine and deduplicate
    const userMap = new Map<number, BasicUserInfo>();

    for (const userId of userIds) {
      const user = users.getById(userId);
      if (!user) continue;
      const profile = userProfiles.getByUserId(userId);
      userMap.set(user.id, { ...user, profile });
    }

    for (const adminUser of adminUsers) {
      userMap.set(adminUser.id, { ...adminUser, profile: adminUser.profile });
    }

    return Array.from(userMap.values());
  }

  private getUsersWithAdminPermission(): AuthenticatedUser[] {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const { users, userProfiles } = getModels();

    const query = `
      SELECT DISTINCT u.id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      WHERE rp.permission_stub = 'can-admin'
    `;

    const userIds = (db.prepare(query).all() as Array<{ id: number }>).map((row) => row.id);

    return userIds
      .map((userId) => {
        const user = users.getById(userId);
        if (!user) return null;
        const profile = userProfiles.getByUserId(userId);
        return { ...user, profile };
      })
      .filter((u): u is AuthenticatedUser => u !== null);
  }

  private getProfileImagesDir(): string {
    return path.join(getAppDataRoot(), 'profile-images');
  }

  async saveProfileImage(
    userId: number,
    imageBuffer: Buffer,
    mimeType: string,
    authContext?: AuthContext,
  ): Promise<string> {
    this.validateAuthContext(authContext, userId);

    // Validate mime type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(mimeType)) {
      throw new Error('Invalid image type. Only PNG and JPEG are allowed.');
    }

    // Validate size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (imageBuffer.length > maxSize) {
      throw new Error('Image too large. Maximum size is 5MB.');
    }

    // Ensure directory exists
    const imagesDir = this.getProfileImagesDir();
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Generate filename
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const { v4: uuidv4 } = await import('uuid');
    const filename = `${uuidv4()}.${ext}`;
    const filePath = safeJoin(imagesDir, filename);

    // Security check
    assertPathInsideAllowedDirs(filePath, imagesDir);

    // Write file
    fs.writeFileSync(filePath, imageBuffer);

    // Update profile
    await this.updateUserProfile(userId, { profileImagePath: filename }, authContext);

    return filename;
  }

  async deleteProfileImage(userId: number, authContext?: AuthContext): Promise<void> {
    this.validateAuthContext(authContext, userId);

    const user = this.getUserById(userId);
    if (!user || !user.profile?.profileImagePath) return;

    const imagesDir = this.getProfileImagesDir();
    const filePath = safeJoin(imagesDir, user.profile.profileImagePath);

    // Security check
    assertPathInsideAllowedDirs(filePath, imagesDir);

    // Delete file if exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Update profile
    await this.updateUserProfile(userId, { profileImagePath: null }, authContext);
  }

  // Permission checking - aggregates permissions from all user roles
  private getUserPermissionStubs(userId: number): PermissionStub[] {
    const db = getDb();
    if (!db) throw new Error('Database not initialized');

    const query = `
      SELECT DISTINCT rp.permission_stub
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      WHERE ur.user_id = ?
    `;

    const rows = db.prepare(query).all(userId) as Array<{ permission_stub: PermissionStub }>;
    return rows.map((row) => row.permission_stub);
  }

  getUserPermissions(userId: number, authContext?: AuthContext): PermissionInfo[] {
    this.validateAuthContext(authContext, userId);
    const permissionStubs = this.getUserPermissionStubs(userId);

    // If can-admin, return all possible permissions
    if (permissionStubs.includes('can-admin')) {
      return PERMISSIONS.map((p) => ({
        stub: p.stub,
        displayName: this.t(p.displayNameKey),
      }));
    }

    // Otherwise return only the user's permissions
    return permissionStubs.map((stub) => {
      const permissionDef = PERMISSIONS.find((p) => p.stub === stub);
      return {
        stub,
        displayName: this.t(permissionDef?.displayNameKey || 'common.unknown'),
      };
    });
  }

  // User role management
  getRolesForUser(userId: number, authContext?: AuthContext): number[] {
    this.validateAuthContext(authContext, userId);
    const { userRoles } = getModels();
    return userRoles.getRoleIdsForUser(userId);
  }

  assignRoleToUser(userId: number, roleId: number, authContext?: AuthContext): void {
    if (!authContext) {
      throw new AuthenticationError(this.t('errors.authenticationRequired'));
    }

    if (!authContext.hasPermission('can-manage-users')) {
      throw new AuthorizationError(this.t('errors.insufficientPermissions'));
    }

    // Users cannot modify roles for their own user account
    if (authContext.userId === userId) {
      throw new AuthorizationError(this.t('errors.cannotModifyOwnRoles'));
    }

    // Verify role exists
    const { roles, userRoles } = getModels();
    const role = roles.getById(roleId);
    if (!role) {
      throw new Error(this.t('errors.roleNotFound', 'Role not found'));
    }

    userRoles.assignRoleToUser(userId, roleId);
  }

  removeRoleFromUser(userId: number, roleId: number, authContext?: AuthContext): void {
    if (!authContext) {
      throw new AuthenticationError(this.t('errors.authenticationRequired'));
    }

    if (!authContext.hasPermission('can-manage-users')) {
      throw new AuthorizationError(this.t('errors.insufficientPermissions'));
    }

    // Users cannot modify roles for their own user account
    if (authContext.userId === userId) {
      throw new AuthorizationError(this.t('errors.cannotModifyOwnRoles'));
    }

    const { userRoles } = getModels();
    userRoles.removeRoleFromUser(userId, roleId);
  }
}
