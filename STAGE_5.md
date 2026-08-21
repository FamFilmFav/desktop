## Plan: Stage 5 First Admin UI

Implement the first-run bootstrap workflow as a blocking overlay in the existing application shell. It will use `UserService.hasUsers()` to detect an empty users table, expose a transport-neutral bootstrap API over both Electron IPC and HTTP, create the first user with a required username plus optional password, email, and display name, atomically assign the seeded `admin` role, and leave the user unauthenticated for Stage 6 login. Cucumber coverage will exercise the workflow through the existing `UnauthenticatedUserPersona` in both supported render locations.

**Steps**

### Phase 1: Define and implement the bootstrap use case

1. Define the first-admin boundary around the existing `UserService.hasUsers()` query and a new `UserService.createFirstAdmin()` operation. The renderer uses `hasUsers()` to decide whether to present the bootstrap workflow; `createFirstAdmin()` independently rechecks the empty-database condition so the security rule does not depend on the UI. Define the creation request, response, and error semantics at this boundary. Username is required; password, email, and display name are optional. The response is the raw serializable `User` record.
2. Implement `UserService.createFirstAdmin()` as the single write/orchestration operation. `UserService` owns the user-lifecycle orchestration: empty-database recheck, validation, admin-role assignment, and failure/atomicity behavior. It may use `RoleService` to resolve the seeded `admin` role and its permission metadata, but the UI must never call ordinary user creation and role assignment separately to bootstrap the account.
3. Add focused service-level tests for the use case: empty database succeeds, existing users reject bootstrap, the created user receives `admin` and `can-admin`, optional password/email/display-name handling works, and partial failures do not leave an unusable account. _This phase establishes the behavior and blocks transport/UI work._

### Phase 2: Adapt the use case to the transports

4. Add the renderer-facing API type and client method for the use case. This is the contract at the renderer boundary, not another implementation of the service. Keep it transport-neutral so React calls one method regardless of environment.
5. Add thin Electron adapters: preload/context-bridge exposure and an IPC handler that validates/decodes the request, calls the bootstrap use case, and maps domain errors into the API error shape.
6. Add thin HTTP adapters: route registration, request parsing/validation, response/error mapping, and the existing localhost/rate-limit/security middleware. Both adapters must call the same service operation and must not duplicate bootstrap or role-assignment logic.
7. Verify IPC and HTTP produce equivalent results for the same request, reject second bootstrap attempts, do not expose password hashes, and preserve the existing automatic transport selection in `createApiClient()`. _This phase blocks UI integration tests._

### Phase 3: Build the conditional bootstrap UI

8. Add a first-admin page/component using the existing `Page`, `Section`, `Group`, `Form`, `TextInput`, password-compatible input, and `Button` patterns. Include required username, optional password, optional email, and optional display name.
9. Add a bootstrap-state check at the application/layout boundary. When no users exist, render the form as a blocking overlay within `AppLayout`, prevent normal menu/content interaction, and keep the overlay visible until creation succeeds. When users already exist, do not show the bootstrap UI and do not expose a bypass through navigation or page registration.
10. On successful creation, show a localized success state and leave the app unauthenticated. Do not transition to an authenticated home screen; Stage 6 owns login. Define retry behavior for server errors and field-level/form-level handling for duplicate username, invalid values, and the service’s bootstrap refusal.
11. Add stable `data-testid` attributes for the overlay/root, each input, submit, validation messages, success state, and error state. Keep all visible text in i18next and add matching keys to both English and development auth locale files.

### Phase 4: Add BDD business-flow coverage

12. Extend `UnauthenticatedUserPersona` with domain-facing bootstrap actions, using the existing `UserPersona` base and routing technical interaction through a dedicated first-admin page object. Keep business-logic steps independent of Playwright and technical hooks.
13. Add a feature under `tests/bdd/business-logic/features/` covering the complete workflow: empty database displays the conditional UI; valid submission creates the user; username, optional email, and optional display name are persisted; the user has the `admin` role and effective `can-admin` permission; and the resulting UI remains unauthenticated until Stage 6.
14. Add scenarios for missing username, optional password/email/display-name omission, duplicate or second bootstrap attempt, retry after a failed submission, and suppression of the bootstrap overlay when a user already exists. Include a no-password case without testing login behavior, which belongs to Stage 6. Use scenario state stores for created users and avoid coupling assertions to translated text.
15. Run the feature through both the Electron transport and the browser transport. Keep the existing Stage 4 unauthenticated Settings smoke scenario unchanged for now, but record its authentication conflict separately rather than silently broadening Stage 5.

### Phase 5: Verification and human checkpoint

16. Add focused unit coverage for any new bootstrap orchestration/validation logic that cannot be meaningfully verified through Cucumber.
17. Validate with `npm run build:main`, `npm run build:renderer`, `npm run test:unit`, and the focused Cucumber feature through both `npm run test:features:electron` and `npm run test:features:browser`. Run lint if the touched code follows the repository’s active testing-file swap convention.
18. Perform manual validation in a fresh empty database and in a database containing an existing user: confirm the blocking overlay, keyboard/focus behavior, error recovery, no password/hash leakage, no automatic login, and disappearance of the bootstrap UI after initialization. Pause for human review before committing the stage.
19. Commit the completed stage separately with `feat: add first admin user creation UI`, only after the implementation, tests, and documentation scope are approved.

**Relevant files**

- `USER_SECURITY_IMPLEMENTATION_PLAN.md` and `USER_SECURITY.md` — source requirements and security/user workflow constraints.
- `src/main/services/UserService.ts` — existing user creation, profile, and authentication logic to reuse; add the atomic bootstrap operation here.
- `src/main/services/RoleService.ts`, `src/main/auth/permissions.ts`, and `src/main/database.ts` — resolve the seeded `admin` role and verify `can-admin`.
- `src/main/api-server/ipc/`, `src/main/api-server/http/`, and `src/main/preload.ts` — expose the same bootstrap contract through IPC and HTTP.
- `src/renderer/api-client/types.ts`, `src/renderer/api-client/index.ts`, and transport implementations — add the transport-neutral client methods.
- `src/renderer/App.tsx`, `src/renderer/components/AppLayout.tsx`, `src/renderer/components/pageRegistry.ts`, and `src/renderer/pages/PageIds.ts` — integrate the empty-user check and blocking overlay without bypassing the existing shell.
- `src/renderer/components/pages/SettingsPage.tsx` and shared form/container elements — follow established async form, reset, status, focus, and test-selector patterns.
- `src/renderer/components/pages/FirstAdminUserPage.tsx` or equivalent — new bootstrap form, error, and success surface.
- `assets/locales/en/auth.json` and `assets/locales/dev/auth.json` — add all page labels, instructions, validation, status, and error messages.
- `tests/bdd/business-flow/personas/UnauthenticatedUserPersona.ts` — add bootstrap-facing domain methods.
- `tests/bdd/technical/page-objects/` — add a dedicated first-admin page object based on `BasePage` and existing form/page objects.
- `tests/bdd/business-logic/features/`, `tests/bdd/business-logic/steps/`, and `tests/bdd/technical/infrastructure/world.ts` — feature, steps, and scenario state integration.
- Existing `tests/bdd/technical/hooks/users.ts` and `roles.ts` — reuse only for setup and postcondition verification; do not make business steps call technical hooks directly.

**Verification**

1. Confirm service/API behavior with an empty database, including atomic admin assignment, optional-field handling, and second-attempt rejection.
2. Run focused renderer/unit tests for form validation and bootstrap-state rendering.
3. Run `npm run test:features:electron` with the Stage 5 tag or feature path.
4. Run `npm run test:features:browser` and confirm the same scenarios pass with the browser transport.
5. Run `npm run build:main`, `npm run build:renderer`, and `npm run test:unit`; inspect lint output for touched files.
6. Manually test both empty and pre-populated databases, including error recovery, blocked navigation, and no automatic authentication.

**Decisions**

- Stage 5 includes both IPC and HTTP production transport wiring because the requested UI must work through both transport modes; the existing decision that HTTP UI is not yet functional is treated as implementation work to complete here, not as a reason to omit the browser contract.
- The first-admin surface is a blocking overlay within `AppLayout`, preserving the shell while preventing ordinary navigation until bootstrap succeeds.
- Creation does not establish a session or log the user in; login remains Stage 6.
- Admin assignment is a service/API responsibility, not a sequence of UI calls, so the UI cannot create a non-admin first user through a race or partial failure.
- The existing unauthenticated Settings smoke test remains unchanged temporarily; its conflict with current authentication enforcement is documented and excluded from the Stage 5 acceptance criteria.
- Cucumber remains the integration-test authority, with technical page objects and the `UnauthenticatedUserPersona` separating UI mechanics from business-language scenarios.
- This stage includes no login UI, profile-management UI, general user/role management, or changes to the existing Stage 4 smoke scenario.

**Further Considerations**

1. Decide whether successful creation should leave the overlay on a “created, continue to login” state or simply show a success message. The recommended behavior is a stable success state with no automatic login, so Stage 6 can own the transition.
2. Because repository guidance requires human checkpoints before test work and completion, review the API transaction shape and acceptance scenarios before the first implementation edit.
