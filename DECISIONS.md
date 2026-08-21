# Decisions

This document records significant architectural and implementation decisions for the Family Watch Night project.

---

## 1. Integration Tests Must Use Cucumber BDD (Not Playwright)

**Date**: March 2026  
**Status**: Active

**Decision**: New integration tests are written as Cucumber feature files under `./tests/component/`, not as direct Playwright tests in `./tests/integration/`.

**Rationale**:

- Business-language specifications are clearer and more maintainable
- Easier for non-technical stakeholders to review
- BDD approach reduces test maintenance overhead
- Feature files serve as living documentation

**Trade-offs**:

- Slightly more setup required per test
- Cucumber step definitions require more upfront structure
- Payoff increases with test count

**Notes**:

- Project is migrating away from direct Playwright tests
- Do NOT write new tests in `./tests/integration/`

---

## 2. All User-Facing Text Must Be Translatable (i18next)

**Date**: March 2026  
**Status**: Active

**Decision**: Any text exposed in the UI must use i18next translation keys, not hardcoded strings.

**Rationale**:

- Support for multiple languages (currently: en, dev)
- Locale files centralized in `./assets/locales/{locale}/`
- Built-in instrumentation for missing translation detection

**Implementation**:

- Import `LocalizationService` for locale file access
- Use i18next keys in React components
- Add corresponding entries to `./assets/locales/en/common.json` and dev locale files

**Notes**:

- `LocalizationService` has sophisticated validation to prevent injection attacks
- Developers should understand the validation patterns for security

---

## 3. Dual Transport Pattern: HTTP + IPC Expose Same Services

**Date**: March 2026  
**Status**: Active

**Decision**: Core services are exposed through BOTH HTTP (Express) and IPC (Electron) transports, enabling the same React components to run in Electron or browser.

**Rationale**:

- Single codebase for both native app and web access
- Easier testing (can test HTTP surface without Electron)
- Clear separation between services and transport layers

**Current State**:

- HTTP UI routes were completed with PR [#76](https://github.com/FamilyWatchNight/desktop/pull/76)

**Future Work**:

- Multi-user access from local network

**Notes**:

- `src/renderer/api-client` auto-detects environment and selects transport
- Services in `src/main/services/` have NO knowledge of IPC or HTTP

---

## 4. New Displayable Errors Must Use Complete Locale Keys

**Date**: August 2026
**Status**: Active

**Decision**: New code must represent every potentially displayable error or message with an i18next translation key. Service code must call `this.t('namespace.key')` without inline fallback text, and matching English and Dev locale entries must be added in the same change.

**Rationale**:

- Prevents hardcoded English from bypassing localization.
- Keeps English and Dev locale files complete and reviewable.
- Makes missing translations visible through the existing i18n instrumentation.
- Avoids coupling production logic to fallback copy that belongs in locale files.

**Scope**:

- Errors that remain strictly internal and are never returned across a service or transport boundary may use technical logging details.
- Any error that can reach a user, API client, or UI must use a localized key or be converted into a localized boundary error.
- Existing fallback strings may be migrated incrementally; all new code follows this rule.

**Implementation**:

- Add keys to both `assets/locales/en/{namespace}.json` and `assets/locales/dev/{namespace}.json`.
- Use `this.t('errors.someKey')`, never `this.t('errors.someKey', 'English fallback')` or a raw user-facing string.
- Use a dedicated key when an invariant/configuration error has a different meaning from a general domain error.

---

## 5. Security-First Architecture with Defense-in-Depth

**Date**: March 2026  
**Status**: Active

**Decision**: Multiple layers of security validation are applied to all file operations and user input.

**Key Patterns**:

- **Path operations**: Use `safeJoin()` and `assertPathInsideAllowedDirs()` from `src/main/security/`
- **Input validation**: Normalize and validate all user input (language codes, namespaces, keys)
- **Bounds checking**: Enforce length limits and segment count limits
- **Prototype pollution prevention**: Block dangerous keys (`__proto__`, `constructor`, `prototype`)
- **Environment enforcement**: Mode checks prevent operations in production
- **IPC surface minimization**: Only expose necessary functions via preload.ts

**Rationale**:

- Addresses CodeQL static analysis findings
- Mitigates common attack vectors (path traversal, injection, prototype pollution)
- Establishes reusable security patterns

**References**:

- `src/main/security/pathGuards.ts` - Path validation functions
- `src/main/services/LocalizationService.ts` - Example of comprehensive security implementation

**Notes**:

- When file operations are needed, consult `src/main/security/`
- If security gaps are identified, propose additions to the security library
- Rate limiting (100 req/min) and localhost-only HTTP server enforce additional boundaries

---

## 5. Agents Should Check In Frequently During Early Development

**Date**: March 2026  
**Status**: Active (for early development phase)

**Decision**: AI agents should ask for human guidance after major changes, before considering work complete, and before implementation choices.

**Rationale**:

- Early phase of agent workflow development
- Prevents costly autonomous decisions that diverge from expectations
- Builds shared understanding of project patterns and conventions
- Iterative feedback improves guidance quality

**Checkpoint Strategy**:

- After each major change: Ask for feedback
- Before task completion: Verify expectations match
- On scope questions: Ask before expanding/reducing scope
- Implementation choices: Surface multiple approaches when they exist

**Testing Validation**:

- Before writing first test: Validate approach and coverage strategy
- Before each additional test: Validate previous test worked
- Before marking test work done: Verify sufficient coverage

**Notes**:

- This is a temporary decision for the early development phase
- As trust and pattern understanding grows, checkpoint frequency may relax

---

## 6. Documentation Should Be Maintained Alongside Code Changes

**Date**: March 2026  
**Status**: Active

**Decision**: Living documentation (ARCHITECTURE_ANALYSIS.md, DECISIONS.md, AGENTS.md) is reviewed and updated during feature work, not left to drift.

**Rationale**:

- Prevents stale documentation that wastes future agent time
- Forces explicit decision-making about architectural impact
- Creates accountability for design changes

**Workflow**:

- Agents flag documentation updates needed in chat
- Updates discussed before implementation (especially DECISIONS.md)
- Documentation updates are final step before marking work complete

**Notes**:

- ARCHITECTURE_ANALYSIS.md captures current system design
- DECISIONS.md records one-time decisions (rarely updated)
- AGENTS.md captures conventions and workflow (may evolve)

---

## 7. Documentation Updates Require Chat Discussion

**Date**: March 2026  
**Status**: Active

**Decision**: All updates to AGENTS.md, DECISIONS.md, ARCHITECTURE_ANALYSIS.md must be proposed and refined in chat before implementation.

**Rationale**:

- Ensures collaborative refinement of guidance documents
- Prevents misunderstandings in agent workflow instructions
- Maintains documentation quality through human review
- Creates shared understanding of changes

**Implementation**:

- Propose changes in chat first
- Refine wording and approach together
- Implement only after agreement
- Use this process for all documentation changes

**Notes**:

- This applies to all three key documentation files
- Prevents unilateral changes to agent guidance
- Builds on the checkpoint strategy for major changes

---

## 8. Central event-notification-manager for dual transport

**Date**: March 2026
**Status**: Active

**Decision**: Introduce an `event-notification-manager` middleware layer that registers callbacks on services that broadcast state-change events (e.g., `BackgroundTaskService`) and forwards these events to all transport broadcasters (IPC + HTTP/WebSocket).

**Rationale**:

- Avoid duplicated event routing logic in multiple transport implementations
- Ensure consistent event payload semantics across IPC and HTTP
- Provide a single extensible place to add new broadcast events and service sources

**Implementation**:

- Services expose standard event callback API:
  - `setNotifyFn(fn)`
  - `clearNotifyFn(fn)`
- `event-notification-manager.initialize()` binds transport broadcast functions to service callbacks
- IPC transport implements `broadcast(eventType, data)` using `BrowserWindow.webContents.send()`
- HTTP/WebSocket transport implements `broadcast(eventType, data)` using WS client sends

**Trade-offs**:

- Introduces additional layer and required initialization order
- Requires careful error handling to avoid one transport failure blocking others

**Notes**:

- This is the foundation for real-time UI updates from background tasks.
- The existing BackgroundTaskService is a reference broadcaster implementation.
