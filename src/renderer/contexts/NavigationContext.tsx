/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { getCurrentFocusKey, setFocus } from '@noriginmedia/norigin-spatial-navigation-core';
import log from 'electron-log/renderer';
import type { ReactNode } from 'react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { scrollElementIntoView } from './useNavigationFocusable';

export type NavigationMode = 'mouse' | 'tab' | 'arrow';

interface RegisteredFocusable {
  focusKey: string;
  element: HTMLElement | null;
  onActivate?: (event: KeyboardEvent) => void;
}

export interface NavigationContextValue {
  currentPage: string;
  navigateTo: (pageId: string) => void;
  navigationMode: NavigationMode;
  isArrowNavigation: boolean;
  registerFocusable: (entry: RegisteredFocusable) => () => void;
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

const fallbackNavigationContextValue: NavigationContextValue = {
  currentPage: 'home',
  navigateTo: () => undefined,
  navigationMode: 'mouse',
  isArrowNavigation: false,
  registerFocusable: () => () => undefined,
};

const debugNavigation = (...args: unknown[]): void => {
  log.debug('[Navigation]', ...args);
};

const describeElement = (element: HTMLElement | null): string | null => {
  if (!element) return null;

  const text = element.textContent?.trim();
  const snippet = text && text.length > 0 ? text.replace(/\s+/g, ' ').slice(0, 80) : null;
  const id = element.id ? `#${element.id}` : null;
  const classes = element.className
    ? `.${String(element.className).trim().split(/\s+/).join('.')}`
    : null;
  const parts = [element.tagName.toLowerCase(), id, classes, snippet].filter(Boolean);
  return parts.join(' ');
};

const isElementTabbable = (element: HTMLElement): boolean => {
  if (element.hidden) return false;

  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (element.hasAttribute('inert')) return false;
  if (element.closest('[inert]')) return false;
  if (element.matches('input[type="hidden"]')) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  if (element.closest('fieldset[disabled]')) {
    return false;
  }

  if (element.hasAttribute('disabled')) {
    const tagName = element.tagName.toLowerCase();
    if (
      ['button', 'input', 'select', 'textarea', 'option', 'optgroup', 'fieldset'].includes(tagName)
    ) {
      return false;
    }
  }

  const tagName = element.tagName.toLowerCase();
  const isNativeFocusableControl =
    ['button', 'input', 'select', 'textarea', 'summary', 'iframe'].includes(tagName) ||
    (tagName === 'a' && element.hasAttribute('href')) ||
    (tagName === 'audio' && element.hasAttribute('controls')) ||
    (tagName === 'video' && element.hasAttribute('controls')) ||
    (tagName === 'area' && element.hasAttribute('href')) ||
    element.isContentEditable;

  return element.tabIndex >= 0 || isNativeFocusableControl;
};

export function getTabbableElementsInOrder(root: ParentNode | null = document.body): HTMLElement[] {
  if (!(root instanceof HTMLElement)) {
    return [];
  }

  const elements: HTMLElement[] = [];
  const candidates: HTMLElement[] = [];

  if (isElementTabbable(root)) {
    elements.push(root);
  }

  root.querySelectorAll<HTMLElement>('*').forEach((candidate) => {
    if (isElementTabbable(candidate)) {
      candidates.push(candidate);
    }
  });

  const orderedCandidates = candidates.sort((left, right) => {
    const leftTabIndex = left.tabIndex;
    const rightTabIndex = right.tabIndex;

    if (leftTabIndex > 0 && rightTabIndex > 0) {
      return leftTabIndex - rightTabIndex;
    }

    if (leftTabIndex > 0) {
      return -1;
    }

    if (rightTabIndex > 0) {
      return 1;
    }

    return 0;
  });

  elements.push(...orderedCandidates);
  return elements;
}

export function getNextTabbableElement(
  currentElement: HTMLElement | null,
  direction: 'next' | 'previous' = 'next',
): HTMLElement | null {
  if (!currentElement) {
    return null;
  }

  const tabbable = getTabbableElementsInOrder(document.body);
  if (tabbable.length === 0) {
    return null;
  }

  const currentIndex = tabbable.indexOf(currentElement);
  if (currentIndex === -1) {
    return direction === 'next' ? tabbable[0] : tabbable[tabbable.length - 1];
  }

  if (direction === 'next') {
    return tabbable[(currentIndex + 1) % tabbable.length] ?? null;
  }

  return tabbable[(currentIndex - 1 + tabbable.length) % tabbable.length] ?? null;
}

export function NavigationProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('mouse');
  const focusableRegistry = useRef<Map<string, RegisteredFocusable>>(new Map());
  const elementToFocusKey = useRef<WeakMap<HTMLElement, string>>(new WeakMap());

  const navigateTo = useCallback((pageId: string) => {
    setCurrentPage(pageId);
  }, []);

  const isArrowNavigation = useMemo(() => navigationMode === 'arrow', [navigationMode]);

  const getRegisteredFocusable = useCallback(
    (element: HTMLElement | null): RegisteredFocusable | undefined => {
      let current = element;
      while (current) {
        const focusKey = elementToFocusKey.current.get(current);
        if (focusKey) {
          return focusableRegistry.current.get(focusKey);
        }
        current = current.parentElement;
      }
      return undefined;
    },
    [],
  );

  const getCurrentRegisteredFocusable = useCallback((): RegisteredFocusable | undefined => {
    const currentFocusKey = getCurrentFocusKey();
    const activeElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    if (currentFocusKey) {
      const focusable = focusableRegistry.current.get(currentFocusKey);
      if (focusable) {
        return focusable;
      }
    }

    return getRegisteredFocusable(activeElement);
  }, [getRegisteredFocusable]);

  const syncDomToCurrentFocus = useCallback((): HTMLElement | null => {
    const entry = getCurrentRegisteredFocusable();
    const element = entry?.element ?? null;

    debugNavigation('syncDomToCurrentFocus', {
      activeElement: describeElement(
        document.activeElement instanceof HTMLElement ? document.activeElement : null,
      ),
      targetElement: describeElement(element),
      hasEntry: Boolean(entry),
    });

    if (element && element !== document.activeElement) {
      requestAnimationFrame(() => {
        if (element.isConnected) {
          element.focus({ preventScroll: true });
          scrollElementIntoView(element);
        }
      });
    }

    return element;
  }, [getCurrentRegisteredFocusable]);

  const registerFocusable = useCallback((entry: RegisteredFocusable): (() => void) => {
    const { focusKey, element } = entry;
    const existing = focusableRegistry.current.get(focusKey);

    if (existing?.element && existing.element !== element) {
      elementToFocusKey.current.delete(existing.element);
    }

    if (element) {
      focusableRegistry.current.set(focusKey, entry);
      elementToFocusKey.current.set(element, focusKey);
    } else {
      focusableRegistry.current.delete(focusKey);
    }

    return (): void => {
      const current = focusableRegistry.current.get(focusKey);
      if (!current) return;
      if (!element || current.element === element) {
        focusableRegistry.current.delete(focusKey);
        if (current.element) {
          elementToFocusKey.current.delete(current.element);
        }
      }
    };
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent) => {
    debugNavigation('handlePointerDown', {
      target: event.target instanceof HTMLElement ? event.target.tagName : null,
    });
    setNavigationMode('mouse');
  }, []);

  const handleFocusIn = useCallback(
    (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const entry = getRegisteredFocusable(target);
      debugNavigation('handleFocusIn', {
        target: describeElement(target),
        currentMode: navigationMode,
        focusKey: entry?.focusKey ?? null,
      });
      if (!entry) return;

      if (navigationMode !== 'mouse') {
        setNavigationMode('tab');
      }

      setFocus(entry.focusKey);
    },
    [getRegisteredFocusable, navigationMode],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;
      debugNavigation('handleKeyDown', {
        key,
        currentMode: navigationMode,
        shiftKey: event.shiftKey,
      });

      if (key === 'Tab') {
        debugNavigation('handleKeyDown tab', {
          mode: navigationMode,
          shiftKey: event.shiftKey,
        });
        if (navigationMode === 'arrow') {
          const focusedElement = syncDomToCurrentFocus();
          const nextElement = getNextTabbableElement(
            focusedElement,
            event.shiftKey ? 'previous' : 'next',
          );

          debugNavigation('handleKeyDown tab after arrow', {
            focusedElement: describeElement(focusedElement),
            nextElement: describeElement(nextElement),
            activeElement: describeElement(
              document.activeElement instanceof HTMLElement ? document.activeElement : null,
            ),
          });

          if (nextElement && nextElement !== focusedElement) {
            event.preventDefault();
            setTimeout(() => {
              nextElement.focus({ preventScroll: true });
              scrollElementIntoView(nextElement);
            }, 1);
          }
        }
        setNavigationMode('tab');
        return;
      }

      if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
        debugNavigation('handleKeyDown arrow', { key });
        setNavigationMode('arrow');
        return;
      }

      if (navigationMode === 'arrow' && (key === 'Enter' || key === ' ' || key === 'Spacebar')) {
        const entry = getCurrentRegisteredFocusable();
        debugNavigation('handleKeyDown activate', {
          mode: navigationMode,
          currentFocusKey: getCurrentFocusKey(),
          activeElement: describeElement(
            document.activeElement instanceof HTMLElement ? document.activeElement : null,
          ),
        });
        const element = entry?.element;
        if (entry?.onActivate && element) {
          entry.onActivate(event);
          if (element !== document.activeElement) {
            element.focus({ preventScroll: true });
            scrollElementIntoView(element);
          }
        }
      }
    },
    [getCurrentRegisteredFocusable, navigationMode, syncDomToCurrentFocus],
  );

  useEffect(() => {
    const windowObj = window;
    windowObj.addEventListener('pointerdown', handlePointerDown, true);
    windowObj.addEventListener('focusin', handleFocusIn, true);
    windowObj.addEventListener('keydown', handleKeyDown, true);

    return () => {
      windowObj.removeEventListener('pointerdown', handlePointerDown, true);
      windowObj.removeEventListener('focusin', handleFocusIn, true);
      windowObj.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleFocusIn, handleKeyDown, handlePointerDown]);

  // Expose a stable function on window so tests and other code can call it directly.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).navigateTo = (pageId: string) => navigateTo(pageId);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).navigateTo;
    };
  }, [navigateTo]);

  const value = useMemo(
    () => ({
      currentPage,
      navigateTo,
      navigationMode,
      isArrowNavigation,
      registerFocusable,
    }),
    [currentPage, navigateTo, navigationMode, isArrowNavigation, registerFocusable],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    debugNavigation('useNavigation fallback', { reason: 'missing provider' });
    return fallbackNavigationContextValue;
  }
  return ctx;
}

export function useOptionalNavigation(): NavigationContextValue | undefined {
  return useContext(NavigationContext);
}
