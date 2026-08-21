/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3 of the License.
*/

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createApiClient } from '../api-client';

import { Button } from './elements/buttons';
import { Group, Page, Section } from './elements/containers';
import { EmailInput, Form, SecureInput, TextInput } from './elements/form';
import type { FormContextValue } from './elements/form/Form';

import '../styles/components/FirstAdminUserOverlay.scss';

const apiClient = createApiClient();

interface FirstAdminUserOverlayProps {
  onCreated: () => void;
}

export default function FirstAdminUserOverlay({
  onCreated,
}: FirstAdminUserOverlayProps): React.ReactElement {
  const { t } = useTranslation('auth');
  const formContextRef = useRef<FormContextValue | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreated, setIsCreated] = useState(false);

  const createFirstAdmin = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setErrorMessage('');

    const values = formContextRef.current?.getValues() ?? {};
    const username = typeof values.username === 'string' ? values.username.trim() : '';
    if (!username) {
      setErrorMessage(t('errors.usernameRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.users.createFirstAdmin({
        username,
        email: typeof values.email === 'string' && values.email ? values.email : undefined,
        password:
          typeof values.password === 'string' && values.password ? values.password : undefined,
        displayName:
          typeof values.displayName === 'string' && values.displayName
            ? values.displayName
            : undefined,
      });
      setIsCreated(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const usernameInput = document.querySelector<HTMLInputElement>('#first-admin-username-input');
    usernameInput?.focus();
  }, []);

  useEffect(() => {
    if (!isCreated) return undefined;
    const timeout = window.setTimeout(onCreated, 1500);
    return () => window.clearTimeout(timeout);
  }, [isCreated, onCreated]);

  return (
    <div
      className="first-admin-overlay"
      data-testid="first-admin-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-admin-title"
    >
      <Page
        className="first-admin-page"
        centered
        title={t('firstAdmin.title')}
        data-testid="first-admin-page"
      >
        {isCreated ? (
          <div className="message success" role="status" data-testid="first-admin-success-message">
            {t('firstAdmin.created')}
          </div>
        ) : (
          <>
            <div className="instructions" data-testid="first-admin-instructions">
              <p>{t('firstAdmin.description')}</p>
            </div>
            <Form
              testId="first-admin-form"
              formContextRef={formContextRef}
              onSubmit={createFirstAdmin}
            >
              <Section testId="first-admin-form-section">
                <TextInput
                  id="first-admin-username-input"
                  name="username"
                  label={t('firstAdmin.username')}
                  required
                  autoComplete="username"
                  testId="first-admin-username-input"
                />
                <SecureInput
                  id="first-admin-password-input"
                  name="password"
                  label={t('firstAdmin.password')}
                  autoComplete="new-password"
                  testId="first-admin-password-input"
                />
                <EmailInput
                  id="first-admin-email-input"
                  name="email"
                  label={t('firstAdmin.email')}
                  autoComplete="email"
                  testId="first-admin-email-input"
                />
                <TextInput
                  id="first-admin-display-name-input"
                  name="displayName"
                  label={t('firstAdmin.displayName')}
                  autoComplete="name"
                  testId="first-admin-display-name-input"
                />
              </Section>
              <Group flow="row" justifyContent="center">
                <Button
                  className="btn-primary"
                  type="submit"
                  data-testid="first-admin-submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('firstAdmin.submitting') : t('firstAdmin.submit')}
                </Button>
              </Group>
              {errorMessage && (
                <div className="message error" role="alert" data-testid="first-admin-error-message">
                  {errorMessage}
                </div>
              )}
            </Form>
          </>
        )}
      </Page>
    </div>
  );
}
