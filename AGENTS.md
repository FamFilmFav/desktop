# Family Watch Night

A cross-platform app for managing movie selection for a Family Watch Night

## Agent Workflow Guidance

**CRITICAL: Agents should err on the side of asking for human guidance. Before considering any work complete, check in via chat.**

### Checkpoint Strategy

- **After each major change**: Ask for feedback on the direction and implementation
- **Before completing a task**: Verify the solution matches expectations, ask if anything should be adjusted
- **On scope questions**: If unsure whether to expand/reduce scope, ask first
- **Implementation choices**: When multiple valid approaches exist, surface them for human decision-making
- **Documentation Updates**: Always use chat to propose documentation changes before implementing them
- **Phase/Task Completion**: Never declare phases, stages, or tasks as "complete" unilaterally. Always check in via chat to confirm completion status and receive guidance on next steps.

**Never assume work is done. Always ask.**

### Interaction Patterns

**Chat Usage:**

- **Documentation Changes**: All updates to AGENTS.md, DECISIONS.md, ARCHITECTURE_ANALYSIS.md must be proposed and refined in chat before implementation
- **Complex Decisions**: When multiple valid approaches exist, surface them in chat for human decision-making
- **Scope Clarification**: Use chat to confirm understanding of requirements and scope before proceeding with implementation
- **Phase/Task Completion**: Never declare phases, stages, or tasks as "complete" unilaterally. Always check in via chat to confirm completion status and receive guidance on next steps.

---

# Testing in Family Watch Night

## Test Architecture Overview

This project uses a three-layer BDD architecture inspired by _BDD in Action_:

1. **Business Logic Layer** (`tests/bdd/business-logic/`): Feature files and step definitions that express business scenarios in domain language
2. **Business Flow Layer** (`tests/bdd/business-flow/personas/`): Persona classes (e.g., `InternalSystemPersona`, `UnauthenticatedUser`) that translate domain intent into actionable steps
3. **Technical Layer** (`tests/bdd/technical/`): Test hooks, infrastructure, and low-level integrations with the app

**Key principle**: Business Logic steps must not call the Technical layer directly. They go through personas, which maintain a stable domain-facing API for test scenarios.

### UI Testing Levels

UI tests are structured into two levels of granularity:

1. **Component-Level Testing**: Validates individual UI components in isolation using test-only pages
   - Tests component behavior and interactions
   - Uses test-only pages excluded from production builds (similar to test hooks)
   - Focuses on component functionality rather than user workflows
   - Builds test pages as real application pages using the same production layout components (`Page`, `Section`, etc.)
   - Includes live controls within the page so tests verify real app composition, not isolated wrapper components
   - Test pages are sourced from `src/renderer/testing-active/components/pages/` and registered through `src/renderer/testing-active/index.tsx`

2. **User Experience Testing**: Validates end-to-end user workflows across multiple pages
   - Tests complete user journeys and page transitions
   - Uses domain-level language ("navigate to settings") rather than implementation details
   - Focuses on what users accomplish, not how they accomplish it

### Transport Abstraction

UI tests support dual transport modes controlled by `RENDER_LOCATION` environment variable:

- **Electron mode** (`RENDER_LOCATION=electron`): Tests against Electron's built-in BrowserWindow
- **Browser mode** (`RENDER_LOCATION=browser`): Tests against external browser connecting to Express server

### UI Automation-Friendly Selectors

- When building UI, assign stable, semantic `data-testid` attributes to interactive controls and page roots.
- Use `data-testid` for buttons, menu items, links, inputs, tabs, dialogs, and any element the UI test must click or inspect.
- Keep selectors independent of visible text and translations. For example:
  - `data-testid="menu-settings"`
  - `data-testid="page-settings"`
  - `data-testid="settings-save-button"`
  - `data-testid="settings-display-name-input"`
- Avoid introducing a second layer of human-readable translation between `.feature` text and selector keys. Use the selector keys directly in feature files when those keys are already stable and human-readable.
- Treat `data-testid` as part of the UI contract, not only a testing concern. This makes page objects and tests stable even when i18next text changes.
- Page objects should consume these stable IDs rather than using localized text selectors.

## Test Structure

- **Unit tests** (Jest): Located in `tests/unit/`, for isolated business logic
  - Execute: `npm run test:unit`
- **Feature tests** (Cucumber/BDD): Located in `tests/bdd/`
  - Execute: `npm run test:features`
  - Execute UI tests in Electron: `npm run test:features`
  - Execute UI tests in Browser: `npm run test:features:browser`
  - Feature scenarios in `tests/bdd/business-logic/features/`
  - Step definitions in `tests/bdd/business-logic/steps/`
  - Personas (domain-facing APIs) in `tests/bdd/business-flow/personas/`.
    - `internal-system.ts` used for interacting at the system level without the UI
    - `UserPersona.ts`: base class for interacting with the UI. Default implementations go here, with any persona-specific overrides in classes that extend.
  - Page objects (UI interaction details) in `tests/bdd/technical/page-objects/`
  - Test hooks and infrastructure in `tests/bdd/technical/`

### Test Infrastructure Components

**UI Testing Technical Infrastructure** (`tests/bdd/technical/`):

- **Playwright Configuration** (`playwright-config.ts`): Centralized Playwright setup for both transports
- **Page Objects** (`page-objects/`): `BasePage` and concrete page classes (`HomePage`, `SettingsPage`, etc.)
- **UI Utilities** (`infrastructure/ui-utils.ts`): Cross-cutting UI testing functions (screenshots, waiting, window management)
- **Component Test Pages**: Build pages in `src/renderer/testing-active/components/pages/` using the same renderer page framework as production pages, then register them in `src/renderer/testing-active/index.tsx`.

**System Testing Infrastructure** (`tests/bdd/technical/infrastructure/`):

- **System Utilities** (`utils.ts`): Functions for interacting with system-level test hooks
- **UI Utilities** (`ui-utils.ts`): Functions for UI testing concerns (parallel to `utils.ts`)

## Test State Management

Tests store scenario-specific data using a hierarchical state store via `world.getStateStore(namespace)`. This allows:

- **Keyed state**: Store multiple instances by key (e.g., `state.roles.set('editor', role)`)
- **Last-created state**: Store the most recent instance for un-keyed access (e.g., `state.lastRole`)

When adding features with stateful test scenarios, use this pattern to maintain separation between setup/helpers and the scenario context.

## Test Hooks

- Service logic cannot be tested via Jest unit tests because it runs inside the Electron main process
- Testing hooks, exposed only for integration testing, live in `src/main/testing-active`
- The `InternalSystemPersona` in `tests/bdd/business-flow/personas/internal-system.ts` uses test APIs in `tests/bdd/technical/hooks` to call those hooks that run in the Electron main process
- UI testing uses Playwright for browser automation with transport abstraction
- Only serializable data can cross the hook boundary from Cucumber to Electron
- NEVER, under any circumstances, change anything in `src/main/testing`. That folder's contents is overwritten at build time.
- If any compile, build, or test failure points to a problem in `src/main/testing` and you believe that you need to change a file in that folder to resolve the error, instead make the change to the equivalent file in the `src/main/testing-active` folder. Those files will be copied into `src/main/testing` at build time, so your changes there will take effect at the next build.
- Component test pages also live in `testing-active`; they are copied into `src/renderer/testing/` for integration builds by `use-testing-active.js` and should be built like normal renderer pages.

## Validation Flow

When writing tests:

1. **Before writing the first test**: Ask to validate the test approach and confirm test coverage strategy
2. **Before each test scenario**: Ask to validate the previous test worked as intended
3. **Never assume test completeness**: Verify sufficient coverage with human before marking done
4. **Test Architecture Compliance**: Ensure Business Logic layers do not directly call Technical layers; route through personas
5. **State Isolation**: Confirm test state is properly isolated between runs and namespaced appropriately
6. **Persona Contract**: Ensure persona methods match test hook expectations and are stable for step definitions
7. **UI Transport Testing**: Test both `RENDER_LOCATION=electron` and `RENDER_LOCATION=browser` for UI features
8. **Integration hook validation**: Use `npm run build:main:for-integration-testing` when modifying `src/main/testing-active/TestHooksImpl.ts` or related test hooks so compile-time mismatches are caught before running feature tests.

---

# Agent Implementation Guidance

---

# Architecture

- Typescript-based Electron app whose UI is exposed both using Electron's built-in renderer and via HTTP using an express server.
- Main process logic is not exposed to the renderer directly through IPC. Instead, it is bundled into a service under `./src/main/services`. Then, it is exposed through both IPC and HTTP through classes in `./src/main/api-server`. The renderer process consumes those services using either an IPC or HTTP client that exists in `./src/renderer/api-client`.

## Core Services (`./src/main/services/`)

- **MovieService**: Movie database CRUD and search
- **SettingsService**: Application settings persistence
- **BackgroundTaskService**: Async task management (imports, etc.)
- **LocalizationService**: i18n and locale management

Each service is pure business logic, completely decoupled from transport (IPC or HTTP).

## Dual Transport Pattern (HTTP + IPC)

The same service instances are exposed through TWO transports:

- **HTTP** (via Express): Exposed on a configurable port (in settings), localhost-only with rate-limiting (100 req/min)
  - Used when accessing the app through a browser window
- **IPC** (Electron): For native app communication between main and renderer processes
  - Used when accessing the app through the Electron window

The renderer's API client automatically detects its environment and selects the appropriate transport. This means the same React components are designed to work seamlessly whether launched in Electron or in a browser.

## Database

- **better-sqlite3**: Embedded, synchronous, platform-specific storage paths
- **Migrations-based**: Auto-run migrations on startup from `./src/main/db/migrations/`
- **Models layer**: Handles type conversion (e.g., boolean ↔ 0/1)

## Main Process Files

- **index.ts**: Startup orchestration (i18n → DB → tray → window → servers)
- **window-manager.ts**: Keeps window singleton, enforces preload security
- **api-server.ts**: HTTP + IPC server setup
- **ipc-handlers.ts**: Registers IPC event handlers
- **server.ts**: Express setup with rate limiting and security

---

# Testing

### Test Structure

- **Unit tests** (Jest): Located in `tests/unit/`, for isolated business logic
  - Execute: `npm run test:unit`
- **Feature tests** (Cucumber/BDD): Located in `tests/bdd/`
  - Execute: `npm run test:features`
  - Execute UI tests in Electron: `npm run test:features`
  - Execute UI tests in Browser: `npm run test:features:browser`
  - Always run feature tests through the npm scripts rather than invoking `cucumber-js` directly, so the active testing pages and required build hooks are applied.
  - When running a specific feature subset, pass tags through the npm script, for example:
    - `npm run test:features -- --tags "@ui and @form-controls"`
  - Feature scenarios in `tests/bdd/business-logic/features/`
  - Step definitions in `tests/bdd/business-logic/steps/`
  - Personas (domain-facing APIs) in `tests/bdd/business-flow/personas/`.
    - `internal-system.ts` used for interacting at the system level without the UI
    - `UserPersona.ts`: base class for interacting with the UI. Default implementations go here, with any persona-specific overrides in classes that extend.
  - Page objects (UI interaction details) in `tests/bdd/technical/page-objects/`
  - Test hooks and infrastructure in `tests/bdd/technical/`

### Test Hooks

- Service logic cannot be tested via Jest unit tests because it runs inside the Electron main process
- Testing hooks, exposed only for integration testing, live in `src/main/testing-active`
- The `InternalSystemPersona` in `tests/bdd/business-flow/personas/internal-system.ts` uses test APIs in `tests/bdd/technical/hooks` to call those hooks that run in the Electron main process
- UI testing uses Playwright for browser automation
- Only serializable data can cross the hook boundary from Cucumber to Electron
- NEVER, under any circumstances, change anything in `src/main/testing`. That folder's contents is overwritten at build time.
- If any compile, build, or test failure points to a problem in `src/main/testing` and you believe that you need to change a file in that folder to resolve the error, instead make the change to the equivalent file in the `src/main/testing-active` folder. Those files will be copied into `src/main/testing` at build time, so your changes there will take effect at the next build.

### Validation Flow

Before writing tests:

1. Get approval on test approach and coverage strategy
2. For each test, get validation before moving to the next one
3. Check in before marking test work complete

---

# Documentation Strategy

This project uses structured documentation to prevent stale guidance and capture decisions. Agents should actively maintain these documents during their work.

## Key Documents

- **ARCHITECTURE_ANALYSIS.md**: "Living" documentation of system design, application architecture, and how testing infrastructure integrates with the main application
- **DECISIONS.md**: Record of significant architectural and implementation decisions (created as-needed)
- **AGENTS.md**: This file — agent workflow, conventions, testing patterns, and guidance

## Agent Approach to Documentation

**At the start of work:**

- Check if ARCHITECTURE_ANALYSIS.md and DECISIONS.md are still aligned with the current request
- If you notice a discrepancy between documented decisions and what you're asked to do, raise it via chat
- The human may want to override the documented decision, update documentation, or clarify the request

**During work:**

- Monitor for architectural changes, new patterns, or significant decisions
- Note what might need documentation updates

**At the end of work:**

- Near completion, mention via chat: "I notice the following documentation may need updates: [list]"
- Wait for human approval before making changes
- Update ARCHITECTURE_ANALYSIS.md if architecture/patterns changed
- Create or update DECISIONS.md entries only with human guidance
- Handle document updates as the final step before marking work complete

**Key principle:** Documentation updates should happen in chat discussion, not autonomously.

---

# Implementation Guidelines

## Validation and Testing Protocol

After any substantive code change, immediately run relevant tests (unit, smoke, feature) to validate functionality. If tests fail, iterate up to three targeted fixes; if still failing, summarize root cause and options.

## Exploration Strategy

When researching complex questions or searching large codebases, use the Explore subagent for thorough, read-only investigations to avoid cluttering the main conversation.

## Dependency Management

Prefer minimal, pinned, widely-used libraries. Always update package manifests and lockfiles appropriately when adding dependencies.

## Code Generation Standards

For non-trivial code generation, produce complete runnable solutions including source files, minimal runner/test harness, README with usage/troubleshooting, and updated dependency manifests.

## Security Integration

When implementing features, always import and use security functions from `src/main/security/` (e.g., `safeJoin`, `assertPathInsideAllowedDirs`). Validate, normalize, and bounds-check all user inputs.

## Build and Environment Awareness

Before assuming build requirements or project structure, verify by checking common config files (package.json, etc.) or quick exploration. Adapt to existing patterns.

## Memory Usage Guidelines

Actively consult and update user/session/repo memories for patterns, preferences, and lessons learned. Record mistakes that could be common.

## Question-Asking Protocol

When multiple approaches exist or scope is unclear, use the vscode_askQuestions tool to gather user preferences before proceeding.

## Response Formatting

Keep answers short and impersonal. Use proper Markdown, KaTeX for math, and strict file linkification rules (no backticks on paths, use [path](path) format).

## Error Handling

Never invent APIs, paths, or commands; verify with tools first. If uncertain, gather context before acting.

## File Placement and Directory Structure Analysis

When creating new files (especially tests, components, or features), first examine the directory structure of existing similar files to identify established patterns. Check for subdirectories and naming conventions used for related functionality. If the appropriate location isn't immediately clear from existing patterns, ask for clarification before creating files. Document and follow the project's directory hierarchy conventions (e.g., test features in subdirectories under `tests/component/` like `smoke/` or `workflows/`).

## Test Organization Conventions

- Unit tests: Place in `tests/unit/` with descriptive names.
- Feature tests: Place feature files and steps in appropriate subdirectories under `tests/component/` (e.g., `smoke/` for health checks, `workflows/` for business logic flows).
- Avoid placing new test files at the root level of test directories unless that's the established pattern for that type.

## Naming and Export Conventions

Examine existing file names, class names, and export patterns for similar functionality. Ensure consistency in naming: e.g., Service classes use singular nouns (MovieService, UserService), Model classes follow established plural/singular patterns (MoviesModel, UsersModel). Check export styles: Use named exports for services (export class ServiceName), default exports for models if that's the pattern.

## Implementation Pattern Matching

Analyze how existing classes handle dependencies: e.g., avoid constructor dependency injection if other services use lazy binding via factory methods like `getModels()`. Compare method signatures and implementations: Look at how CRUD operations, error handling, and data flow are structured in similar classes. Follow established architectural patterns: e.g., services as pure business logic without transport concerns, models handling type conversion.

## Code Structure Review Checklist

Before finalizing a new class or file, cross-reference with 2-3 similar existing implementations. Verify that constructor patterns, method organization, and data access match the established style. If patterns conflict or aren't clear, ask for clarification on the preferred approach.

## Test Quality Guidelines

Avoid creating tests that don't actually validate the behavior they claim to test. Tests should provide genuine confidence in functionality, not false positives. Placeholder tests for future features should be clearly marked and not included in test suites until they can perform meaningful validation. Focus on tests that verify specific, observable outcomes rather than just checking that methods exist or return non-null values.

---

# Development Commands

```pwsh
npm run dev             # Concurrent build:watch + vite + debug (development)
npm run test:unit       # Jest unit tests
npm run tests:features  # Cucumber feature tests
npm run test            # All tests
npm run build           # Full production build (slow - includes signing)
npm run pack            # Production build without final executable/installer (faster validation)
npm run build:main      # Main process TypeScript compilation only
npm run build:renderer  # Renderer process build only
```

**Build Validation Guidance**: For development validation, use `npm run build:main` for quick TypeScript checking of the main process, or `npm run pack` for comprehensive build validation without the slow code signing step. Reserve `npm run build` for final production releases.

**Pattern Research**: Before implementing new features, thoroughly examine existing similar implementations to understand established patterns and conventions.

---

# Key Patterns & Conventions

- **Barrel exports**: Each directory exports key classes in `index.ts`
- **Idempotent IPC**: Handlers can be removed/re-added safely
- **Error handling**: HTTP routes consistently wrap and return errors
- **Security**: Path guards prevent traversal, locale normalization prevents injection
- **Task registry**: Use string constants for task type identifiers
- **Event notification manager**: Use a central manager to register service-level callbacks and broadcast to both IPC and HTTP/WebSocket transport layers. Services (e.g., `BackgroundTaskService`) are broadcasters, transports are subscribers.

## Localization (i18next)

All user-facing text must be translatable:

- Text exposed in UI should use i18next keys, not hardcoded strings
- LocalizationService manages locale switching and translation loading
- Locale files live in `./assets/locales/{locale}/` as JSON (e.g., `en/common.json`, `dev/common.json`)
- **When adding new translation keys, update BOTH `en` and `dev` locale files**
- `dev` text is the English text with underscores (\_\_\_) affixed to the start and end for easy identification

## Security

Security is built into the architecture through multiple defense-in-depth layers. All file operations and user input processing should follow established patterns.

### Key Security Functions (`src/main/security/`)

- **`safeJoin(base, ...segments)`** – Safely joins path segments while preventing path traversal attacks
- **`assertPathInsideAllowedDirs(unsafePath, safeRoot?)`** – Protects against path traversal and arbitrary file writes
- Additional functions for normalization and symlink protection

**Always use these functions for file operations.** Do not construct paths manually.

### Security Patterns in Practice

LocalizationService demonstrates comprehensive security:

- **Input validation** → Normalize and strictly validate all user input (language codes, namespaces)
- **Defense-in-depth** → Combine `safeJoin()` + `assertPathInsideAllowedDirs()` for path operations
- **Injection prevention** → Block prototype pollution keys (`__proto__`, `constructor`, `prototype`)
- **Bounds checking** → Enforce length limits (max key length: 1024, max segments: 100)
- **Mode checks** → Verify environment before allowing sensitive operations (e.g., no writes in production)
- **Race condition protection** → Use per-file write queues for concurrent operations

### When Implementing Features

1. **File operations** → Import `src/main/security` and use `safeJoin()`, `assertNoSymlinkEscape()`
2. **User input** → Validate, normalize, and bounds-check all inputs before use
3. **IPC surface** → Minimize exposure in `preload.ts`, only expose necessary functions
4. **HTTP server** → Relies on localhost-only host validation and rate limiting (100 req/min)

### Suggesting Security Improvements

If you identify security gaps or missing validation patterns:

1. Flag via chat before implementing
2. Propose additions to `src/main/security/` library for reusable functions
3. Reference CodeQL findings or security best practices in your proposal

See [DECISIONS.md](DECISIONS.md#4--security-first-architecture-with-defense-in-depth) for architectural security decisions.
