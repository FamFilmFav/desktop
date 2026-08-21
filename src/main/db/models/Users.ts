/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import log from 'electron-log/main';

export interface UserRow {
  id: number;
  username: string;
  email: string | null;
  password_hash: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserData {
  username: string;
  email?: string | null;
  password?: string;
}

export default class UsersModel {
  private db: Database.Database;
  private insertStmt!: Database.Statement;
  private getByIdStmt!: Database.Statement;
  private getByUsernameStmt!: Database.Statement;
  private updatePasswordStmt!: Database.Statement;
  private updateLastLoginStmt!: Database.Statement;
  private deleteStmt!: Database.Statement;

  constructor(db: Database.Database) {
    this.db = db;
    this.initStatements();
  }

  private initStatements(): void {
    this.insertStmt = this.db.prepare(`
      INSERT INTO users (username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    this.getByUsernameStmt = this.db.prepare('SELECT * FROM users WHERE username = ?');

    this.updatePasswordStmt = this.db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
    `);

    this.updateLastLoginStmt = this.db.prepare(`
      UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?
    `);

    this.deleteStmt = this.db.prepare('DELETE FROM users WHERE id = ?');
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  async create(data: UserData): Promise<number> {
    const now = new Date().toISOString();
    let passwordHash: string | null = null;

    if (data.password) {
      passwordHash = await this.hashPassword(data.password);
    }

    try {
      const result = this.insertStmt.run(data.username, data.email || null, passwordHash, now, now);

      return Number(result.lastInsertRowid);
    } catch (error) {
      log.error('[UsersModel.create] Error creating user:', error, 'data:', data);
      if (error instanceof Error) {
        log.error('[UsersModel.create] Stack:', error.stack);
      }
      throw error;
    }
  }

  getById(id: number): User | null {
    const row = this.getByIdStmt.get(id) as UserRow | undefined;
    return row ? this.formatUser(row) : null;
  }

  getByUsername(username: string): UserRow | null {
    const row = this.getByUsernameStmt.get(username) as UserRow | undefined;
    return row || null;
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const hash = await this.hashPassword(newPassword);
    const now = new Date().toISOString();

    this.updatePasswordStmt.run(hash, now, id);
  }

  updateLastLogin(id: number): void {
    const now = new Date().toISOString();
    this.updateLastLoginStmt.run(now, now, id);
  }

  delete(id: number): void {
    this.deleteStmt.run(id);
  }

  formatUser(row: UserRow): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      lastLoginAt: row.last_login_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
