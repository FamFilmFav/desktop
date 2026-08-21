/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import log from 'electron-log/renderer';

import { ApiClient } from '../types';

import { HttpAppApi } from './app';
import { HttpBackgroundTaskApi } from './background-tasks';
import { HttpMovieApi } from './movies';
import { HttpSettingsApi } from './settings';
import { HttpUserApi } from './users';

class HttpApiClient implements ApiClient {
  private eventListeners: Map<string, Set<(data: unknown) => void>> = new Map();
  private ws: WebSocket | null = null;

  app = new HttpAppApi();
  backgroundTasks = new HttpBackgroundTaskApi(this);
  movies = new HttpMovieApi();
  settings = new HttpSettingsApi();
  users = new HttpUserApi();

  on(eventType: string, callback: (data: unknown) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);

    if (!this.ws) {
      this.connectWebSocket();
    }
  }

  off(eventType: string, callback: (data: unknown) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }

    if (this.eventListeners.size === 0 && this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private connectWebSocket(): void {
    this.ws = new WebSocket(`ws://${window.location.host}`);

    this.ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        const listeners = this.eventListeners.get(type);
        if (listeners) {
          listeners.forEach((callback) => callback(data));
        }
      } catch (error) {
        log.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
    };

    this.ws.onerror = (error) => {
      log.error('WebSocket error:', error);
    };
  }
}

export function createHttpApiClient(): ApiClient {
  return new HttpApiClient();
}
