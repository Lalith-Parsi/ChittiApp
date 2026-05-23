---
phase: 01-native-phone-auth-env-config
plan: 01
type: execute
wave: 0
depends_on: []
files_modified:
  - package.json
  - jest.config.js
  - .eslintrc.js
  - tests/phone.test.ts
  - tests/money.test.ts
  - tests/firebase-config.test.ts
  - tests/auth-context.test.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "Running `npm test` exits 0 with the failing-scaffold suite green"
    - "Running `npm run lint` produces actionable output (zero or counted violations) instead of 'unknown command'"
    - "ESLint blocks any new `'+91' + ` concatenation or `+91${...}` template literal in src/"
  artifacts:
    - path: tests/phone.test.ts
      provides: "Test scaffold red-by-default until src/utils/phone.ts exists"
    - path: tests/money.test.ts
      provides: "Test scaffold for Paisa branded integer"
    - path: tests/firebase-config.test.ts
      provides: "Test scaffold for env-driven Firebase config loader"
    - path: tests/auth-context.test.ts
      provides: "Smoke test that AuthContext sign-out resets user state (AUTH-04)"
    - path: jest.config.js
      provides: "jest-expo preset wiring"
    - path: .eslintrc.js
      provides: "no-restricted-syntax rule forbidding +91 hand-concatenation (Pitfall 6)"
  key_links:
    - from: package.json
      to: jest.config.js
      via: "scripts.test → jest CLI → jest-expo preset"
      pattern: "\"test\":\\s*\"jest\""
    - from: .eslintrc.js
      to: src/
      via: "npm run lint script targets src/"
      pattern: "eslint src"
---

<objective>
Land the test + lint infrastructure that every subsequent Phase 1 task depends on. Today the project has zero test files, no lint config, and no test/lint npm scripts (confirmed: package.json has only start/android/ios/web). Without this, downstream tasks cannot satisfy the Nyquist `<automated>` requirement and the `'+91'` lint rule (Pitfall 6) cannot be enforced.

Purpose: every later task in this phase asserts behavior via `npm test -- <pattern>` and the lint rule blocks the most common phone-normalization mistake before it lands in code review.
Output: Jest + jest-expo wiring, ESLint config with the Pitfall-6 rule, four red test scaffolds that downstream waves turn green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-native-phone-auth-env-config/01-CONTEXT.md
@.planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md
@.planning/research/PITFALLS.md
@.planning/codebase/STACK.md
@package.json
@AGENTS.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Install Jest + ESLint devDependencies and add npm scripts</name>
  <read_first>
    - package.json (current scripts — confirm none of test/lint exist before editing)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md §"Wave 0 Gaps" + §"Validation Architecture"
    - .planning/codebase/STACK.md (devDep state — no test or lint tooling today)
    - AGENTS.md (Expo SDK 56 pinning)
  </read_first>
  <behavior>
    - `npm test` resolves to a Jest invocation (not "missing script").
    - `npm run lint` resolves to an ESLint invocation targeting `src` with `--max-warnings=0`.
    - `npx jest --version` prints a version after install.
  </behavior>
  <action>
    Install devDeps via `npm install --save-dev jest jest-expo @types/jest ts-jest eslint @react-native/eslint-config`. Use exact versions compatible with Expo SDK 56 (jest-expo ~56.x; pin if `npx expo install` doesn't suggest a version for these devDeps, fall back to `npm install --save-dev` plain). Add two scripts to `package.json`: `"test": "jest"` and `"lint": "eslint src --max-warnings=0"`. Do NOT touch the existing `start`/`android`/`ios`/`web` scripts.
  </action>
  <verify>
    <automated>npm run lint --silent 2>&amp;1 | head -5; npm test --silent -- --listTests 2>&amp;1 | head -5; node -e "const p=require('./package.json'); if(!p.scripts.test||!p.scripts.lint) process.exit(1)"</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` `scripts.test === "jest"` and `scripts.lint === "eslint src --max-warnings=0"`.
    - `devDependencies` contains `jest`, `jest-expo`, `@types/jest`, `ts-jest`, `eslint`, `@react-native/eslint-config`.
    - `node_modules/.bin/jest` exists.
    - `node_modules/.bin/eslint` exists.
  </acceptance_criteria>
  <done>Both `npm test` and `npm run lint` resolve to real binaries; failures from config absence are surfaced (not "missing script") so Task 2 can write configs.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Write jest.config.js, .eslintrc.js, and four red test scaffolds</name>
  <read_first>
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md §"Pattern 6: ESLint rule against '+91' + concatenation" and §"Validation Architecture → Wave 0 Gaps"
    - .planning/research/PITFALLS.md Pitfall 6 (phone normalization)
    - src/lib/AuthContext.tsx (signature surface to mock in tests/auth-context.test.ts)
    - src/screens/LoginScreen.tsx lines 195–210 (current `+91${digits}` concat — lint rule MUST flag this after the rule lands; it will be removed by Plan 03)
  </read_first>
  <behavior>
    - `jest.config.js`: `preset: 'jest-expo'`, `testPathIgnorePatterns: ['/node_modules/', '/.expo/']`, transform handles ts/tsx via ts-jest or jest-expo defaults.
    - `.eslintrc.js`: `root: true`, extends `@react-native`, and contains a `no-restricted-syntax` rule that flags BOTH `'+91' + identifier` and template literals starting with `+91`.
    - `tests/phone.test.ts`: imports `toE164`, `isValidIndianMobile`, `formatNational` from `../src/utils/phone` (file does not yet exist → test fails to import, RED).
    - `tests/money.test.ts`: imports `paisa`, `toRupees`, `addPaisa` from `../src/utils/money` (does not yet exist → RED).
    - `tests/firebase-config.test.ts`: mocks `expo-constants` with empty `expoConfig.extra` and asserts `readConfig()` from `../src/lib/firebase` throws "Firebase config missing" — RED until Plan 02 lands the rewrite.
    - `tests/auth-context.test.ts`: imports `AuthProvider` + `useAuth` from `../src/lib/AuthContext`, mocks `@react-native-firebase/auth`. RED until Plan 03 swaps the import.
  </behavior>
  <action>
    Create `jest.config.js` with `preset: 'jest-expo'`, `setupFiles: []`, `testPathIgnorePatterns: ['/node_modules/','/.expo/']`, and `transformIgnorePatterns` permissive enough for `@react-native-firebase` and `firebase`. Create `.eslintrc.js` with the exact `no-restricted-syntax` rule from RESEARCH.md §Pattern 6 — both selectors (BinaryExpression and TemplateLiteral). Create the four test files listed in <files_modified>; each must contain at least one `expect()` assertion targeting the eventual API surface so they fail loudly until downstream waves implement. Add a `// TODO(plan-01-{02,03}): wire when implementation lands` comment at the top of each test. Do NOT write `.eslintignore` (default coverage is fine).
  </action>
  <verify>
    <automated>npm test -- --passWithNoTests=false 2>&amp;1 | grep -E "FAIL|Tests:" | head -20; npm run lint -- src/screens/LoginScreen.tsx 2>&amp;1 | grep -E "no-restricted-syntax|hand-concatenate" | head -5</automated>
  </verify>
  <acceptance_criteria>
    - `npm test` runs and reports 4 failing test files (RED scaffolds).
    - `npm run lint -- src/screens/LoginScreen.tsx` reports at least one `no-restricted-syntax` violation pointing at the `+91${digits}` template at LoginScreen line ~198.
    - `jest.config.js` exists with `preset: 'jest-expo'` (grep confirms).
    - `.eslintrc.js` exists and `grep -v '^//' .eslintrc.js | grep -c 'no-restricted-syntax'` returns ≥ 1.
    - Each test file in `tests/` has `expect(` appearing at least once (`grep -c 'expect(' tests/*.ts` returns positive numbers for all four).
  </acceptance_criteria>
  <done>Wave 0 gate is open: every downstream task can use `npm test -- <pattern>` for verification and the Pitfall 6 lint rule is active and already flagging the legacy LoginScreen concat that Plan 03 will rewrite.</done>
</task>

</tasks>

<verification>
- `npm test` runs (exits non-zero only because scaffold tests are intentionally red).
- `npm run lint` runs and currently flags `src/screens/LoginScreen.tsx`'s `+91${digits}` template — which is the exact code Plan 03 removes.
- No source files under `src/` are modified by this plan (only `package.json`, configs, `tests/`).
</verification>

<success_criteria>
Wave 0 unblocks every later wave's `<automated>` verification block. The lint rule provides immediate, automated enforcement of Pitfall 6 going forward.
</success_criteria>

<output>
After completion, create `.planning/phases/01-native-phone-auth-env-config/01-01-SUMMARY.md` summarizing: devDeps added, scripts added, scaffold tests created (count + names), and the lint violation count reported against `LoginScreen.tsx` (which will drop to 0 after Plan 03).
</output>
