/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation-react';
import React, { type MouseEvent, type ReactNode, useEffect, useId, useState } from 'react';

import { useNavigationFocusable } from '../../../contexts/useNavigationFocusable';
import { ChevronIcon } from '../icons';

export interface ExpandableMenuSectionProps {
  label: ReactNode;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  children: ReactNode;
  testId?: string;
  className?: string;
}

export function ExpandableMenuSection({
  label,
  isExpanded,
  onExpandedChange,
  children,
  testId,
  className = '',
}: ExpandableMenuSectionProps): React.ReactElement {
  const { ref, focused, focusSelf, domRef } = useNavigationFocusable<HTMLButtonElement>({
    onActivate: () => {
      domRef.current?.click();
    },
  });
  const generatedId = useId();
  const sectionId = testId ?? `expandable-menu-section-${generatedId}`;
  const contentId = `${sectionId}-content`;
  const [localExpanded, setLocalExpanded] = useState(isExpanded ?? false);
  const controlled = isExpanded !== undefined;
  const expanded = controlled ? isExpanded : localExpanded;

  useEffect(() => {
    if (isExpanded !== undefined) {
      setLocalExpanded(isExpanded);
    }
  }, [isExpanded]);

  const handleToggle = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    const nextExpanded = !expanded;

    if (!controlled) {
      setLocalExpanded(nextExpanded);
    }

    onExpandedChange?.(nextExpanded);
  };

  const classes = ['expandable-menu-section', expanded ? 'expanded' : '', className]
    .filter(Boolean)
    .join(' ');
  const buttonClasses = ['expandable-menu-section__header', focused && 'has-nav-focus']
    .filter(Boolean)
    .join(' ');
  const { ref: childrenRef, focusKey: childrenFocusKey } = useFocusable({ focusable: expanded });

  return (
    <div className={classes} data-testid={testId}>
      <button
        ref={ref}
        onFocus={focusSelf}
        type="button"
        className={buttonClasses}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={handleToggle}
        data-testid={`${sectionId}-toggle`}
      >
        <span className="expandable-menu-section__label">{label}</span>
        <span className="expandable-menu-section__chevron" aria-hidden="true">
          <ChevronIcon width={18} height={18} />
        </span>
      </button>
      <FocusContext.Provider value={childrenFocusKey}>
        <div
          ref={childrenRef}
          id={contentId}
          data-testid={`${sectionId}-content`}
          className="expandable-menu-section__content"
          role="region"
          inert={!expanded}
          aria-hidden={!expanded}
        >
          {children}
        </div>
      </FocusContext.Provider>
    </div>
  );
}
