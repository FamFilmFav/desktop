/** @jest-environment jsdom */

import { describe, expect, jest, test } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';

import { Select } from '../../src/renderer/components/elements/form';
import {
  getNextTabbableElement,
  getTabbableElementsInOrder,
  NavigationProvider,
} from '../../src/renderer/contexts/NavigationContext';

describe('navigation tab-order helpers', () => {
  const getNextId = (sourceId: string, direction: 'next' | 'previous'): string | null => {
    const source = document.getElementById(sourceId);
    return getNextTabbableElement(source, direction)?.id ?? null;
  };

  test('orders tabbable elements using explicit tabindex values before native tab order', () => {
    document.body.innerHTML = `
      <button id="first">First</button>
      <div id="positive-two" tabindex="2">Two</div>
      <div id="positive-one" tabindex="1">One</div>
      <input id="native" />
      <button id="hidden" style="display:none">Hidden</button>
      <button id="disabled" disabled>Disabled</button>
    `;

    const order = getTabbableElementsInOrder(document.body).map((element) => element.id);
    expect(order).toEqual(['positive-one', 'positive-two', 'first', 'native']);
  });

  test('returns the next and previous tabbable element around the current focus target', () => {
    document.body.innerHTML = `
      <button id="first">First</button>
      <input id="second" />
      <button id="third">Third</button>
    `;

    const first = document.getElementById('first');
    const second = document.getElementById('second');
    const third = document.getElementById('third');

    expect(getNextTabbableElement(first, 'next')).toBe(second);
    expect(getNextTabbableElement(second, 'next')).toBe(third);
    expect(getNextTabbableElement(second, 'previous')).toBe(first);
  });

  test('disqualifies elements that are hidden', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <button id="candidate" hidden>Candidate</button>
      <button id="after">After</button>
    `;

    expect(getTabbableElementsInOrder(document.body).map((element) => element.id)).toEqual([
      'before',
      'after',
    ]);
    expect(getNextId('before', 'next')).toBe('after');
    expect(getNextId('after', 'previous')).toBe('before');
  });

  test('disqualifies elements marked aria-hidden', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <button id="candidate" aria-hidden="true">Candidate</button>
      <button id="after">After</button>
    `;

    expect(getTabbableElementsInOrder(document.body).map((element) => element.id)).toEqual([
      'before',
      'after',
    ]);
    expect(getNextId('before', 'next')).toBe('after');
    expect(getNextId('after', 'previous')).toBe('before');
  });

  test('disqualifies elements marked inert directly', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <button id="candidate" inert>Candidate</button>
      <button id="after">After</button>
    `;

    expect(getTabbableElementsInOrder(document.body).map((element) => element.id)).toEqual([
      'before',
      'after',
    ]);
    expect(getNextId('before', 'next')).toBe('after');
    expect(getNextId('after', 'previous')).toBe('before');
  });

  test('disqualifies elements inside an inert ancestor', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <div id="wrapper" inert>
        <button id="candidate">Candidate</button>
      </div>
      <button id="after">After</button>
    `;

    expect(getTabbableElementsInOrder(document.body).map((element) => element.id)).toEqual([
      'before',
      'after',
    ]);
    expect(getNextId('before', 'next')).toBe('after');
    expect(getNextId('after', 'previous')).toBe('before');
  });

  test('disqualifies input elements with type hidden', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <input id="candidate" type="hidden" />
      <button id="after">After</button>
    `;

    expect(getTabbableElementsInOrder(document.body).map((element) => element.id)).toEqual([
      'before',
      'after',
    ]);
    expect(getNextId('before', 'next')).toBe('after');
    expect(getNextId('after', 'previous')).toBe('before');
  });

  test('disqualifies elements with display none', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <div id="candidate" tabindex="0" style="display:none">Candidate</div>
      <button id="after">After</button>
    `;

    expect(getTabbableElementsInOrder(document.body).map((element) => element.id)).toEqual([
      'before',
      'after',
    ]);
    expect(getNextId('before', 'next')).toBe('after');
    expect(getNextId('after', 'previous')).toBe('before');
  });

  test('disqualifies elements with visibility hidden', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <div id="candidate" tabindex="0" style="visibility:hidden">Candidate</div>
      <button id="after">After</button>
    `;

    expect(getTabbableElementsInOrder(document.body).map((element) => element.id)).toEqual([
      'before',
      'after',
    ]);
    expect(getNextId('before', 'next')).toBe('after');
    expect(getNextId('after', 'previous')).toBe('before');
  });

  test('disqualifies controls inside a disabled fieldset', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <fieldset id="group" disabled>
        <button id="candidate">Candidate</button>
      </fieldset>
      <button id="after">After</button>
    `;

    expect(getTabbableElementsInOrder(document.body).map((element) => element.id)).toEqual([
      'before',
      'after',
    ]);
    expect(getNextId('before', 'next')).toBe('after');
    expect(getNextId('after', 'previous')).toBe('before');
  });

  test('disqualifies disabled controls', () => {
    document.body.innerHTML = `
      <button id="before">Before</button>
      <button id="candidate" disabled>Candidate</button>
      <button id="after">After</button>
    `;

    expect(getTabbableElementsInOrder(document.body).map((element) => element.id)).toEqual([
      'before',
      'after',
    ]);
    expect(getNextId('before', 'next')).toBe('after');
    expect(getNextId('after', 'previous')).toBe('before');
  });

  test('activates a select control when Enter is pressed after arrow focus', () => {
    const { container } = render(
      <NavigationProvider>
        <Select label="Favorite" name="favorite" data-testid="favorite-select" />
      </NavigationProvider>,
    );

    const select = screen.getByTestId('favorite-select');
    const focusSpy = jest.fn();

    Object.defineProperty(select, 'focus', {
      configurable: true,
      value: focusSpy,
    });

    act(() => {
      select.focus();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(focusSpy).toHaveBeenCalled();
    container.remove();
  });
});
