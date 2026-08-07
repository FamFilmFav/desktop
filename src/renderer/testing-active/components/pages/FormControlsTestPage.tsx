/*
Copyright (c) 2026 Steve Dwire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, version 3.
*/

import React, { useContext, useRef, useState } from 'react';

import { Button } from '../../../components/elements/buttons';
import { Group, Page, Section } from '../../../components/elements/containers';
import type { FormContextValue } from '../../../components/elements/form';
import {
  Checkbox,
  CheckboxGroup,
  EmailInput,
  Fieldset,
  Form,
  FormContext,
  Radio,
  RadioGroup,
  Select,
  TextInput,
} from '../../../components/elements/form';

export default function FormControlsTestPage(): React.ReactElement {
  const [controlledState, setControlledState] = useState({
    name: '',
    email: '',
    acceptedTerms: false,
  });
  const [controlledNewsletter, setControlledNewsletter] = useState(false);
  const [controlledNotificationMethods, setControlledNotificationMethods] = useState<string[]>([]);
  const [controlledPlan, setControlledPlan] = useState<'basic' | 'premium'>('basic');
  const [controlledGenre, setControlledGenre] = useState('comedy');
  const [uncontrolledResult, setUncontrolledResult] = useState({
    name: '',
    email: '',
    acceptedTerms: false,
    newsletter: false,
    notificationMethods: [] as string[],
    plan: 'basic',
    favoriteGenre: 'comedy',
  });

  // State for uncontrolled form readiness and initial values
  const [uncontrolledIsReady, setUncontrolledIsReady] = useState(false);
  const [uncontrolledInitialValues, setUncontrolledInitialValues] = useState<Record<
    string,
    unknown
  > | null>(null);

  const controlledFormRef = useRef<FormContextValue>(null);
  const uncontrolledFormRef = useRef<FormContextValue>(null);

  // Local handler to apply initial values from textarea input
  const applyInitialValuesFromText = (text: string) => {
    try {
      const parsed = JSON.parse(text);
      setUncontrolledInitialValues(parsed);
      setUncontrolledIsReady(true);
    } catch {
      setUncontrolledInitialValues(null);
      setUncontrolledIsReady(false);
    }
  };

  const uncontrolledNameRef = useRef<HTMLInputElement>(null);
  const uncontrolledEmailRef = useRef<HTMLInputElement>(null);
  const uncontrolledAcceptedTermsRef = useRef<HTMLInputElement>(null);
  const uncontrolledNewsletterRef = useRef<HTMLInputElement>(null);
  const uncontrolledNotificationEmailRef = useRef<HTMLInputElement>(null);
  const uncontrolledNotificationSmsRef = useRef<HTMLInputElement>(null);
  const uncontrolledNotificationPushRef = useRef<HTMLInputElement>(null);
  const uncontrolledPlanBasicRef = useRef<HTMLInputElement>(null);
  const uncontrolledPlanPremiumRef = useRef<HTMLInputElement>(null);
  const uncontrolledGenreRef = useRef<HTMLSelectElement>(null);

  const updateControlledValue = (
    key: 'name' | 'email' | 'acceptedTerms',
    value: string | boolean,
  ): void => {
    setControlledState((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateControlledNewsletter = (checked: boolean): void => {
    setControlledNewsletter(checked);
  };

  const updateControlledNotificationMethods = (method: string, checked: boolean): void => {
    setControlledNotificationMethods((previous) => {
      if (checked) {
        return previous.includes(method) ? previous : [...previous, method];
      }
      return previous.filter((value) => value !== method);
    });
  };

  const updateControlledPlan = (value: 'basic' | 'premium'): void => {
    setControlledPlan(value);
  };

  const updateControlledGenre = (value: string): void => {
    setControlledGenre(value);
  };

  const handleControlledSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
  };

  const handleUncontrolledSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    setUncontrolledResult({
      name: uncontrolledNameRef.current?.value ?? '',
      email: uncontrolledEmailRef.current?.value ?? '',
      acceptedTerms: uncontrolledAcceptedTermsRef.current?.checked ?? false,
      newsletter: uncontrolledNewsletterRef.current?.checked ?? false,
      notificationMethods: [
        uncontrolledNotificationEmailRef.current?.checked ? 'email' : null,
        uncontrolledNotificationSmsRef.current?.checked ? 'sms' : null,
        uncontrolledNotificationPushRef.current?.checked ? 'push' : null,
      ].filter((method): method is string => method !== null),
      plan: uncontrolledPlanBasicRef.current?.checked
        ? 'basic'
        : uncontrolledPlanPremiumRef.current?.checked
          ? 'premium'
          : 'basic',
      favoriteGenre: uncontrolledGenreRef.current?.value ?? 'comedy',
    });
  };

  function FormValuesReporter({
    buttonTestId,
    outputTestId,
  }: {
    buttonTestId: string;
    outputTestId: string;
  }): React.ReactElement {
    const formContext = useContext(FormContext);
    const [valuesJson, setValuesJson] = useState('{}');

    return (
      <div data-testid={`${buttonTestId}-container`}>
        <Button
          size="small"
          data-testid={buttonTestId}
          onClick={() => {
            setValuesJson(JSON.stringify(formContext?.getValues() ?? {}, null, 2));
          }}
        >
          Get form values
        </Button>
        <pre data-testid={outputTestId}>{valuesJson}</pre>
      </div>
    );
  }

  return (
    <>
      <Page title="Form Controls Test Page" testId="form-controls-component-under-test" centered>
        <Section title="Controlled Form" testId="controlled-form-section">
          <Form
            onSubmit={handleControlledSubmit}
            testId="controlled-form"
            formContextRef={controlledFormRef}
          >
            <Fieldset
              legend="Controlled Personal Information"
              testId="controlled-fieldset-personal-information"
            >
              <TextInput
                id="controlled-input-name"
                name="name"
                label="Name"
                placeholder="Enter your name"
                value={controlledState.name}
                onChange={(event) => updateControlledValue('name', event.target.value)}
                testId="controlled-input-name"
              />
              <EmailInput
                id="controlled-input-email"
                name="email"
                label="Email"
                placeholder="Enter your email"
                value={controlledState.email}
                onChange={(event) => updateControlledValue('email', event.target.value)}
                testId="controlled-input-email"
              />
            </Fieldset>
            <Fieldset legend="Controlled Preferences" testId="controlled-fieldset-preferences">
              <Checkbox
                id="controlled-input-accepted-terms"
                name="acceptedTerms"
                label="Accept terms"
                checked={controlledState.acceptedTerms}
                onChange={(event) => updateControlledValue('acceptedTerms', event.target.checked)}
                testId="controlled-input-accepted-terms"
              />
              <CheckboxGroup
                legend="Controlled Options"
                testId="controlled-checkbox-group"
                name="newsletter"
              >
                <Checkbox
                  id="controlled-input-newsletter"
                  label="Subscribe to newsletter"
                  value="yes"
                  checked={controlledNewsletter}
                  onChange={(event) => updateControlledNewsletter(event.target.checked)}
                  testId="controlled-input-newsletter"
                />
              </CheckboxGroup>
              <CheckboxGroup
                legend="Controlled Notification Methods"
                testId="controlled-notification-methods-group"
                name="notificationMethods"
              >
                <Checkbox
                  id="controlled-input-notification-email"
                  label="Email"
                  value="email"
                  checked={controlledNotificationMethods.includes('email')}
                  onChange={(event) =>
                    updateControlledNotificationMethods('email', event.target.checked)
                  }
                  testId="controlled-input-notification-email"
                />
                <Checkbox
                  id="controlled-input-notification-sms"
                  label="SMS"
                  value="sms"
                  checked={controlledNotificationMethods.includes('sms')}
                  onChange={(event) =>
                    updateControlledNotificationMethods('sms', event.target.checked)
                  }
                  testId="controlled-input-notification-sms"
                />
                <Checkbox
                  id="controlled-input-notification-push"
                  label="Push"
                  value="push"
                  checked={controlledNotificationMethods.includes('push')}
                  onChange={(event) =>
                    updateControlledNotificationMethods('push', event.target.checked)
                  }
                  testId="controlled-input-notification-push"
                />
              </CheckboxGroup>
              <RadioGroup legend="Account type" testId="controlled-radio-group" name="plan">
                <Radio
                  id="controlled-input-plan-basic"
                  label="Basic"
                  value="basic"
                  checked={controlledPlan === 'basic'}
                  onChange={() => updateControlledPlan('basic')}
                  testId="controlled-radio-plan-basic"
                />
                <Radio
                  id="controlled-input-plan-premium"
                  label="Premium"
                  value="premium"
                  checked={controlledPlan === 'premium'}
                  onChange={() => updateControlledPlan('premium')}
                  testId="controlled-radio-plan-premium"
                />
              </RadioGroup>
              <Select
                id="controlled-select-genre"
                name="favoriteGenre"
                label="Favorite genre"
                value={controlledGenre}
                onChange={(event) => updateControlledGenre(event.target.value)}
                testId="controlled-select-genre"
              >
                <option value="comedy">Comedy</option>
                <option value="drama">Drama</option>
                <option value="action">Action</option>
              </Select>
            </Fieldset>
            <Button type="submit" data-testid="controlled-submit-button">
              Submit Controlled Form
            </Button>
          </Form>
        </Section>
        <Section title="Uncontrolled Form">
          <Form
            onSubmit={handleUncontrolledSubmit}
            testId="uncontrolled-form"
            formContextRef={uncontrolledFormRef}
            initialValues={uncontrolledInitialValues}
            isReady={uncontrolledIsReady}
          >
            <Fieldset
              legend="Uncontrolled Personal Information"
              testId="uncontrolled-fieldset-personal-information"
            >
              <TextInput
                id="uncontrolled-input-name"
                name="name"
                label="Name"
                placeholder="Enter your name"
                defaultValue=""
                ref={uncontrolledNameRef}
                testId="uncontrolled-input-name"
              />
              <EmailInput
                id="uncontrolled-input-email"
                name="email"
                label="Email"
                placeholder="Enter your email"
                defaultValue=""
                ref={uncontrolledEmailRef}
                testId="uncontrolled-input-email"
              />
            </Fieldset>
            <Fieldset legend="Uncontrolled Preferences" testId="uncontrolled-fieldset-preferences">
              <Checkbox
                id="uncontrolled-input-accepted-terms"
                name="acceptedTerms"
                label="Accept terms"
                defaultChecked={false}
                ref={uncontrolledAcceptedTermsRef}
                testId="uncontrolled-input-accepted-terms"
              />
              <CheckboxGroup
                legend="Uncontrolled options"
                testId="uncontrolled-checkbox-group"
                name="newsletter"
              >
                <Checkbox
                  id="uncontrolled-input-newsletter"
                  label="Subscribe to newsletter"
                  defaultChecked={false}
                  value="yes"
                  ref={uncontrolledNewsletterRef}
                  testId="uncontrolled-input-newsletter"
                />
              </CheckboxGroup>
              <CheckboxGroup
                legend="Uncontrolled notification methods"
                testId="uncontrolled-notification-methods-group"
                name="notificationMethods"
              >
                <Checkbox
                  id="uncontrolled-input-notification-email"
                  label="Email"
                  value="email"
                  defaultChecked={false}
                  ref={uncontrolledNotificationEmailRef}
                  testId="uncontrolled-input-notification-email"
                />
                <Checkbox
                  id="uncontrolled-input-notification-sms"
                  label="SMS"
                  value="sms"
                  defaultChecked={false}
                  ref={uncontrolledNotificationSmsRef}
                  testId="uncontrolled-input-notification-sms"
                />
                <Checkbox
                  id="uncontrolled-input-notification-push"
                  label="Push"
                  value="push"
                  defaultChecked={false}
                  ref={uncontrolledNotificationPushRef}
                  testId="uncontrolled-input-notification-push"
                />
              </CheckboxGroup>
              <RadioGroup legend="Account type" testId="uncontrolled-radio-group" name="plan">
                <Radio
                  id="uncontrolled-input-plan-basic"
                  label="Basic"
                  value="basic"
                  defaultChecked
                  ref={uncontrolledPlanBasicRef}
                  testId="uncontrolled-radio-plan-basic"
                />
                <Radio
                  id="uncontrolled-input-plan-premium"
                  label="Premium"
                  value="premium"
                  ref={uncontrolledPlanPremiumRef}
                  testId="uncontrolled-radio-plan-premium"
                />
              </RadioGroup>
              <Select
                id="uncontrolled-select-genre"
                name="favoriteGenre"
                label="Favorite genre"
                defaultValue="comedy"
                ref={uncontrolledGenreRef}
                testId="uncontrolled-select-genre"
              >
                <option value="comedy">Comedy</option>
                <option value="drama">Drama</option>
                <option value="action">Action</option>
              </Select>
            </Fieldset>
            <Button
              type="submit"
              disabled={!uncontrolledIsReady}
              data-testid="uncontrolled-submit-button"
            >
              Submit Uncontrolled Form
            </Button>
            <FormValuesReporter
              buttonTestId="uncontrolled-get-values-button"
              outputTestId="uncontrolled-values-json"
            />
          </Form>
          <div style={{ marginTop: 8 }}>
            <textarea
              data-testid="uncontrolled-initial-values-textarea"
              aria-label="Uncontrolled initial values"
              style={{ width: '100%', minHeight: 120 }}
              defaultValue={
                uncontrolledInitialValues ? JSON.stringify(uncontrolledInitialValues, null, 2) : ''
              }
              onChange={() => {
                /* keep textarea uncontrolled for playwright interactions */
              }}
            />
            <div style={{ marginTop: 6 }}>
              <Button
                size="small"
                type="button"
                data-testid="uncontrolled-set-initial-values-button"
                onClick={() => {
                  const ta = document.querySelector(
                    '[data-testid="uncontrolled-initial-values-textarea"]',
                  ) as HTMLTextAreaElement | null;
                  if (!ta) return;
                  applyInitialValuesFromText(ta.value);
                }}
              >
                Set Form Values
              </Button>
            </div>
          </div>
        </Section>
      </Page>
      <Section title="Test Controls">
        <h3>Controlled Form</h3>
        <div data-testid="controlled-state-display">
          <div data-testid="controlled-name-display">Name: {controlledState.name}</div>
          <div data-testid="controlled-email-display">Email: {controlledState.email}</div>
          <div data-testid="controlled-accepted-terms-display">
            Accepted: {controlledState.acceptedTerms ? 'true' : 'false'}
          </div>
          <div data-testid="controlled-newsletter-display">
            Newsletter: {controlledNewsletter ? 'true' : 'false'}
          </div>
          <div data-testid="controlled-notification-methods-display">
            Notification methods: {controlledNotificationMethods.join(', ')}
          </div>
          <div data-testid="controlled-account-type-display">Account type: {controlledPlan}</div>
          <div data-testid="controlled-genre-display">Favorite genre: {controlledGenre}</div>
        </div>
        <h3>Uncontrolled Form</h3>
        <div data-testid="uncontrolled-state-display">
          <div data-testid="uncontrolled-name-display">Name: {uncontrolledResult.name}</div>
          <div data-testid="uncontrolled-email-display">Email: {uncontrolledResult.email}</div>
          <div data-testid="uncontrolled-accepted-terms-display">
            Accepted: {uncontrolledResult.acceptedTerms ? 'true' : 'false'}
          </div>
          <div data-testid="uncontrolled-newsletter-display">
            Newsletter: {uncontrolledResult.newsletter ? 'true' : 'false'}
          </div>
          <div data-testid="uncontrolled-notification-methods-display">
            Notification methods: {uncontrolledResult.notificationMethods.join(', ')}
          </div>
          <div data-testid="uncontrolled-account-type-display">
            Account type: {uncontrolledResult.plan}
          </div>
          <div data-testid="uncontrolled-genre-display">
            Favorite genre: {uncontrolledResult.favoriteGenre}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Group flow="row" size="small" spread="equal">
            <Button
              data-testid="controlled-validate-button"
              onClick={() => {
                const errors: Record<string, string> = {};
                if (!controlledState.name) errors.name = 'Name required';
                if (!controlledState.email || !controlledState.email.includes('@'))
                  errors.email = 'Enter a valid email';
                controlledFormRef.current?.setErrors?.(errors);
              }}
            >
              Validate Controlled
            </Button>
            <Button
              data-testid="controlled-reset-button"
              onClick={() => {
                setControlledState({ name: '', email: '', acceptedTerms: false });
                setControlledNewsletter(false);
                setControlledNotificationMethods([]);
                setControlledPlan('basic');
                setControlledGenre('comedy');
                controlledFormRef.current?.reset?.();
                controlledFormRef.current?.setErrors?.({});
              }}
            >
              Reset Controlled
            </Button>
            <Button
              data-testid="uncontrolled-validate-button"
              onClick={() => {
                const values = uncontrolledFormRef.current?.getValues?.() ?? {};
                const errors: Record<string, string> = {};
                if (!values.name) errors.name = 'Name required';
                if (!values.email || !String(values.email).includes('@'))
                  errors.email = 'Enter a valid email';
                uncontrolledFormRef.current?.setErrors?.(errors);
              }}
            >
              Validate Uncontrolled
            </Button>
            <Button
              data-testid="uncontrolled-reset-button"
              onClick={() => {
                uncontrolledFormRef.current?.reset?.();
                uncontrolledFormRef.current?.setErrors?.({});
              }}
            >
              Reset Uncontrolled
            </Button>
          </Group>
        </div>
      </Section>
    </>
  );
}
