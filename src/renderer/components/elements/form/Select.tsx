/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import React from 'react';

import { useNavigationFocusable } from '../../../contexts/useNavigationFocusable';

import { useFormField } from './useFormField';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  label?: string;
  labelVisible?: boolean;
  testId?: string;
  enabled?: boolean;
  name: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, labelVisible = true, testId, id, enabled = true, ...rest },
    forwardedRef,
  ) => {
    const nameToUse = typeof rest.name === 'string' ? rest.name : undefined;
    if (!nameToUse) {
      throw new Error('Select must specify a name prop.');
    }

    const {
      id: inputId,
      ariaLabel,
      disabled,
      initialValue,
    } = useFormField({
      id,
      name: nameToUse,
      type: 'select',
      label,
      labelVisible,
      required: rest.required === true,
      enabled,
      ariaLabel: (rest as Record<string, unknown>)['aria-label'] as string | undefined,
      testId,
    });

    const {
      ref: focusableRefRaw,
      focused,
      focusSelf,
      domRef,
    } = useNavigationFocusable<HTMLSelectElement>({
      onActivate: () => {
        domRef.current?.click();
      },
    });
    const focusableRef = focusableRefRaw as React.ForwardedRef<HTMLSelectElement>;
    const classes = [focused && 'has-nav-focus', className].filter(Boolean).join(' ');

    // Manage an internal ref so we can imperatively update uncontrolled inputs.
    const internalRef = React.useRef<HTMLSelectElement | null>(null);
    const setRefs = React.useCallback(
      (el: HTMLSelectElement | null) => {
        internalRef.current = el;

        const assignRef = (
          target: React.ForwardedRef<HTMLSelectElement>,
          value: HTMLSelectElement | null,
          name: string,
        ) => {
          if (typeof target === 'function') {
            try {
              target(value);
            } catch {
              log.warn(`Select: failed to assign ${name} via function, ignoring.`, { inputId });
            }
          } else if (target && typeof target === 'object') {
            (target as React.MutableRefObject<HTMLSelectElement | null>).current = value;
          }
        };

        // Assign both the forwarded DOM ref (for callers) and the Norigin focusable ref
        assignRef(forwardedRef as React.ForwardedRef<HTMLSelectElement>, el, 'forwarded ref');
        assignRef(focusableRef, el, 'spatial navigation ref');
      },
      [focusableRef, forwardedRef, inputId],
    );

    // Compute props: if the caller didn't explicitly provide value/defaultValue and the form provided an initialValue, apply it.
    const hasExplicitValue = Object.prototype.hasOwnProperty.call(rest, 'value');

    const implicitProps: Record<string, unknown> = {
      id: inputId,
      'data-testid': testId,
      ref: setRefs,
      'aria-label': ariaLabel,
      disabled,
    };

    if (!hasExplicitValue && initialValue !== undefined) {
      implicitProps.defaultValue = initialValue != null ? String(initialValue) : '';
    }

    const selectElement = (
      <select
        {...(implicitProps as React.SelectHTMLAttributes<HTMLSelectElement>)}
        onFocus={focusSelf}
        {...rest}
      />
    );

    // If initialValue changes after mount, imperatively update the DOM value so uncontrolled select reflects it.
    React.useEffect(() => {
      if (initialValue === undefined) return;
      try {
        const el = document.getElementById(inputId) as HTMLSelectElement | null;
        if (!el) return;
        el.value = initialValue != null ? String(initialValue) : '';
      } catch {
        // ignore
      }
    }, [initialValue, inputId]);

    if (!label || !labelVisible) {
      return selectElement;
    }

    return (
      <label className={classes} htmlFor={inputId}>
        <span>{label}</span>
        {selectElement}
      </label>
    );
  },
);

Select.displayName = 'Select';
