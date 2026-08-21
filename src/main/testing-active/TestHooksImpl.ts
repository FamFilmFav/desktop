/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { app } from 'electron';

import { createAuthContext, type AuthContextPayload } from '../auth/context-manager';
import { PERMISSION_STUBS, type PermissionStub } from '../auth/permissions';
import * as backgroundTaskManager from '../background-task-manager';
import * as db from '../database';
import {
  BackgroundTaskService,
  MovieService,
  RoleService,
  SettingsService,
  UserService,
} from '../services';
import {
  getStatus as getSettingsStatus,
  initialize as initializeSettingsManager,
} from '../settings-manager';
import ImportTmdbTask from '../tasks/ImportTmdbTask';
import ImportWatchmodeTask from '../tasks/ImportWatchmodeTask';
import { TASK_REGISTRY_VALUES, type TaskRegistryType } from '../tasks/task-registry';
import { executeServiceMethod } from '../utils/error-serialization';
import { createAppWindow } from '../window-manager';

import { registerTask } from './support/extensions/task-registry.extensions';
import { MockBackgroundTask } from './support/mocks/background-task.mocks';
import { createMockElectronStore } from './support/mocks/electron-store.mocks';
import {
  clearRecordedEvents,
  filterEventsByType,
  findEventByType,
  getRecordedEvents,
  recordEvent,
} from './support/mocks/event-notification.mocks';
import {
  createMockDownloadCsvStream,
  createMockDownloadJsonGzStream,
} from './support/mocks/import-background-tasks.mocks';

const movieService = new MovieService();
const settingsService = new SettingsService();
const backgroundTaskService = new BackgroundTaskService();
const userService = new UserService();
const roleService = new RoleService();

// Track the actively running mock task instance for test control
let activeTestTask: InstanceType<typeof MockBackgroundTask> | null = null;

let resolvePreInitPromise: (() => void) | null = null;
const preReadyPromise: Promise<void> = new Promise((resolve) => {
  resolvePreInitPromise = resolve;
});

let resolveAppReadyPromise: (() => void) | null = null;
const appReadyPromise: Promise<void> = new Promise((resolve) => {
  resolveAppReadyPromise = resolve;
});

/**
 * Deserialize a buffer that was JSON-serialized across the Electron boundary.
 * When buffers cross app.evaluate(), they're converted to Uint8Array and then to object form.
 */
function deserializeBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    // Handle standard { type: 'Buffer', data: [...] } format
    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return Buffer.from(obj.data);
    }
    // Handle Uint8Array serialized as object with numeric string keys: { "0": 137, "1": 80, ... }
    // Convert the object's values back to an array
    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) {
      const bytes = keys.map((k) => {
        const val = obj[k];
        if (typeof val !== 'number') {
          throw new TypeError(`Expected number in buffer array, got ${typeof val}`);
        }
        return val;
      });
      return Buffer.from(bytes);
    }
  }
  throw new TypeError(
    `Expected a Buffer, Uint8Array, or serialized Buffer object, got: ${typeof value}`,
  );
}

/**
 * Validate and convert string permission stubs from test scenarios to typed PermissionStub values.
 * Throws if any stub is not in the valid set.
 */
function validatePermissionStubs(stubs: string[]): PermissionStub[] {
  const validSet = new Set(PERMISSION_STUBS);

  for (const stub of stubs) {
    if (!validSet.has(stub as PermissionStub)) {
      throw new Error(
        `Invalid permission stub: "${stub}". Must be one of: ${PERMISSION_STUBS.join(', ')}`,
      );
    }
  }

  return stubs as PermissionStub[];
}

/**
 * Validate and convert string task types from test scenarios to typed TaskRegistryType values.
 * Allows both production task types and the test-specific "test-background-task" type.
 * Throws if the task type is not in the valid set.
 */
function validateTaskType(
  taskType: string,
): TaskRegistryType | 'test-background-task' | 'test-a' | 'test-b' {
  const validTaskTypes = [
    ...TASK_REGISTRY_VALUES,
    'test-background-task',
    'test-a',
    'test-b',
  ] as const;

  if (!validTaskTypes.includes(taskType as TaskRegistryType | 'test-background-task')) {
    throw new Error(
      `Invalid task type: "${taskType}". Must be one of: ${validTaskTypes.join(', ')}`,
    );
  }

  return taskType as TaskRegistryType | 'test-background-task' | 'test-a' | 'test-b';
}

export interface TestHooks {
  app: { getAppPath: () => string; isReady: () => boolean };
  db: {
    getStatus: () => { dbInitialized: boolean; dbConnected: boolean };
    initMockDatabase: (testDb?: unknown) => void;
    closeDatabase: () => void;
  };
  data: {
    loadStubTmdbData: (dataSource: string) => Promise<void>;
    loadStubWatchmodeData: (dataSource: string) => Promise<void>;
  };
  movies: {
    getById: (
      id: number,
      authContext?: AuthContextPayload,
    ) => Promise<import('../db/models/Movies').Movie | null>;
    getByTmdbId: (
      tmdbId: string,
      authContext?: AuthContextPayload,
    ) => Promise<import('../db/models/Movies').Movie | null>;
    getByWatchmodeId: (
      watchmodeId: string,
      authContext?: AuthContextPayload,
    ) => Promise<import('../db/models/Movies').Movie | null>;
    searchByTitle: (
      searchTerm: string,
      authContext?: AuthContextPayload,
    ) => Promise<import('../db/models/Movies').Movie[]>;
  };
  settings: {
    getStatus: () => Promise<{ initialized: boolean }>;
    initializeMockSettings: (testSettings?: Record<string, unknown>) => Promise<void>;
    get: (key: string, authContext?: AuthContextPayload) => Promise<unknown>;
    set: (key: string, value: unknown, authContext?: AuthContextPayload) => Promise<void>;
    load: (authContext?: AuthContextPayload) => Promise<Record<string, unknown>>;
    save: (settings: Record<string, unknown>, authContext?: AuthContextPayload) => Promise<void>;
  };
  backgroundTasks: {
    enqueue: (
      taskType: string,
      args?: Record<string, unknown>,
      authContext?: AuthContextPayload,
    ) => Promise<unknown>;
    getState: (authContext?: AuthContextPayload) => Promise<{ active: unknown; queue: unknown[] }>;
    cancelActive: (authContext?: AuthContextPayload) => Promise<unknown>;
    removeQueued: (taskId: string, authContext?: AuthContextPayload) => Promise<unknown>;
  };
  eventNotifications: {
    clearRecordedEvents: () => void;
    getRecordedEvents: () => Array<{ type: string; data: unknown; timestamp: number }>;
    findEventByType: (
      type: string,
    ) => { type: string; data: unknown; timestamp: number } | undefined;
    filterEventsByType: (type: string) => Array<{ type: string; data: unknown; timestamp: number }>;
    setupEventRecording: () => void;
  };
  testTasks: {
    setupTestTaskType: () => void;
    setTaskProgress: (current: number, max: number, description: string) => void;
    setTaskDescription: (description: string) => void;
    setTaskCurrent: (current: number) => void;
    setTaskMax: (max: number) => void;
    completeTask: () => void;
  };
  users: {
    hasUsers: () => Promise<boolean>;
    createFirstAdmin: (
      data: import('../services/UserService').FirstAdminUserData,
    ) => Promise<import('../db/models/Users').User>;
    createTestUser: (
      data: { username: string; email?: string; password?: string },
      authContext?: AuthContextPayload,
    ) => Promise<import('../services/UserService').AuthenticatedUser>;
    authenticateTestUser: (
      username: string,
      password: string,
      authContext?: AuthContextPayload,
    ) => Promise<import('../services/UserService').AuthenticatedUser | null>;
    getTestUserById: (
      id: number,
      authContext?: AuthContextPayload,
    ) => Promise<
      | import('../services/UserService').AuthenticatedUser
      | import('../services/UserService').BasicUserInfo
      | null
    >;
    getUsersWithPermissions: (
      permissions: string[],
      authContext?: AuthContextPayload,
    ) => Promise<import('../services/UserService').BasicUserInfo[]>;
    updateTestUserProfile: (
      id: number,
      profileData: { displayName?: string | null; profileImagePath?: string | null },
      authContext?: AuthContextPayload,
    ) => Promise<void>;
    saveProfileImage: (
      userId: number,
      imageBuffer: Buffer,
      mimeType: string,
      authContext?: AuthContextPayload,
    ) => Promise<string>;
    deleteProfileImage: (userId: number, authContext?: AuthContextPayload) => Promise<void>;
    changePassword: (
      userId: number,
      newPassword: string,
      authContext?: AuthContextPayload,
    ) => Promise<void>;
    assignRoleToUser: (
      userId: number,
      roleId: number,
      authContext?: AuthContextPayload,
    ) => Promise<void>;
    removeRoleFromUser: (
      userId: number,
      roleId: number,
      authContext?: AuthContextPayload,
    ) => Promise<void>;
    getRolesForUser: (userId: number, authContext?: AuthContextPayload) => Promise<number[]>;
    getUserPermissions: (userId: number, authContext?: AuthContextPayload) => Promise<string[]>;
  };
  roles: {
    createTestRole: (
      name: string,
      permissionStubs: string[],
      authContext?: AuthContextPayload,
    ) => Promise<import('../db/models/Roles').Role>;
    getTestRoleById: (
      id: number,
      authContext?: AuthContextPayload,
    ) => Promise<import('../db/models/Roles').Role | null>;
    getTestRoleByStub: (
      stub: string,
      authContext?: AuthContextPayload,
    ) => Promise<import('../db/models/Roles').Role | null>;
    getAllRoles: (authContext?: AuthContextPayload) => Promise<import('../db/models/Roles').Role[]>;
    setRolePermissions: (
      roleId: number,
      permissionStubs: string[],
      authContext?: AuthContextPayload,
    ) => Promise<void>;
    getRolePermissions: (roleId: number, authContext?: AuthContextPayload) => Promise<string[]>;
    getAllPermissions: (authContext?: AuthContextPayload) => Promise<string[]>;
    updateRole: (
      id: number,
      data: Partial<import('../db/models/Roles').RoleData>,
      authContext?: AuthContextPayload,
    ) => Promise<void>;
    updateRoleDisplayName: (
      id: number,
      displayName: string,
      authContext?: AuthContextPayload,
    ) => Promise<void>;
    updateRoleHiddenStatus: (
      id: number,
      isHidden: boolean,
      authContext?: AuthContextPayload,
    ) => Promise<void>;
    deleteRole: (id: number, authContext?: AuthContextPayload) => Promise<void>;
    duplicateRole: (sourceRoleId: number, authContext?: AuthContextPayload) => Promise<number>;
    getUsersWithRole: (roleId: number, authContext?: AuthContextPayload) => number[];
  };
  ui: {
    openMainWindow: () => Promise<void>;
  };
  appLifecycle: {
    waitForPreInitSteps: () => Promise<void>;
    signalPreInitComplete: () => void;
    waitForAppReady: () => Promise<void>;
    signalAppReady: () => void;
  };
}

export function getTestHooks(): TestHooks {
  return {
    app: {
      getAppPath: () => app.getAppPath(),
      isReady: () => app.isReady(),
    },
    db: {
      getStatus: () => db.getStatus(),
      initMockDatabase: (testDb?: unknown) =>
        db.initMockDatabase(testDb as InstanceType<typeof import('better-sqlite3')> | null),
      closeDatabase: () => db.closeDatabase(),
    },
    data: {
      async loadStubTmdbData(dataSource: string) {
        const tmdbDownloader = createMockDownloadJsonGzStream(dataSource);
        const tmdbTask = new ImportTmdbTask(tmdbDownloader);
        await tmdbTask.runTask(
          {},
          (
            global as unknown as {
              __testCallbacks: {
                createTaskContext: () => import('../tasks/BackgroundTask').TaskContext;
              };
            }
          ).__testCallbacks.createTaskContext(),
        );
      },
      async loadStubWatchmodeData(dataSource: string) {
        const watchmodeDownloader = createMockDownloadCsvStream(dataSource);
        const watchmodeTask = new ImportWatchmodeTask(watchmodeDownloader);
        await watchmodeTask.runTask(
          {},
          (
            global as unknown as {
              __testCallbacks: {
                createTaskContext: () => import('../tasks/BackgroundTask').TaskContext;
              };
            }
          ).__testCallbacks.createTaskContext(),
        );
      },
    },
    movies: {
      getById: async (id: number, authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(movieService.getById(id, ctx)));
      },
      getByTmdbId: async (tmdbId: string, authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(movieService.getByTmdbId(tmdbId, ctx)));
      },
      getByWatchmodeId: async (watchmodeId: string, authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(movieService.getByWatchmodeId(watchmodeId, ctx)),
        );
      },
      searchByTitle: async (searchTerm: string, authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(movieService.searchByTitle(searchTerm, ctx)),
        );
      },
    },
    settings: {
      getStatus: async () => {
        return getSettingsStatus();
      },
      initializeMockSettings: async (testSettings?: Record<string, unknown>) => {
        const store = createMockElectronStore(testSettings);
        return initializeSettingsManager(store);
      },
      get: async (key: string, authContext?: AuthContextPayload | undefined) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(settingsService.get(key, ctx)));
      },
      set: async (key: string, value: unknown, authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(settingsService.set(key, value, ctx)));
      },
      load: async (authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(settingsService.load(ctx)));
      },
      save: async (settings: Record<string, unknown>, authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(settingsService.save(settings, ctx)));
      },
    },
    backgroundTasks: {
      enqueue: async (
        taskType: string,
        args?: Record<string, unknown>,
        authContext?: AuthContextPayload,
      ) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        const validatedTaskType = validateTaskType(taskType);
        return executeServiceMethod(() =>
          Promise.resolve(
            backgroundTaskService.enqueue(validatedTaskType as TaskRegistryType, args ?? {}, ctx),
          ),
        );
      },
      getState: async (authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(backgroundTaskService.getState(ctx)));
      },
      cancelActive: async (authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(backgroundTaskService.cancelActive(ctx)));
      },
      removeQueued: async (taskId: string, authContext?: AuthContextPayload) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(backgroundTaskService.removeQueued(taskId, ctx)),
        );
      },
    },
    eventNotifications: {
      clearRecordedEvents,
      getRecordedEvents,
      findEventByType,
      filterEventsByType,
      setupEventRecording: () => {
        backgroundTaskManager.setNotifyFn((state) => {
          recordEvent('background-task-update', state);
        });
      },
    },
    testTasks: {
      setupTestTaskType: () => {
        registerTask(
          'test-background-task',
          class extends MockBackgroundTask {
            constructor() {
              super(false);
              // eslint-disable-next-line @typescript-eslint/no-this-alias
              activeTestTask = this;
            }
          },
        );
      },
      setTaskProgress: (current: number, max: number, description: string) => {
        if (activeTestTask) {
          activeTestTask.setProgress(current, max, description);
        }
      },
      setTaskDescription: (description: string) => {
        if (activeTestTask) {
          activeTestTask.setDescription(description);
        }
      },
      setTaskCurrent: (current: number) => {
        if (activeTestTask) {
          activeTestTask.setCurrent(current);
        }
      },
      setTaskMax: (max: number) => {
        if (activeTestTask) {
          activeTestTask.setMax(max);
        }
      },
      completeTask: () => {
        if (activeTestTask) {
          activeTestTask.complete();
        }
      },
    },
    users: {
      hasUsers: async () => executeServiceMethod(() => Promise.resolve(userService.hasUsers())),
      createFirstAdmin: async (data) =>
        executeServiceMethod(() => userService.createFirstAdmin(data)),
      createTestUser: async (data, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => userService.createUser(data, ctx));
      },
      authenticateTestUser: async (username, password, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => userService.authenticateUser(username, password, ctx));
      },
      getTestUserById: async (id, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(userService.getUserById(id, ctx)));
      },
      getUsersWithPermissions: async (permissions, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        const validatedPermissions = validatePermissionStubs(permissions);
        return executeServiceMethod(() =>
          Promise.resolve(userService.getUsersWithPermissions(validatedPermissions, ctx)),
        );
      },
      updateTestUserProfile: async (id, profileData, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => userService.updateUserProfile(id, profileData, ctx));
      },
      saveProfileImage: async (userId, imageBuffer, mimeType, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        const deserializedBuffer = deserializeBuffer(imageBuffer);
        return executeServiceMethod(() =>
          userService.saveProfileImage(userId, deserializedBuffer, mimeType, ctx),
        );
      },
      deleteProfileImage: async (userId, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => userService.deleteProfileImage(userId, ctx));
      },
      changePassword: async (userId, newPassword, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => userService.changePassword(userId, newPassword, ctx));
      },
      assignRoleToUser: async (userId, roleId, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(userService.assignRoleToUser(userId, roleId, ctx)),
        );
      },
      removeRoleFromUser: async (userId, roleId, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(userService.removeRoleFromUser(userId, roleId, ctx)),
        );
      },
      getRolesForUser: async (userId, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(userService.getRolesForUser(userId, ctx)),
        );
      },
      getUserPermissions: async (userId, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        const permissions = await executeServiceMethod(() =>
          Promise.resolve(userService.getUserPermissions(userId, ctx)),
        );
        return permissions.map((p) => p.stub);
      },
    },
    roles: {
      createTestRole: async (name, permissionStubs, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        const validatedStubs = validatePermissionStubs(permissionStubs);
        const roleId = await executeServiceMethod(() =>
          Promise.resolve(
            roleService.createRole({ displayName: name, systemStub: null, isHidden: false }, ctx),
          ),
        );
        if (validatedStubs.length > 0) {
          await executeServiceMethod(() =>
            Promise.resolve(roleService.setPermissionsForRole(roleId, validatedStubs, ctx)),
          );
        }
        const role = await executeServiceMethod(() =>
          Promise.resolve(roleService.getRoleById(roleId, ctx)),
        );
        if (!role) throw new Error('Failed to retrieve created role');
        return role;
      },
      getTestRoleById: (id, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(roleService.getRoleById(id, ctx)));
      },
      getTestRoleByStub: (stub, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(roleService.getRoleBySystemStub(stub, ctx)),
        );
      },
      getAllRoles: (authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(roleService.getAllRoles(ctx)));
      },
      setRolePermissions: async (roleId, permissionStubs, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        const validatedStubs = validatePermissionStubs(permissionStubs);
        return executeServiceMethod(() =>
          Promise.resolve(roleService.setPermissionsForRole(roleId, validatedStubs, ctx)),
        );
      },
      getRolePermissions: async (roleId, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        const permissions = await executeServiceMethod(() =>
          Promise.resolve(roleService.getPermissionsForRole(roleId, ctx)),
        );
        return permissions.map((p) => p.stub);
      },
      getAllPermissions: async (authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        const permissions = await executeServiceMethod(() =>
          Promise.resolve(roleService.getAllPermissions(ctx)),
        );
        return permissions.map((p) => p.stub);
      },
      updateRole: async (id, data, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(roleService.updateRole(id, data, ctx)));
      },
      updateRoleDisplayName: async (id, displayName, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(roleService.updateRole(id, { displayName }, ctx)),
        );
      },
      updateRoleHiddenStatus: async (id, isHidden, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(roleService.updateRole(id, { isHidden }, ctx)),
        );
      },
      deleteRole: async (id, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() => Promise.resolve(roleService.deleteRole(id, ctx)));
      },
      duplicateRole: async (sourceRoleId, authContext) => {
        const ctx = authContext
          ? createAuthContext(authContext.userId, authContext.permissions)
          : undefined;
        return executeServiceMethod(() =>
          Promise.resolve(roleService.duplicateRole(sourceRoleId, ctx)),
        );
      },
      getUsersWithRole: (roleId) => {
        // This is used only for testing. This isn't something the service layer exposes.
        const models = db.getModels();
        return models.userRoles.getUsersByRoleId(roleId);
      },
    },
    ui: {
      openMainWindow: async () => {
        createAppWindow();
      },
    },
    appLifecycle: {
      waitForPreInitSteps: async () => {
        return preReadyPromise;
      },
      signalPreInitComplete: () => {
        if (resolvePreInitPromise) {
          resolvePreInitPromise();
          resolvePreInitPromise = null;
        }
      },
      waitForAppReady: async () => {
        return appReadyPromise;
      },
      signalAppReady: () => {
        if (resolveAppReadyPromise) {
          resolveAppReadyPromise();
          resolveAppReadyPromise = null;
        }
      },
    },
  };
}
