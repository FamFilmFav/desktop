import { useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type Ref,
  type RefObject,
} from 'react';

import { useOptionalNavigation } from './NavigationContext';

export function scrollElementIntoView(element: HTMLElement): void {
  element.style.scrollMarginTop = '100px';
  element.style.scrollMarginBottom = '1rem';
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

export interface NavigationFocusableOptions<T extends HTMLElement = HTMLElement> {
  onActivate?: (event: KeyboardEvent) => void;
  focusable?: boolean;
  focusKey?: string;
  trackChildren?: boolean;
  externalRef?: Ref<T>;
}

export interface NavigationFocusableResult<T extends HTMLElement = HTMLElement> {
  ref: (node: T | null) => void;
  domRef: RefObject<T | null>;
  focusKey: string;
  focused: boolean;
  focusSelf: () => void;
}

export function useNavigationFocusable<T extends HTMLElement = HTMLElement>(
  options: NavigationFocusableOptions<T> = {},
): NavigationFocusableResult<T> {
  const navigation = useOptionalNavigation();
  const { focusKey: explicitFocusKey, focusable, trackChildren, onActivate, externalRef } = options;
  const {
    ref: noriginRef,
    focusKey: generatedFocusKey,
    focused,
    focusSelf,
  } = useFocusable({
    focusKey: explicitFocusKey,
    focusable,
    trackChildren,
  });
  const focusKey = explicitFocusKey ?? generatedFocusKey;

  const [element, setElement] = useState<T | null>(null);
  const domRef = useRef<T | null>(null);

  const mergedRef = useCallback(
    (node: T | null) => {
      domRef.current = node;
      setElement(node);

      if (typeof noriginRef === 'function') {
        (noriginRef as (instance: T | null) => void)(node);
      } else if (noriginRef && 'current' in noriginRef) {
        (noriginRef as MutableRefObject<T | null>).current = node;
      }

      if (typeof externalRef === 'function') {
        (externalRef as (instance: T | null) => void)(node);
      } else if (externalRef && 'current' in externalRef) {
        (externalRef as MutableRefObject<T | null>).current = node;
      }
    },
    [externalRef, noriginRef],
  );

  useEffect(() => {
    if (!navigation || !focusKey) {
      return undefined;
    }

    return navigation.registerFocusable({ focusKey, element, onActivate });
  }, [navigation, focusKey, element, onActivate]);

  useEffect(() => {
    if (!focused || !element) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      if (element.isConnected) {
        scrollElementIntoView(element);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [element, focused]);

  return {
    ref: mergedRef,
    domRef,
    focusKey,
    focused,
    focusSelf,
  };
}
