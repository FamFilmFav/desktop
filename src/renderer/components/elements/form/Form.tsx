/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';
import React, { createContext, useCallback, useMemo, useRef } from 'react';

export interface FormRegistryMeta {
  required?: boolean;
  hasError?: boolean;
  name?: string;
  type?: string;
  labelVisible?: boolean;
  // Optional callback to obtain the current value for this field/group
  getValue?: () => unknown;
}

export interface FormContextValue {
  generateId: () => string;
  registerField: (id: string, meta?: FormRegistryMeta) => void;
  unregisterField: (id: string) => void;
  hasLabel: (id: string) => boolean;
  registerLabel: (id: string) => void;
  unregisterLabel: (id: string) => void;
  // Extract a name -> value map from the current form DOM/state
  getValues: () => Record<string, unknown>;
  // Optional helpers exposed by the form
  reset?: () => void;
  setErrors?: (errors: Record<string, string>) => void;
  // optional initial values and readiness flag
  initialValues?: Record<string, unknown> | null;
  isReady?: boolean;
}

/*
  Notes on the form registry and context types above:

  - `FormRegistryMeta` describes the metadata the form stores for each registered
    field (or group). `name` is the HTML form field name (may be absent for
    anonymous/internal controls). `type` is a hint such as 'checkbox', 'radio',
    'select', or a plain input type like 'text'. `getValue` is an optional
    runtime callback some components (like complex grouped controls) can provide
    to derive their value from internal state rather than relying on DOM lookups.

  - `FormContextValue` is the object exposed to children via `FormContext`.
    The important programmatic pieces are `getValues()` (read the current
    form values) and `reset()` / `initialValues` which coordinate applying
    initial values back into uncontrolled DOM inputs. This context is used by
    both controlled and uncontrolled field implementations so the Form can
    treat them uniformly at a higher level.
*/

export const FormContext = createContext<FormContextValue | null>(null);

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  className?: string;
  testId?: string;
  autoIdPrefix?: string;
  // Accept a ref-like object to expose the form context. Use a generic
  // RefObject in the public prop type to avoid exporting the mutable type
  // directly. Internally we cast to `MutableRefObject` when assigning.
  formContextRef?: React.RefObject<FormContextValue | null>;
  // optional initial values to populate uncontrolled inputs
  initialValues?: Record<string, unknown> | null;
  // when false the form may delay applying initialValues
  isReady?: boolean;
  children?: React.ReactNode;
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  (
    {
      className,
      testId,
      children,
      autoIdPrefix,
      formContextRef,
      initialValues = null,
      isReady = true,
      ...rest
    },
    ref,
  ) => {
    const counterRef = useRef(1);
    const fieldsRef = useRef(new Map<string, FormRegistryMeta>());
    const labelsRef = useRef(new Set<string>());
    const errorsRef = useRef<Record<string, string>>({});
    const [, setErrorsTick] = React.useState(0);

    const generateId = useCallback(() => {
      const prefix = autoIdPrefix ?? 'f';
      const value = `${prefix}-${counterRef.current}`;
      counterRef.current += 1;
      return value;
    }, [autoIdPrefix]);

    const registerField = useCallback((id: string, meta?: FormRegistryMeta) => {
      fieldsRef.current.set(id, meta ?? {});
    }, []);

    const unregisterField = useCallback((id: string) => {
      fieldsRef.current.delete(id);
    }, []);

    const getValues = useCallback((): Record<string, unknown> => {
      const byName: Record<string, Array<{ id: string; meta: FormRegistryMeta }>> = {};
      // Build a map of fields keyed by their `name` attribute. This groups
      // related controls (e.g. checkbox sets or radio options) so we can
      // compute a single logical value for the field name.

      for (const [id, meta] of fieldsRef.current.entries()) {
        if (!meta || !meta.name) continue;
        const name = meta.name as string;
        byName[name] = byName[name] || [];
        byName[name].push({ id, meta });
      }

      const result: Record<string, unknown> = {};

      for (const [name, entries] of Object.entries(byName)) {
        // If a field or group registered a `getValue` callback, prefer that:
        // this allows composite components (that manage their own state)
        // to control how their value is read without relying on DOM queries.
        const groupMetaWithGetter = entries.find((e) => typeof e.meta.getValue === 'function');
        if (groupMetaWithGetter) {
          try {
            result[name] = groupMetaWithGetter.meta.getValue!();
          } catch {
            // If the getter throws, return `null` to indicate an unavailable value
            result[name] = null;
          }
          continue;
        }

        // If multiple elements share the same name we treat them as a group
        // (radio options, checkbox sets, or other repeated controls).
        if (entries.length > 1) {
          const sampleType = entries[0].meta.type;

          // Radios: find the checked option
          if (sampleType === 'radio') {
            const el = document.querySelector(
              `input[name="${name}"]:checked`,
            ) as HTMLInputElement | null;
            result[name] = el ? el.value : null;
            continue;
          }

          // Checkbox groups: collect the values of all checked boxes
          if (sampleType === 'checkbox') {
            const checked = Array.from(
              document.querySelectorAll(`input[name="${name}"]:checked`),
            ) as HTMLInputElement[];
            result[name] = checked.map((c) => c.value);
            continue;
          }

          // Fallback for other grouped controls: collect each element's value
          result[name] = entries.map((e) => {
            const el = document.getElementById(e.id) as HTMLInputElement | HTMLSelectElement | null;
            if (!el) return null;
            return 'value' in el ? (el as HTMLInputElement | HTMLSelectElement).value : null;
          });
          continue;
        }

        // Single field: prefer an explicit getter if present, otherwise read
        // from the DOM element. Handle checkboxes (booleans) as a special-case.
        const single = entries[0];
        if (typeof single.meta.getValue === 'function') {
          try {
            result[name] = single.meta.getValue!();
          } catch {
            result[name] = null;
          }
          continue;
        }

        const el = document.getElementById(single.id) as
          | HTMLInputElement
          | HTMLSelectElement
          | null;
        if (!el) {
          result[name] = null;
        } else if ('checked' in el && el.type === 'checkbox') {
          // Standalone checkbox -> boolean
          result[name] = (el as HTMLInputElement).checked;
        } else if ('value' in el) {
          result[name] = (el as HTMLInputElement | HTMLSelectElement).value;
        } else {
          result[name] = null;
        }
      }

      return result;
    }, []);

    const hasLabel = useCallback((id: string) => labelsRef.current.has(id), []);
    const registerLabel = useCallback((id: string) => labelsRef.current.add(id), []);
    const unregisterLabel = useCallback((id: string) => labelsRef.current.delete(id), []);

    const reset = useCallback(() => {
      // Apply `initialValues` into the uncontrolled DOM elements so that
      // subsequent submits/read operations reflect the intended starting state.
      // If an individual field's initial value is `undefined`, fall back to
      // the element's native default (the `defaultValue`/`defaultChecked` set
      // in markup) to preserve expected behavior.
      if (!initialValues) return;

      // Group fields by their `name` (same logic as in `getValues`).
      const byName: Record<string, Array<{ id: string; meta: FormRegistryMeta }>> = {};
      for (const [id, meta] of fieldsRef.current.entries()) {
        if (!meta || !meta.name) continue;
        const name = meta.name as string;
        byName[name] = byName[name] || [];
        byName[name].push({ id, meta });
      }

      for (const [name, entries] of Object.entries(byName)) {
        const initVal = initialValues[name];
        const sampleType = entries[0].meta.type;

        // Radio groups: set the `checked` flag for the option that matches
        // the initial value. If no initial value is provided, restore the
        // option's original `defaultChecked` state.
        if (sampleType === 'radio') {
          for (const e of entries) {
            const el = document.getElementById(e.id) as HTMLInputElement | null;
            if (!el) continue;
            if (initVal !== undefined) {
              el.checked = String(initVal) === el.value;
            } else {
              el.checked = el.defaultChecked;
            }
          }
          continue;
        }

        // Checkbox groups: two modes
        //  - If the initial value is an array, treat it as a multi-select
        //    list of values to check.
        //  - If the initial value is a scalar/boolean, apply it to the
        //    single checkbox (non-grouped case) or treat it as a truthy
        //    flag for the first checkbox in a group.
        if (sampleType === 'checkbox') {
          if (Array.isArray(initVal)) {
            for (const e of entries) {
              const el = document.getElementById(e.id) as HTMLInputElement | null;
              if (!el) continue;
              el.checked = (initVal as unknown[]).includes(el.value);
            }
          } else if (initVal !== undefined) {
            const e = entries[0];
            const el = document.getElementById(e.id) as HTMLInputElement | null;
            if (!el) continue;
            el.checked = Boolean(initVal);
          } else {
            // No initial value -> restore markup defaultChecked for each box
            for (const e of entries) {
              const el = document.getElementById(e.id) as HTMLInputElement | null;
              if (!el) continue;
              el.checked = el.defaultChecked;
            }
          }
          continue;
        }

        // Single-value inputs (text, select, etc.): write `initVal` if present
        // otherwise restore the element's native default.
        const single = entries[0];
        const el = document.getElementById(single.id) as
          | HTMLInputElement
          | HTMLSelectElement
          | null;
        if (!el) continue;
        if ('value' in el) {
          if (initVal !== undefined) {
            el.value = String(initVal);
          } else {
            // For <select> elements the canonical default is the option that
            // has `defaultSelected`; if none exists fall back to an empty
            // string. For inputs/textarea we restore `defaultValue`.
            if (el instanceof HTMLSelectElement) {
              const defaultOption = Array.from(el.options).find((option) => option.defaultSelected);
              el.value = defaultOption ? defaultOption.value : '';
            } else {
              el.value = el.defaultValue;
            }
          }
        }
      }
    }, [initialValues]);

    const setErrors = useCallback((errors: Record<string, string>) => {
      errorsRef.current = errors || {};
      setErrorsTick((n) => n + 1);
    }, []);

    const contextValue = useMemo(
      () => ({
        generateId,
        registerField,
        unregisterField,
        hasLabel,
        registerLabel,
        unregisterLabel,
        getValues,
        reset,
        setErrors,
        initialValues,
        isReady,
      }),
      [
        generateId,
        registerField,
        unregisterField,
        hasLabel,
        registerLabel,
        unregisterLabel,
        getValues,
        reset,
        setErrors,
        initialValues,
        isReady,
      ],
    );

    const { ref: focusableRef, focusKey: childrenFocusKey } = useFocusable({ focusable: isReady });
    const formRef = React.useCallback(
      (el: HTMLFormElement | null) => {
        if (typeof ref === 'function') {
          ref(el);
        } else if (ref && typeof ref === 'object') {
          (ref as React.MutableRefObject<HTMLFormElement | null>).current = el;
        }

        if (focusableRef && typeof focusableRef === 'object') {
          focusableRef.current = el;
        }
      },
      [ref, focusableRef],
    );

    React.useEffect(() => {
      if (formContextRef && 'current' in formContextRef) {
        // Cast to mutable for assignment since callers typically pass the
        // result of `useRef()` which is mutable. We avoid exposing the
        // mutable type in the prop signature to reduce coupling to that
        // implementation detail.
        (formContextRef as React.MutableRefObject<FormContextValue | null>).current = contextValue;
        return () => {
          (formContextRef as React.MutableRefObject<FormContextValue | null>).current = null;
        };
      }
      return undefined;
    }, [contextValue, formContextRef]);

    return (
      <FocusContext.Provider value={childrenFocusKey}>
        <FormContext.Provider value={contextValue}>
          <form inert={!isReady} ref={formRef} className={className} data-testid={testId} {...rest}>
            {children}
          </form>
        </FormContext.Provider>
      </FocusContext.Provider>
    );
  },
);

Form.displayName = 'Form';
