# External Integrations

**Analysis Date:** 2026-05-22

## APIs & External Services

**Backend-as-a-Service (Firebase):**
- Firebase (Google) - Sole backend for auth, data storage, and identity
  - SDK/Client: `firebase` ^12.13.0 (modular Web SDK)
  - Initialized in `src/lib/firebase.ts` via `initializeApp(firebaseConfig)`
  - Project: `chitti-app-edfb1` (config literal in `src/lib/firebase.ts`)
  - Auth: API key + project IDs are embedded in source (no env vars); access governed by Firebase Security Rules

**Fonts / Assets:**
- Google Fonts (Inter family) - Bundled via `@expo-google-fonts/inter` ^0.4.2 (loaded locally, not fetched at runtime)
  - Loaded in `App.tsx` through `useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold })`

## Data Storage

**Databases:**
- Cloud Firestore (Google Firebase)
  - Connection: Initialized via `getFirestore(app)` in `src/lib/firebase.ts`
  - Client: Firebase Web SDK modular Firestore (`firebase/firestore`)
  - Access layer: `src/lib/firestore.ts` (with thin shim in `src/storage/index.ts`)
  - Collections:
    - `users/{uid}/groups/{groupId}` - Per-user chitti groups (see `groupsCol`, `groupDoc` in `src/lib/firestore.ts`)
    - `memberTokens/{token}` - Public shareable member tokens mapping `{ uid, groupId, memberId }` (`getGroupByMemberToken`, `saveMemberToken` in `src/lib/firestore.ts`)

**File Storage:**
- Firebase Storage bucket configured (`chitti-app-edfb1.firebasestorage.app` in `src/lib/firebase.ts`) but no Storage SDK imports or usage detected in source

**Caching:**
- None detected (no Redis, no in-app cache layer)
- `@react-native-async-storage/async-storage` is installed and used implicitly by Firebase Auth for session persistence on native

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication
  - Implementation: `src/lib/firebase.ts` (`getAuth(app)`) and `src/lib/AuthContext.tsx` (React context wrapping `onAuthStateChanged`)
  - Auth UI: `src/screens/LoginScreen.tsx`
- Supported sign-in methods:
  - Google OAuth - `signInWithPopup(auth, new GoogleAuthProvider())` (`src/screens/LoginScreen.tsx`)
  - Phone OTP - `signInWithPhoneNumber` + `RecaptchaVerifier` (invisible reCAPTCHA, container `recaptcha-container`) (`src/screens/LoginScreen.tsx`)
  - Phone numbers are forced to `+91` (India) country code in `sendOTP`
- OAuth helper deps installed but not directly invoked in current code: `expo-auth-session`, `expo-web-browser`, `expo-crypto`

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Bugsnag, Crashlytics, Rollbar imports detected)

**Logs:**
- Standard `console.*` only; no structured logger framework
- Errors are surfaced inline in UI state (e.g., `setError` in `src/screens/LoginScreen.tsx`)

## CI/CD & Deployment

**Hosting:**
- iOS / Android: Expo-managed workflow (no `/ios` or `/android` in repo - gitignored)
- Web: `expo start --web` (Metro + `react-native-web`)
- No EAS Build configuration (`eas.json`) detected
- No Firebase Hosting config (`firebase.json`, `.firebaserc`) detected

**CI Pipeline:**
- None detected (no `.github/workflows/`, no `.gitlab-ci.yml`, no `.circleci/`)

## Environment Configuration

**Required env vars:**
- None - the app reads no environment variables at runtime
- Firebase config is hardcoded in `src/lib/firebase.ts`:
  - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
  - Note: These are public-by-design Firebase client identifiers, but committing them couples the source to a single Firebase project

**Secrets location:**
- No secrets directory present
- `.gitignore` excludes `.env*.local`, `*.jks`, `*.p8`, `*.p12`, `*.key`, `*.mobileprovision`, `*.pem` - none of these files are present in the repo

## Webhooks & Callbacks

**Incoming:**
- None (no server endpoints; client-only app)
- Indirect: Firebase phone-auth reCAPTCHA callback bound to DOM node `recaptcha-container` in `src/screens/LoginScreen.tsx` (web platform only)

**Outgoing:**
- All outbound calls flow through the Firebase SDK to Google's Firebase backend (Auth, Firestore)
- No custom HTTP clients (no `axios`, no `fetch` usage detected in app code)

---

*Integration audit: 2026-05-22*
