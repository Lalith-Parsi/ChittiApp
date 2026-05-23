---
phase: 01-native-phone-auth-env-config
plan: 06
type: execute
wave: 5
depends_on: [05]
files_modified:
  - .planning/codebase/STACK.md
  - .env
autonomous: false
requirements: []
must_haves:
  truths:
    - "An EAS preview-profile build succeeds for both iOS and Android (production-mode auth + native modules work in release configuration)"
    - "An EAS production-profile build succeeds for both iOS and Android (store-ready binary produced)"
    - "The Firebase Web API key publicly committed to GitHub (AIzaSyAoiSLbntckQuqepwHGzJ-xHCQVN6NLh_I) is rotated; new key is loaded via .env locally and via EAS secrets for preview/production builds"
    - "STACK.md is updated to document RNFirebase as the auth path and EAS Build as the only runtime"
  artifacts:
    - path: .planning/codebase/STACK.md
      provides: "Updated dep table + 'auth path: @react-native-firebase/auth' + 'runtime: EAS Build (Expo Go dropped)' notes"
    - path: .env (gitignored)
      provides: "Rotated EXPO_PUBLIC_FIREBASE_API_KEY for local dev"
  key_links:
    - from: "Rotated API key"
      to: "EAS secrets (preview/production)"
      via: "npx eas secret:create"
      pattern: "—"
---

<objective>
Phase 1 hardening + the API-key rotation owed since the leak in the initial commit. Two release-mode EAS builds prove the native auth chain works outside the dev-client (Plan 05 only validated the development profile). The rotation closes the security tail STATE.md flagged as "Pending Todos."

Purpose: confirm the auth swap holds in release builds (not just dev-client), retire the leaked API key, and leave a STACK.md trail so the next phase's planner finds the new reality without re-discovering it.
Output: two more successful EAS builds, a rotated Firebase API key in EAS secrets, an updated STACK.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/phases/01-native-phone-auth-env-config/01-CONTEXT.md
@.planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md
@.planning/phases/01-native-phone-auth-env-config/01-05-SUMMARY.md
@.planning/codebase/STACK.md
@eas.json
@app.config.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run EAS preview + production builds (both platforms)</name>
  <read_first>
    - eas.json (preview and production profile definitions from Plan 04)
    - .planning/phases/01-native-phone-auth-env-config/01-05-SUMMARY.md (confirms development builds succeeded — same pipeline applies to preview/production)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md "Migration Sequence — Wave 5" (rationale: release builds catch issues dev-client masks, e.g. Hermes vs JSC differences)
  </read_first>
  <action>
    Trigger four builds via EAS:
    1. `npx eas build --profile preview --platform ios --non-interactive`
    2. `npx eas build --profile preview --platform android --non-interactive`
    3. `npx eas build --profile production --platform ios --non-interactive`
    4. `npx eas build --profile production --platform android --non-interactive`
    Wait for all four to complete. Capture build IDs. If any preview build fails with an error not present in the dev-client builds (Pitfall A regression or release-mode-only native linker issue), STOP and surface for triage — do not proceed to production builds in that case. Append a "## Release build artifacts" section to `01-05-VERIFICATION.md` (or a new `01-06-VERIFICATION.md` if preferred) listing all four build IDs + their dashboard URLs.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const candidates=['.planning/phases/01-native-phone-auth-env-config/01-06-VERIFICATION.md','.planning/phases/01-native-phone-auth-env-config/01-05-VERIFICATION.md']; const f=candidates.find(c=>fs.existsSync(c)); if(!f){console.error('No verification doc'); process.exit(1)} const v=fs.readFileSync(f,'utf8'); const matches=(v.match(/(preview|production).*build.*[0-9a-f-]{8,}/gi)||[]).length; if(matches<4){console.error('Found',matches,'release build entries, need 4'); process.exit(2)} console.log('Release build entries: OK')"</automated>
  </verify>
  <acceptance_criteria>
    - Four EAS builds (preview iOS, preview Android, production iOS, production Android) all exit 0.
    - The four build IDs are recorded in a VERIFICATION markdown file in the phase directory.
    - No "non-modular header" or release-mode native linker errors in any log.
  </acceptance_criteria>
  <done>Release-build path validated; production-mode auth verified buildable. Phase 6 (store submission) inherits a known-good build pipeline.</done>
</task>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 2: Rotate the leaked Firebase Web API key (Firebase Console + GCP Console)</name>
  <what-built>
    - Env-driven Firebase config (Plan 02) means rotating the API key now requires only updating `.env` locally and `npx eas secret` for build profiles — no source code touched.
  </what-built>
  <how-to-verify>
    The Firebase Web API key `AIzaSyAoiSLbntckQuqepwHGzJ-xHCQVN6NLh_I` was committed to GitHub in the initial commit and is documented in STATE.md as "Pending Todos: Rotate after Phase 1 ships env config." This is that rotation. Firebase Web API keys are not strictly secrets (they identify a project, not authenticate it; security comes from Firestore rules + App Check), but rotating after a public leak is hygienic and removes any usage-quota risk from third parties calling Firebase APIs as our project.

    1. Open https://console.cloud.google.com/apis/credentials?project=chitti-app-edfb1
    2. Locate the API key currently named "Browser key (auto created by Firebase)" or similar with value starting `AIzaSyAoi...`. Click it.
    3. Click **REGENERATE KEY** (top of edit page). Confirm. Copy the NEW key value to the clipboard.
    4. Open `.env` in this repo (gitignored, Plan 02). Replace `EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyAoi...` with the new key. Save.
    5. Update EAS secrets for each non-development profile:
       - `npx eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value <NEW_KEY> --force`
       - (or, if preview/production use distinct secret names per eas.json `env` blocks, update each accordingly)
    6. (Optional but recommended) Add HTTP-referrer / app-package-name restrictions to the new key in the GCP Console → API key → "Application restrictions" — limit to `com.chittiapp.chitti` bundle ID + Android package. Don't enable API restrictions until Phase 2 (could break Firestore JS SDK calls).
    7. Run a sanity build: `npx eas build --profile development --platform android --non-interactive` and confirm it succeeds with the new key.
    8. Smoke test: install the new dev-client APK on the Android test device from Plan 05 and confirm phone-auth still completes end-to-end with the new key.

    Record in `01-06-SUMMARY.md`: date of rotation, last 6 characters of old key (for git-history grep), last 6 characters of new key (for audit-trail without exposing the secret).
  </how-to-verify>
  <resume-signal>Type "key rotated, new build green" with the last 6 chars of the new key and the EAS build ID that validated it.</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Update STACK.md to document Phase 1 outcomes</name>
  <read_first>
    - .planning/codebase/STACK.md (current contents — note the existing dep table format and section structure)
    - package.json (final dep list after Plans 02 + 03)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md "Standard Stack" (canonical version list)
  </read_first>
  <action>
    Edit `.planning/codebase/STACK.md` (Edit tool — preserve existing structure):
    - Add `@react-native-firebase/app`, `@react-native-firebase/auth`, `expo-dev-client`, `expo-build-properties`, `libphonenumber-js`, `eas-cli` to the dep table with installed versions.
    - Add a new short section "Auth path" stating: "Phone OTP via `@react-native-firebase/auth` native module. JS SDK `firebase/auth` is no longer imported anywhere in `src/`. Firestore stays on the JS SDK (`firebase` dep retained for `getFirestore`)."
    - Add a new short section "Runtime" stating: "Expo Go is dropped as of Phase 1. EAS Build is the only supported runtime. Three profiles in `eas.json`: development (dev-client, internal), preview (release, internal), production (store-ready, app-bundle on Android)."
    - Add a short section "Test + lint tooling" listing Jest + jest-expo + ESLint with the npm scripts.
    - Add a short section "Env config" pointing to `app.config.ts` + `.env.example` + EAS secrets for prod.
    Do NOT change unrelated sections of STACK.md.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs'); const s=fs.readFileSync('.planning/codebase/STACK.md','utf8'); const need=['@react-native-firebase/auth','expo-dev-client','libphonenumber-js','eas-cli','EAS Build','app.config.ts']; const miss=need.filter(n=>!s.includes(n)); if(miss.length){console.error('STACK.md missing:',miss); process.exit(1)} console.log('STACK.md updates OK')"</automated>
  </verify>
  <acceptance_criteria>
    - `.planning/codebase/STACK.md` contains all six string markers (RNFirebase auth, expo-dev-client, libphonenumber-js, eas-cli, EAS Build, app.config.ts).
    - The pre-existing sections of STACK.md are preserved (`git diff .planning/codebase/STACK.md` shows additions, not rewrites of unrelated sections).
  </acceptance_criteria>
  <done>STACK.md reflects the post-Phase-1 reality; the next phase's planner reads the new auth/runtime/env truth without re-running discovery.</done>
</task>

</tasks>

<user_setup>
  - service: gcp-console
    why: "API key rotation lives in GCP Console (Firebase shares the underlying GCP project). Cannot be done via CLI without an OAuth-authenticated `gcloud` flow that is out of scope for Phase 1."
    dashboard_config:
      - task: "Regenerate the Firebase Web API key for chitti-app-edfb1"
        location: "https://console.cloud.google.com/apis/credentials?project=chitti-app-edfb1 → API key → REGENERATE KEY"
      - task: "Optionally add Application restrictions (bundle ID / package name)"
        location: "Same page → Application restrictions → iOS apps / Android apps → add com.chittiapp.chitti"
</user_setup>

<verification>
- Four release-mode EAS builds (preview iOS, preview Android, production iOS, production Android) recorded in the phase's VERIFICATION.md with their build IDs.
- New Firebase API key is in EAS secrets (`npx eas secret:list` shows EXPO_PUBLIC_FIREBASE_API_KEY with a recent update timestamp).
- `.planning/codebase/STACK.md` contains all six post-Phase-1 markers.
- `grep -r "AIzaSyAoiSLbntckQuqepwHGzJ-xHCQVN6NLh_I" .env` returns zero matches (old key not in active config; git-history retention is acceptable per STATE.md "Pending Todos" framing).
</verification>

<success_criteria>
Phase 1 is wholly complete: AUTH-01..04 + DATA-04 verified, release-mode build path proven, leaked key rotated, STACK.md current. Phase 2 can branch off a known-good foundation.
</success_criteria>

<output>
After completion, create `.planning/phases/01-native-phone-auth-env-config/01-06-SUMMARY.md`. Include: four release build IDs, old/new API key last-6 characters, STACK.md sections added, and a "Phase 1 closeout checklist" listing AUTH-01, AUTH-02, AUTH-03, AUTH-04, DATA-04 all as ✓ with one-line evidence pointers (which plan/SUMMARY closed each).
</output>
