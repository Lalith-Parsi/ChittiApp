---
phase: 01-native-phone-auth-env-config
plan: 01-test-infra
subsystem: tooling
tags: [jest, eslint, test-infra, wave-0]
dependency_graph:
  requires: []
  provides:
    - "npm test (jest)"
    - "npm run lint (eslint src --max-warnings=0)"
    - "Pitfall-6 lint rule (no-restricted-syntax against '+91' concat / templates)"
    - "4 RED test scaffolds gating plans 01-02..01-04"
  affects:
    - "package.json (scripts + devDeps)"
tech-stack:
  added:
    - jest ^29.7.0
    - jest-expo ^56.0.4
    - "@types/jest ^30.0.0"
    - ts-jest ^29.4.11
    - eslint ^8.57.1
    - "@react-native/eslint-config ^0.85.3"
    - "@typescript-eslint/parser ^8.59.4 (deviation — needed for .tsx parsing)"
    - "@typescript-eslint/eslint-plugin ^8.59.4 (deviation — paired with parser)"
  patterns:
    - "jest-expo preset + permissive transformIgnorePatterns for @react-native-firebase + firebase"
    - "no-restricted-syntax with two selectors: BinaryExpression for '+91'+X and TemplateLiteral for `+91${...}`"
key-files:
  created:
    - jest.config.js
    - .eslintrc.js
    - tests/phone.test.ts
    - tests/money.test.ts
    - tests/firebase-config.test.ts
    - tests/auth-context.test.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - "Installed @typescript-eslint/parser+plugin (deviation Rule 3 — blocking): plain ESLint cannot parse .tsx; .eslintrc.js depends on a TypeScript parser to evaluate the no-restricted-syntax rule on src/screens/LoginScreen.tsx. RESEARCH.md §Wave 0 Gaps listed these as planned devDeps; plan task body said 'fall back to npm install --save-dev plain' for unsupported versions, which is what we did."
  - "Used TemplateElement value.cooked instead of value.raw for the template-literal selector — value.raw is the un-escaped source and matches +91 fine, but value.cooked matched both the unescaped and any potential escaped variants cleanly. Confirmed flags LoginScreen.tsx line 85 with one error."
  - "Tests in /tests at repo root (not __tests__ colocated) — keeps test code out of the production bundle and matches what plans 01-02..01-04 already reference."
metrics:
  duration_minutes: ~10
  completed: 2026-05-24
---

# Phase 1 Plan 1: Test + Lint Infrastructure — Summary

Wave 0 infra: every later Phase 1 task can now verify behavior via `npm test -- <pattern>` and the Pitfall-6 `'+91'` lint rule is already enforcing the project's E.164 contract.

## What Shipped

| Item | File | Status |
|---|---|---|
| Jest runner wired to Expo preset | `jest.config.js` | New |
| ESLint with Pitfall-6 rule | `.eslintrc.js` | New |
| `npm test`, `npm run lint`, `npm test:watch` scripts | `package.json` | Added |
| 6 new devDeps (4 from plan + 2 deviation) | `package.json` | Added |
| 4 RED test scaffolds | `tests/*.test.ts` | New |

## Tasks Completed

| # | Task | Commit |
|---|---|---|
| 1 | Install Jest + ESLint devDeps and add npm scripts | `9e08e88` |
| 2 | Write jest.config.js, .eslintrc.js, four red test scaffolds | `d269d3a` |

## Verification Results (Wave 0 gate)

- `npm test` → 4 test suites RED (intentional). All 4 fail to load because:
  - `tests/phone.test.ts` — cannot resolve `../src/utils/phone` (lands in plan 01-03)
  - `tests/money.test.ts` — cannot resolve `../src/utils/money` (lands in plan 01-03)
  - `tests/firebase-config.test.ts` — `src/lib/firebase.ts` does not throw on missing config yet (rewrite in plan 01-02)
  - `tests/auth-context.test.ts` — cannot resolve `@react-native-firebase/auth` (installed in plan 01-04)
- `npm run lint` → flags **1 violation** at `src/screens/LoginScreen.tsx:85` (the `\`+91${digits}\`` template literal). Plan 01-04's native-auth swap removes this and the violation count goes to 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @typescript-eslint/parser + @typescript-eslint/eslint-plugin**
- **Found during:** Task 2 verification
- **Issue:** Plan listed `eslint` + `@react-native/eslint-config` as the lint devDeps, but ESLint cannot parse `.tsx` (or even the TS syntax in `LoginScreen.tsx`) without a TypeScript parser. Without this, `npm run lint -- src/screens/LoginScreen.tsx` errored with "Parsing error: Unexpected token" before the no-restricted-syntax rule could fire — meaning the Pitfall-6 gate would have silently no-op'd.
- **Fix:** Installed `@typescript-eslint/parser@^8.59.4` and `@typescript-eslint/eslint-plugin@^8.59.4` as devDeps; set `parser: '@typescript-eslint/parser'` in `.eslintrc.js`. Plan task wording explicitly allowed deviation ("fall back to `npm install --save-dev` plain").
- **Files modified:** `package.json`, `package-lock.json`, `.eslintrc.js`
- **Commit:** `d269d3a`

**2. [Rule 3 - Blocking] Added `test:watch` script**
- **Found during:** Task 1 — plan-specific-notes called for `test`, `test:watch`, `lint`. Plan task 1 body only mentioned `test` + `lint`. Added all three per plan-specific-notes.
- **Files modified:** `package.json`
- **Commit:** `9e08e88`

## Self-Check: PASSED

- File `jest.config.js` — FOUND
- File `.eslintrc.js` — FOUND
- File `tests/phone.test.ts` — FOUND
- File `tests/money.test.ts` — FOUND
- File `tests/firebase-config.test.ts` — FOUND
- File `tests/auth-context.test.ts` — FOUND
- Commit `9e08e88` — FOUND
- Commit `d269d3a` — FOUND

## Known Stubs

None — all four scaffold tests reference real, intended downstream API surface. They are RED **by design** and become GREEN as plans 01-02..01-04 land.

## Threat Flags

None. This plan adds only test + lint tooling; no network, auth, file-access, or schema surface is introduced.

## What Unblocks

- Plan 01-02 (config + deps): can now write `src/lib/firebase.ts` so that `tests/firebase-config.test.ts` turns GREEN.
- Plan 01-03 (helpers): can implement `src/utils/phone.ts` + `src/utils/money.ts` to turn the phone + money scaffolds GREEN.
- Plan 01-04 (native auth swap): can install `@react-native-firebase/auth` + rewrite `LoginScreen.tsx` to turn the auth-context scaffold GREEN *and* drop the LoginScreen lint violation to zero.
