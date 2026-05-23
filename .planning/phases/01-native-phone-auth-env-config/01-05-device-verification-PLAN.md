---
phase: 01-native-phone-auth-env-config
plan: 05
type: execute
wave: 4
depends_on: [04]
files_modified:
  - .planning/phases/01-native-phone-auth-env-config/01-05-VERIFICATION.md
autonomous: false
requirements: [AUTH-01, AUTH-02]
must_haves:
  truths:
    - "A real user signs in via OTP on a physical iPhone (iOS 17+) on an Indian SIM and lands on Home (AUTH-01)"
    - "A real user signs in via OTP on a physical Android device (Pixel/Samsung, Android 13+) on an Indian SIM and lands on Home (AUTH-02)"
    - "Force-quit + relaunch on both platforms keeps the user signed in (AUTH-03 verified on hardware)"
    - "Sign-out from Settings returns to the phone-entry screen on both platforms (AUTH-04 verified on hardware)"
    - "Demo mode entry + exit still works after the native swap (regression check from CONTEXT.md specifics)"
    - "First EAS development-profile build succeeds for iOS and Android (Pitfall A: forceStaticLinking validated empirically)"
  artifacts:
    - path: .planning/phases/01-native-phone-auth-env-config/01-05-VERIFICATION.md
      provides: "Signed verification log with build IDs, device/SIM info, screenshots/recording paths, pass/fail per matrix row"
  key_links:
    - from: eas.json (Plan 04)
      to: "EAS build servers"
      via: "eas build --profile development --platform ios/android"
      pattern: "eas build"
    - from: "Dev-client APK/IPA installed on device"
      to: "Firebase Auth (chitti-app-edfb1)"
      via: "auth().signInWithPhoneNumber over native iOS/Android Firebase SDK"
      pattern: "—"
---

<objective>
Close AUTH-01 and AUTH-02 — the hardware-verified requirements. This plan is mostly checkpoint-driven because no automated test can substitute for "a person on a real iPhone with a real Indian Jio/Airtel SIM receives a real OTP." The plan also runs the first EAS development build, which empirically validates Pitfall A (`forceStaticLinking`) on iOS.

This is the phase's truth gate. Without successful real-device sign-in the phase is incomplete regardless of how many unit tests are green.

Purpose: turn AUTH-01 and AUTH-02 from "code in place" into "verified on hardware on Indian carrier SMS."
Output: a signed VERIFICATION.md log with build IDs, device serials/names, SIM operator, screenshots/recording paths, and pass/fail per matrix row.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-native-phone-auth-env-config/01-CONTEXT.md
@.planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md
@.planning/research/PITFALLS.md
@.planning/phases/01-native-phone-auth-env-config/01-04-SUMMARY.md
@eas.json
@app.config.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Run first EAS development builds for iOS + Android; surface forceStaticLinking outcome</name>
  <read_first>
    - eas.json (Plan 04 — development profile)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md "Pitfall A: forceStaticLinking missing → iOS build fails on EAS" (warning signs to match against build output)
    - .planning/phases/01-native-phone-auth-env-config/01-RESEARCH.md "Environment Availability" (Apple Developer account is a hard prereq for iOS build; if missing, Task fails fast with a clear error pointing at the user_setup gap)
    - app.config.ts (confirms plugin order and forceStaticLinking array)
  </read_first>
  <action>
    Run `npx eas login` (if not authenticated, surface an auth checkpoint — see user_setup below). Then `npx eas build:configure` if `extra.eas.projectId` is missing from app.config.ts. Then trigger two builds in parallel-friendly sequence:
    1. `npx eas build --profile development --platform ios --non-interactive`
    2. `npx eas build --profile development --platform android --non-interactive`
    Wait for both to complete (typically 8-25 min each on free tier). Capture build IDs from EAS output. If iOS build fails with "non-modular header inside framework module RNFBApp" (Pitfall A warning sign), STOP and surface the failure — that means `forceStaticLinking` is misconfigured in app.config.ts; do not proceed to Task 2. If the build succeeds, download the install URLs / QR codes from the EAS dashboard.
    Record build IDs and the install URLs into a new file at `.planning/phases/01-native-phone-auth-env-config/01-05-VERIFICATION.md` under a "## Build artifacts" section.
  </action>
  <verify>
    <automated>test -f .planning/phases/01-native-phone-auth-env-config/01-05-VERIFICATION.md &amp;&amp; node -e "const fs=require('fs'); const v=fs.readFileSync('.planning/phases/01-native-phone-auth-env-config/01-05-VERIFICATION.md','utf8'); if(!/## Build artifacts/.test(v)) process.exit(1); if(!/iOS.*build.*[0-9a-f-]{8,}/i.test(v)) process.exit(2); if(!/Android.*build.*[0-9a-f-]{8,}/i.test(v)) process.exit(3); console.log('Build IDs recorded')"</automated>
  </verify>
  <acceptance_criteria>
    - Both `npx eas build --profile development --platform {ios,android}` exit 0 on EAS servers.
    - Build artifacts (IPA for iOS dev client, APK for Android dev client) are downloadable from EAS dashboard.
    - No "non-modular header inside framework module RNFBApp" error in iOS build log (Pitfall A validated).
    - `01-05-VERIFICATION.md` records both build IDs and the install URLs/QR codes.
  </acceptance_criteria>
  <done>Dev-client binaries exist and are installable on physical devices.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Human verifies the AUTH-01/02/03/04 + demo-mode regression matrix on physical iPhone and Android</name>
  <what-built>
    - EAS development-profile builds (iOS IPA + Android APK) from Task 1
    - Native phone-auth flow wired in Plan 04 (auth().signInWithPhoneNumber, toE164 normalization, mapPhoneAuthError)
    - Demo mode preserved (Plan 04 Task 2 acceptance criteria)
  </what-built>
  <how-to-verify>
    Install the dev-client builds from Task 1's URLs on:
    - **One physical iPhone** running iOS 17 or newer, with an active Indian Jio OR Airtel SIM
    - **One physical Android device** (Pixel or Samsung) running Android 13 or newer, with an active Indian SIM

    Run this exact matrix on **each device** (run on iOS first to fail fast on Pitfall A regression; then Android). Record outcomes in `.planning/phases/01-native-phone-auth-env-config/01-05-VERIFICATION.md` under "## Verification matrix":

    1. **Cold install + first sign-in (AUTH-01 iOS / AUTH-02 Android)**
       - Install dev-client; open app for the first time.
       - Enter your Indian mobile number on the LoginScreen.
       - Tap Send OTP. Confirm SMS arrives within 60s. If it doesn't, tap "Call me instead" (Pitfall 8 fallback) and confirm a voice call delivers the OTP.
       - Enter the 6-digit OTP. Confirm you land on Home.
       - Expected: signed in, your phone number visible (formatted +91 ##### #####), Home content rendered.

    2. **Cold-start persistence (AUTH-03)**
       - Force-quit the app (swipe up on iOS app switcher; clear from Recents on Android — NOT just background).
       - Re-open the app from the home screen icon.
       - Expected: lands directly on Home; NO phone-entry / OTP screen.

    3. **Sign-out (AUTH-04)**
       - Open Settings → tap Sign Out (or whatever the current Settings UI exposes).
       - Expected: returns to phone-entry LoginScreen.
       - Re-cold-start the app to confirm sign-out persisted.

    4. **Demo-mode regression (CONTEXT.md specifics)**
       - On the phone-entry LoginScreen, tap "Preview without signing in →" (the demo entry).
       - Expected: lands on Home with 3 seeded chit groups (Lalith, Parsi, etc.) and Home content renders.
       - Exit demo mode (Settings → sign out or wherever leaveDemoMode is exposed).
       - Expected: returns to LoginScreen; real-auth flow is selectable.

    5. **Invalid-input regression**
       - Enter `123` as the phone. Tap Send OTP.
       - Expected: error "That number doesn't look right." surfaces; no SMS sent; no auth/* error code thrown from RNFirebase.

    For each row record on each platform: `[PASS|FAIL] — <evidence: screenshot path | screen-recording path | one-line note>`. Include device model, OS version, SIM operator. If any row fails on either platform, the phase is not complete — file a follow-up task and STOP.
  </how-to-verify>
  <resume-signal>Type "verified iOS+Android pass" with the path to the completed VERIFICATION.md, OR describe the specific failing row(s) with platform + reproduction steps.</resume-signal>
</task>

</tasks>

<user_setup>
  - service: eas-build
    why: "EAS Build evaluates app.config.ts, prebuilds native projects, signs binaries, and produces install URLs. Requires an authenticated Expo account and (for iOS) an Apple Developer account."
    env_vars:
      - name: EXPO_TOKEN
        source: "Optional — for non-interactive CI. Generate at https://expo.dev/accounts/[user]/settings/access-tokens. Local devs can use `npx eas login` interactive flow instead."
    dashboard_config:
      - task: "Authenticate Expo account"
        location: "Run `npx eas login` and complete the browser flow. Account must have an Expo organization that owns the ChittiApp project. If no project exists yet, `npx eas build:configure` creates it and writes `extra.eas.projectId` into app.config.ts."
      - task: "Link/create an Apple Developer account for iOS builds"
        location: "Apple Developer Program ($99/yr). Required for `eas build --profile development --platform ios`. During the build EAS prompts to log into Apple ID and generates a provisioning profile. If no Apple account, iOS build cannot proceed — phase is blocked on AUTH-01."
      - task: "Add SHA-1 / SHA-256 fingerprints to Firebase (Android)"
        location: "After first Android build, EAS shows SHA-1 in build details. Copy to Firebase Console → Project settings → chitti-app-edfb1 → Android app → Add fingerprint. Phone Auth requires the SHA registered."
      - task: "Upload Apple APN auth key to Firebase (iOS)"
        location: "Apple Developer → Certificates, Identifiers & Profiles → Keys → create APN key → download .p8 → Firebase Console → Project settings → Cloud Messaging → APN authentication key → upload. Required for iOS Phone Auth silent verification."
      - task: "Configure Firebase test phone numbers (optional but recommended)"
        location: "Firebase Console → Authentication → Phone numbers for testing → add 2-3 test numbers like +91 90000 00001 with fixed OTP 123456. Avoids burning the 3000/day SMS quota during iteration. Note: real-device verification still requires real SIM cards — these are dev-iteration aids only."
  - service: physical-devices
    why: "AUTH-01 and AUTH-02 explicitly require physical iOS and Android hardware with Indian SIMs. CONTEXT.md is unambiguous: 'No simulator-only or web-only verification counts.' There is no software fallback for these requirements."
    dashboard_config:
      - task: "Acquire / locate one physical iPhone (iOS 17+) with Indian Jio or Airtel SIM"
        location: "Hardware acquisition. Blocking AUTH-01."
      - task: "Acquire / locate one physical Android device (Pixel/Samsung, Android 13+) with Indian SIM"
        location: "Hardware acquisition. Blocking AUTH-02."
</user_setup>

<verification>
- `.planning/phases/01-native-phone-auth-env-config/01-05-VERIFICATION.md` exists.
- The file contains a "## Verification matrix" section with five numbered rows per platform (iOS and Android), each marked PASS.
- The file lists both EAS build IDs from Task 1.
- The file records device model, OS version, and SIM operator per platform.
</verification>

<success_criteria>
AUTH-01 and AUTH-02 verified on hardware. AUTH-03 and AUTH-04 verified on hardware (already code-complete from Plan 04). Demo-mode regression passes. Pitfall A empirically validated (iOS dev build succeeded).
</success_criteria>

<output>
After completion, create `.planning/phases/01-native-phone-auth-env-config/01-05-SUMMARY.md`. Include: link to `01-05-VERIFICATION.md`, both build IDs, device + SIM details (model / OS / operator) for each platform, screenshot/recording paths, and a note on whether any cell required the "Call me instead" voice fallback (Pitfall 8 incidence rate; informs the v1.x DLT revisit trigger per RESEARCH §4).
</output>
