---
phase: 01-native-phone-auth-env-config
plan: 02
type: execute
wave: 1
depends_on: [01]
files_modified:
  - package.json
  - app.config.ts
  - app.json
  - .env.example
  - .env
  - .gitignore
  - src/lib/firebase.ts
  - GoogleService-Info.plist
  - google-services.json
autonomous: true
requirements: [DATA-04]
must_haves:
  truths:
    - "No file under src/ contains the literal hardcoded apiKey AIzaSyAoiSLbntckQuqepwHGzJ-xHCQVN6NLh_I"
    - "app.config.ts (not app.json) is the active Expo config — running `npx expo config --type public` resolves it"
    - "src/lib/firebase.ts throws a loud, named error when Constants.expoConfig.extra.firebase is missing rather than silently mis-initializing"
    - "Firebase config plugin entries for @react-native-firebase/app + @react-native-firebase/auth are registered in app.config.ts plugins array"
    - "expo-build-properties is configured with ios.useFrameworks='static' AND ios.forceStaticLinking=['RNFBApp','RNFBAuth'] (Pitfall A — mandatory on RN 0.84+ / Expo SDK 54+)"
  artifacts:
    - path: app.config.ts
      provides: "Single source of Expo config; reads EXPO_PUBLIC_FIREBASE_* env vars into extra.firebase; registers RNFirebase + expo-build-properties plugins"
    - path: src/lib/firebase.ts
      provides: "readConfig() loader that throws on missing keys; exports db (Firestore JS SDK still) and default app; auth export REMOVED"
    - path: .env.example
      provides: "Committed placeholder for all six EXPO_PUBLIC_FIREBASE_* vars + GOOGLE_SERVICES paths"
    - path: .gitignore
      provides: "Excludes .env, google-services.json, GoogleService-Info.plist"
  key_links:
    - from: app.config.ts
      to: process.env.EXPO_PUBLIC_FIREBASE_*
      via: "extra.firebase mapping at config-evaluation time"
      pattern: "process\\.env\\.EXPO_PUBLIC_FIREBASE_"
    - from: src/lib/firebase.ts
      to: Constants.expoConfig.extra.firebase
      via: "readConfig() reads at module init"
      pattern: "Constants\\.expoConfig\\?\\.extra"
    - from: app.config.ts plugins
      to: "@react-native-firebase/app"
      via: "plugins array entry — required for native module link at prebuild"
      pattern: "@react-native-firebase/app"
---

<objective>
Land DATA-04 (env-driven Firebase config) and install the native auth dependency chain. Per RESEARCH.md "Migration Sequence" these MUST land together because EAS Build evaluates `app.config.ts` once and embeds `extra` into the binary — splitting config edits from plugin registration risks an intermediate broken state.

Purpose: closes DATA-04, makes the Firebase API key publicly committed to GitHub no longer source-code, and registers every native module the auth swap (Plan 03) needs.
Output: native deps in package.json, `app.config.ts` replacing `app.json`, gitignored secret files, rewritten `firebase.ts` that fails loudly on missing config. The DATA-04 unit test scaffold from Plan 01 turns GREEN.
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
@.planning/codebase/ARCHITECTURE.md
@package.json
@app.json
@src/lib/firebase.ts
@AGENTS.md
</context>

<interfaces>
<!-- Contracts downstream plans (especially Plan 03) consume from this plan -->

From `src/lib/firebase.ts` (after rewrite):
```ts
export const db: Firestore;          // still from firebase/firestore (JS SDK) — Phase 1 keeps Firestore on JS SDK per RESEARCH §Runtime State Inventory
export default app: FirebaseApp;
// IMPORTANT: `auth` export is REMOVED. Consumers must `import auth from '@react-native-firebase/auth'` and call `auth()`.
```

From `app.config.ts`:
```ts
extra.firebase: {
  apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId  // all strings, all from EXPO_PUBLIC_FIREBASE_* envs
}
```

From `.env.example` (committed placeholders — real values in gitignored `.env`):
- EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, EXPO_PUBLIC_FIREBASE_PROJECT_ID, EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, EXPO_PUBLIC_FIREBASE_APP_ID, GOOGLE_SERVICES_JSON, GOOGLE_SERVICE_INFO_PLIST
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Install native Firebase + build-properties + libphonenumber-js + dev-client</name>
  <read_first>
    - package.json (current deps — Expo SDK ~56.0.3, RN 0.85.3, firebase ^12.13.0 already present)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md §"Standard Stack" (version table) and §"Migration Sequence" Wave 1
    - AGENTS.md (SDK 56 pinning)
  </read_first>
  <action>
    Install via `npx expo install` so Expo picks SDK-56-compatible versions:
    `npx expo install @react-native-firebase/app @react-native-firebase/auth expo-dev-client expo-build-properties`
    Then `npm install libphonenumber-js`.
    Then `npm install --save-dev eas-cli`.
    Do NOT remove the existing `firebase` dep (RESEARCH §Runtime State Inventory — Firestore stays on JS SDK for Phase 1). Do NOT add `@react-native-async-storage/async-storage` for auth persistence — RNFirebase auto-persists natively (RESEARCH §"Don't Hand-Roll" + Anti-Pattern: do not add `getReactNativePersistence`).
  </action>
  <verify>
    <automated>node -e "const p=require('./package.json'); const need=['@react-native-firebase/app','@react-native-firebase/auth','expo-dev-client','expo-build-properties','libphonenumber-js']; const miss=need.filter(n=>!p.dependencies[n]); if(miss.length){console.error('Missing:',miss); process.exit(1)} console.log('OK')"; node -e "const p=require('./package.json'); if(!p.devDependencies['eas-cli']) process.exit(1)"</automated>
  </verify>
  <acceptance_criteria>
    - `package.json` `dependencies` contains all of: `@react-native-firebase/app`, `@react-native-firebase/auth`, `expo-dev-client`, `expo-build-properties`, `libphonenumber-js`.
    - `package.json` `devDependencies` contains `eas-cli`.
    - `firebase` dep is STILL present (do not remove this phase).
    - `node_modules/@react-native-firebase/auth/package.json` exists.
  </acceptance_criteria>
  <done>Native dep chain installed; downstream tasks in this plan can register the config plugins.</done>
</task>

<task type="auto">
  <name>Task 2: Create app.config.ts, delete app.json, create .env + .env.example, update .gitignore</name>
  <read_first>
    - app.json (current contents — must be ported faithfully to app.config.ts before delete)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md §"Pattern 1: RNFirebase config plugin in app.config.ts" (full file template) and §"`.env.example` (committed)"
    - .planning/research/PITFALLS.md (Pitfall B: app.config.ts + app.json silent merge)
    - .gitignore (current contents — must add .env, google-services.json, GoogleService-Info.plist)
  </read_first>
  <action>
    Create `app.config.ts` at repo root following RESEARCH.md §Pattern 1 verbatim — but port any iOS/Android/scheme/icon fields from the existing `app.json` into it first so nothing is lost. Plugins array MUST contain: `'expo-font'`, `'@react-native-firebase/app'`, `'@react-native-firebase/auth'`, `'expo-dev-client'`, and the `['expo-build-properties', { ios: { useFrameworks: 'static', forceStaticLinking: ['RNFBApp','RNFBAuth'] } }]` tuple (Pitfall A — mandatory on RN 0.84+). `extra.firebase` reads from `process.env.EXPO_PUBLIC_FIREBASE_*` for all six keys. After `app.config.ts` is committed and parses (`npx expo config --type public` succeeds), DELETE `app.json` (Pitfall B). Create `.env.example` with the exact six EXPO_PUBLIC_FIREBASE_* placeholders + GOOGLE_SERVICES_JSON / GOOGLE_SERVICE_INFO_PLIST from RESEARCH §".env.example (committed)". Create `.env` with the REAL values from the current `src/lib/firebase.ts` literal (this `.env` MUST be gitignored). Append to `.gitignore`: `.env`, `google-services.json`, `GoogleService-Info.plist`, `/ios/`, `/android/`. Use Claude's discretion (per CONTEXT.md) to commit `.env.example` — yes, do commit it.
  </action>
  <verify>
    <automated>test -f app.config.ts &amp;&amp; ! test -f app.json &amp;&amp; echo "config-switch OK"; npx expo config --type public 2>&amp;1 | grep -E "firebase|RNFB|forceStaticLinking" | head -10; grep -E "^\.env$|^google-services\.json$|^GoogleService-Info\.plist$" .gitignore | wc -l</automated>
  </verify>
  <acceptance_criteria>
    - `app.config.ts` exists; `app.json` does NOT exist (Pitfall B avoidance).
    - `npx expo config --type public` exits 0 and its JSON contains `extra.firebase.projectId`.
    - `grep -c "@react-native-firebase/app" app.config.ts` ≥ 1.
    - `grep -c "forceStaticLinking" app.config.ts` ≥ 1 and the value array contains both `RNFBApp` and `RNFBAuth`.
    - `.gitignore` contains lines (exact) for `.env`, `google-services.json`, `GoogleService-Info.plist`.
    - `.env.example` committed with all six `EXPO_PUBLIC_FIREBASE_*` keys (`grep -c '^EXPO_PUBLIC_FIREBASE_' .env.example` returns 6).
    - `git status` does NOT list `.env` as staged/untracked AFTER `git add -A` would run (i.e. it's properly ignored).
  </acceptance_criteria>
  <done>app.config.ts is the single Expo config source; all six Firebase keys live in env, not source; native config files are gitignored.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Rewrite src/lib/firebase.ts to read from Constants.expoConfig.extra; add native config files</name>
  <read_first>
    - src/lib/firebase.ts (current hardcoded literal — what's being replaced)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md §"Pattern 2: Rewritten src/lib/firebase.ts" (verbatim template)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md §"Pitfall C: Firebase config not loaded on dev-client startup"
    - tests/firebase-config.test.ts (Plan 01 scaffold — what behavior to satisfy)
    - src/storage/index.ts (uses `auth.currentUser`; do NOT break this contract — `auth` from `@react-native-firebase/auth` mirrors the same `.currentUser` API but the IMPORT site changes in Plan 03, not here)
  </read_first>
  <behavior>
    - `readConfig()`: when `Constants.expoConfig.extra.firebase` is missing or lacks `apiKey`/`projectId`/`appId`, throws `Error` with message containing literal substring "Firebase config missing".
    - `db` export remains a `Firestore` instance from `firebase/firestore`.
    - `default` export is the `FirebaseApp`.
    - The named `auth` export from this file is REMOVED. (`AuthContext.tsx` and `LoginScreen.tsx` still import it; that breakage is intentional and will be fixed in Plan 03's auth swap. To avoid breaking Plan 02's verification, KEEP the legacy `auth` export TEMPORARILY in this task — see action — and remove it in Plan 03.)
    - Test `tests/firebase-config.test.ts` from Plan 01 turns GREEN.
  </behavior>
  <action>
    Replace `src/lib/firebase.ts` body with the §Pattern 2 template from RESEARCH.md. Add the `readConfig()` function with the loud throw on missing keys. Keep `import { getAuth } from 'firebase/auth'` and `export const auth = getAuth(app)` for this plan only — labeled with a `// TEMP: removed in Plan 01-03 when AuthContext + LoginScreen swap to @react-native-firebase/auth` comment. This avoids breaking the build between Plan 02 and Plan 03. Download `GoogleService-Info.plist` and `google-services.json` from Firebase Console (project `chitti-app-edfb1`) — the human checkpoint is in `user_setup` for the orchestrator; if files are not present at repo root, the task FAILS its acceptance criteria with a clear message. Files are gitignored (Task 2).
  </action>
  <verify>
    <automated>npm test -- tests/firebase-config.test.ts 2>&amp;1 | grep -E "PASS|FAIL" | head -3; grep -c "AIzaSyAoiSLbntckQuqepwHGzJ-xHCQVN6NLh_I" src/lib/firebase.ts; grep -c "Constants.expoConfig" src/lib/firebase.ts; grep -c "Firebase config missing" src/lib/firebase.ts</automated>
  </verify>
  <acceptance_criteria>
    - `tests/firebase-config.test.ts` PASSES (DATA-04 unit-test gate).
    - `grep -c "AIzaSyAoi" src/lib/firebase.ts` returns 0 (zero hardcoded API keys remain).
    - `grep -c "Constants.expoConfig" src/lib/firebase.ts` returns ≥ 1.
    - `grep -c "Firebase config missing" src/lib/firebase.ts` returns ≥ 1 (loud-error guard for Pitfall C).
    - `src/lib/firebase.ts` still exports `db` (grep `export const db`).
    - `GoogleService-Info.plist` and `google-services.json` exist at repo root (and are gitignored per Task 2).
    - The TEMP comment marker `TEMP: removed in Plan 01-03` is present (so the next plan can grep-find what to delete).
  </acceptance_criteria>
  <done>DATA-04 closed: Firebase config is env-driven, hardcoded literal gone, missing-config errors are loud. Plan 03 can now swap AuthContext + LoginScreen to RNFirebase without worrying about config loading.</done>
</task>

</tasks>

<user_setup>
  - service: firebase
    why: "Native iOS/Android Firebase SDK reads GoogleService-Info.plist (iOS) and google-services.json (Android) at native init. These cannot be embedded in env vars; they are file artifacts downloaded from Firebase Console. Required by RNFirebase config plugin."
    env_vars:
      - name: EXPO_PUBLIC_FIREBASE_API_KEY
        source: "Firebase Console → chitti-app-edfb1 → Project settings → Your apps → Web app config"
      - name: EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
        source: "Same as above"
      - name: EXPO_PUBLIC_FIREBASE_PROJECT_ID
        source: "Same as above (value: chitti-app-edfb1)"
      - name: EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
        source: "Same as above"
      - name: EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
        source: "Same as above"
      - name: EXPO_PUBLIC_FIREBASE_APP_ID
        source: "Same as above"
    dashboard_config:
      - task: "Download GoogleService-Info.plist (iOS) and place at repo root"
        location: "Firebase Console → Project settings → Your apps → iOS app (create one if absent with bundle id com.chittiapp.chitti) → Download GoogleService-Info.plist"
      - task: "Download google-services.json (Android) and place at repo root"
        location: "Firebase Console → Project settings → Your apps → Android app (create one if absent with package com.chittiapp.chitti) → Download google-services.json"
      - task: "Ensure Phone Authentication provider is Enabled"
        location: "Firebase Console → Authentication → Sign-in method → Phone → Enable"
</user_setup>

<verification>
- `npx expo config --type public` parses without error and includes `extra.firebase.projectId === 'chitti-app-edfb1'`.
- `npm test -- tests/firebase-config.test.ts` GREEN.
- `grep -rE "AIzaSy[A-Za-z0-9_-]{30,}" src/` returns no hits (no hardcoded API keys anywhere in src/).
- `git check-ignore .env google-services.json GoogleService-Info.plist` lists all three.
</verification>

<success_criteria>
DATA-04 requirement is satisfied (req ID committed to this plan). The codebase no longer contains the leaked API key in source. Native module config plugins are registered, paving the way for Plan 03's auth swap and Plan 04's EAS build.
</success_criteria>

<output>
After completion, create `.planning/phases/01-native-phone-auth-env-config/01-02-SUMMARY.md`. Include: deps added (with installed versions), `app.config.ts` plugins list, `Constants.expoConfig.extra.firebase` field count, link to where API key rotation is owed (Plan 06).
</output>
