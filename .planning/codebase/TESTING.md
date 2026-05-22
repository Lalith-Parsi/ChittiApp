# Testing Patterns

**Analysis Date:** 2026-05-22

## Test Framework

**Runner:**
- None configured. No `jest.config.*`, `vitest.config.*`, `jest-expo` preset, or other test runner is present in the repo.
- `package.json` declares no `test` script and no testing dependencies (`jest`, `@testing-library/*`, `vitest`, `detox`, `@testing-library/react-native` are all absent).
- Config: not applicable.

**Assertion Library:**
- None. Static checking is provided only by TypeScript (`strict: true` in `tsconfig.json`).

**Run Commands:**
```bash
# Not applicable — no test runner configured.
# Only build / dev scripts exist:
npm run start      # expo start
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
```

## Test File Organization

**Location:**
- No `*.test.*`, `*.spec.*`, `__tests__/`, or `e2e/` files/directories exist anywhere in the repo.

**Naming:**
- Not established. If/when tests are added, recommended Expo-aligned conventions (per Expo 56 docs) would be `*.test.ts` / `*.test.tsx` co-located beside source under `src/**` or under a sibling `__tests__/` folder.

**Structure:**
- No existing structure to document.

## Test Structure

**Suite Organization:**
- Not applicable — no tests exist.

**Patterns:**
- Not applicable.

## Mocking

**Framework:** None configured.

**Patterns:**
- Not applicable. The codebase has no test doubles, fakes, or mock factories.

**What to Mock (recommendation for future tests):**
- Firebase modules (`src/lib/firebase.ts`, `src/lib/firestore.ts`) — they instantiate live Firebase clients at import time
- `@react-native-async-storage/async-storage` — already has an official mock via `jest-expo`
- `expo-auth-session`, `expo-web-browser` — native module shims
- `react-native-gesture-handler` and `react-native-screens` — typically mocked via the `jest-expo` preset

**What NOT to Mock (recommendation):**
- Pure utility functions in `src/utils/chitti.ts` — they are deterministic and side-effect-free; test them directly
- Type-only modules (`src/types/index.ts`)
- Theme constants (`src/lib/theme.ts`)

## Fixtures and Factories

**Test Data:**
- No fixtures exist.
- Domain shapes that would need factories: `ChittiGroup`, `Member`, `Cycle`, `Payment` (defined in `src/types/index.ts`).

**Location:**
- Not established.

## Coverage

**Requirements:** None. No coverage tool, threshold, or CI gate is configured.

**View Coverage:**
- Not applicable.

## Test Types

**Unit Tests:**
- None. The most test-ready surface is `src/utils/chitti.ts` (pure functions: `initializeCycles`, `syncCyclePayments`, `getEligibleMembers`, `calculateDividend`, `getPaidCount`, `getPendingMembers`, `getCycleMonth`, `getCurrentCycle`, `getCompletedCycles`).

**Integration Tests:**
- None. Firestore data access in `src/lib/firestore.ts` and the `src/storage/index.ts` shim are untested.

**E2E Tests:**
- None. No Detox, Maestro, Playwright, or Cypress configuration. No `e2e/` directory.

## Common Patterns

**Async Testing:**
- Not applicable.

**Error Testing:**
- Not applicable. The only thrown error in the codebase is `throw new Error('Not authenticated')` in `src/storage/index.ts:9`, which would be a natural first unit-test target.

## Manual Verification (current de facto QA)

The project currently relies entirely on manual verification via `expo start` on web / iOS / Android. There is:

- No CI workflow (`.github/workflows/` is absent)
- No pre-commit hook (no `husky/`, `.husky/`, or `lint-staged` config)
- No type-check script in `package.json` (TypeScript errors surface only when invoked manually via `npx tsc --noEmit`)

## Gaps Worth Flagging

- Auth flows in `src/screens/LoginScreen.tsx` (Google popup, phone+OTP via reCAPTCHA) have no automated coverage
- The Firestore shim pattern in `src/storage/index.ts` swallows the UID assumption and is untested against the `Not authenticated` path
- Domain math in `src/utils/chitti.ts` (cycle dividends, payment sync) ships without regression protection — highest-value target for first unit tests

---

*Testing analysis: 2026-05-22*
