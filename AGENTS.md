# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**ChittiApp**

A Splitwise-style mobile app for **chit fund tracking** — a leader (foreman) creates a chit group, invites members by phone number, and the app records monthly subscriptions, draws, and dividends with math faithful to the **Chit Funds Act, 1982**. The app does **not** handle money; payments happen outside (cash / UPI / bank). Distributed via Apple App Store and Google Play.

**Core Value:** A foreman can run a real, Act-compliant chit group end-to-end on phone — every subscriber sees their own ledger from their own device — with no spreadsheet, no WhatsApp message thread, and no math errors.

### Constraints

- **Platform:** iOS + Android via Expo SDK 56 (pinned). Web is dev-convenience only.
- **Backend:** Firebase (Auth + Firestore). No custom server. Firestore security rules are the only authorization boundary.
- **Money handling:** None. App records, does not move funds.
- **Regulatory:** Chit-fund math must be faithful to the Chit Funds Act, 1982 (foreman commission cap, discount cap, prized-once rule, money conservation). App is **not** a registered chit business and does not pretend to be.
- **Identity:** Phone number via Firebase Phone Auth OTP. Must work on physical iOS and Android, not just web.
- **Distribution:** Apple App Store + Google Play Store. App must satisfy each store's submission requirements (privacy policy, content rating, native auth, etc.).
- **Tech-debt to clear before launch:** env-based config, native auth, native confirm dialogs, Firestore security rules, basic test coverage.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ~6.0.3 (strict mode) - All app source under `src/`, `App.tsx`, `index.ts`
- TSX - React Native component files (e.g., `src/screens/*.tsx`, `src/components/GroupCard.tsx`)
- JSON - Configuration (`package.json`, `app.json`, `tsconfig.json`)
## Runtime
- React Native 0.85.3 (mobile runtime via Expo SDK 56)
- React 19.2.3 / React DOM 19.2.3
- Expo Go / native build via `registerRootComponent` in `index.ts`
- Web target via `react-native-web` ^0.21.2 and `@expo/metro-runtime` ~56.0.11
- npm (inferred from `package-lock.json`)
- Lockfile: present (`package-lock.json`)
## Frameworks
- Expo SDK ~56.0.3 - Cross-platform app framework (iOS, Android, Web)
- React Native 0.85.3 - Mobile UI primitives
- React Navigation 7.x - Routing
- None detected - no test framework, no test files, no test scripts in `package.json`
- Expo CLI - `expo start`, `expo start --android`, `expo start --ios`, `expo start --web` (see `package.json` scripts)
- Metro bundler (via `@expo/metro-runtime`)
- TypeScript ~6.0.3 with `expo/tsconfig.base` extension (`tsconfig.json`)
## Key Dependencies
- `firebase` ^12.13.0 - Auth + Firestore backend (`src/lib/firebase.ts`, `src/lib/firestore.ts`, `src/lib/AuthContext.tsx`)
- `@react-native-async-storage/async-storage` ^3.1.0 - Local KV storage (required by Firebase Auth on RN)
- `expo-auth-session` ^56.0.11 - OAuth flows
- `expo-crypto` ^56.0.3 - Cryptographic primitives
- `expo-web-browser` ^56.0.5 - In-app browser for auth redirects
- `react-native-get-random-values` ^2.0.0 - Polyfill loaded at top of `App.tsx` for UUID/crypto
- `uuid` ^14.0.0 - ID generation
- `react-native-gesture-handler` ^2.31.2 - Required by React Navigation; imported first in `App.tsx`
- `react-native-screens` ^4.25.2 - Native screen primitives for navigator
- `react-native-safe-area-context` ^5.8.0 - Safe-area insets
- `@expo/vector-icons` ^15.1.1 - Ionicons used across screens (e.g., `src/screens/LoginScreen.tsx`)
- `@expo-google-fonts/inter` ^0.4.2 - Inter font family loaded via `useFonts` in `App.tsx`
- `expo-font` ~56.0.5 - Font loader (also registered as plugin in `app.json`)
- `expo-status-bar` ~56.0.4 - Status bar control
- `react-native-web` ^0.21.2 - Web platform support
## Configuration
- No `.env*` files present (only `.env*.local` ignored in `.gitignore`)
- Firebase config is hardcoded as a literal object in `src/lib/firebase.ts` (apiKey, projectId, appId, etc.) - not env-driven
- No runtime environment variables consumed by app code
- `app.json` - Expo app manifest (name `ChittiApp`, slug `ChittiApp`, version `1.0.0`, plugins: `expo-font`)
- `tsconfig.json` - Extends `expo/tsconfig.base`, `strict: true`
- `package.json` - Dependencies + Expo scripts
- No Babel, Metro, ESLint, Prettier, or Jest config files present
## Platform Requirements
- Node.js (version not pinned via `.nvmrc`)
- npm
- Expo CLI (invoked via `npx expo` through `package.json` scripts)
- Per `AGENTS.md`: read Expo v56 versioned docs before writing code
- iOS (`supportsTablet: true` in `app.json`)
- Android (adaptive icon configured, `predictiveBackGestureEnabled: false`)
- Web (favicon configured, served via `react-native-web` + Metro)
- Native folders `/ios` and `/android` are gitignored (Expo-managed workflow)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components and screens: `PascalCase.tsx` — e.g., `HomeScreen.tsx`, `GroupCard.tsx`, `AppNavigator.tsx`
- Non-component TypeScript modules: `camelCase.ts` — e.g., `firestore.ts`, `firebase.ts`, `chitti.ts`, `theme.ts`
- Context providers: `PascalCase + Context.tsx` — e.g., `AuthContext.tsx`, `ThemeContext.tsx`
- Barrel/entry modules use `index.ts` — e.g., `src/storage/index.ts`, `src/types/index.ts`
- All functions use `camelCase`: `getGroups`, `upsertGroup`, `initializeCycles`, `getCurrentCycle`
- React components use `PascalCase`: `HomeScreen`, `GroupCard`, `AuthProvider`
- Custom hooks use `use` prefix: `useAuth`, `useTheme`
- Style factory functions use `makeStyles(c: ThemeColors)` pattern — `src/screens/HomeScreen.tsx:122`, `src/components/GroupCard.tsx:95`
- Internal helpers placed at top of file (uppercase optional): `ordinal` in `src/components/GroupCard.tsx:9`, `stripUndefined` in `src/lib/firestore.ts:21`
- Local variables and state: `camelCase` — `groups`, `showArchived`, `pendingCount`
- React state pairs use `[x, setX]` with `setX` PascalCase suffix: `[user, setUser]`, `[loading, setLoading]`
- Short single-letter names allowed in tight callbacks/maps: `d`, `g`, `m`, `p`, `c`, `t`, `u`, `v` (see `src/lib/firestore.ts:13`, `src/utils/chitti.ts:8`)
- Theme/color parameter consistently shortened to `c` in style factories
- TypeScript `interface` for object shapes: `Member`, `Payment`, `Cycle`, `ChittiGroup`, `ThemeColors`, `Props`, `AuthContextType` — see `src/types/index.ts`
- `type` aliases for unions and narrow string literals: `DrawType = 'lottery' | 'auction' | 'self-assign'` in `src/types/index.ts:30`, `Step = 'home' | 'phone' | 'otp'` in `src/screens/LoginScreen.tsx:9`
- Local navigation type alias `type Nav = NativeStackNavigationProp<...>` — `src/screens/HomeScreen.tsx:13`
- Component props typed via inline `interface Props { ... }` adjacent to the component — `src/components/GroupCard.tsx:15`
## Code Style
- No `.prettierrc`, `.eslintrc`, `eslint.config.*`, or `biome.json` present at repo root. No linter/formatter is configured.
- Observed conventions (de facto):
- None configured.
- TypeScript `strict: true` in `tsconfig.json` is the only static-analysis safety net. Extends `expo/tsconfig.base`.
## Import Organization
- None configured. All local imports use relative paths (`../types`, `../lib/firebase`, `./types`).
## Error Handling
- Async UI flows use `try / catch / finally` with `setLoading` toggling and an `error` state string surfaced into the JSX — `src/screens/LoginScreen.tsx:22-61`
- Catch clauses typed `(e: any)` and read `e.message ?? 'Fallback message'` — `src/screens/LoginScreen.tsx:26`, `:43`
- Some catches swallow the error and just set a friendly message — `src/screens/LoginScreen.tsx:56` (`catch { setError('Invalid OTP...') }`)
- Library/data layer throws plain `Error` for invariant violations: `throw new Error('Not authenticated')` in `src/storage/index.ts:9`
- Firestore helpers (`src/lib/firestore.ts`) do NOT wrap errors — they let them propagate to the caller
- Screen-level deletes use fire-and-forget `.then(...)` without `.catch(...)` — `src/screens/HomeScreen.tsx:31` (silently ignores failure)
- Confirmation dialogs use `window.confirm` guarded by `typeof window !== 'undefined'` (web-first) — `src/screens/HomeScreen.tsx:27`
## Logging
- Errors are surfaced to users via inline `<Text style={styles.error}>` UI, not logged
- No telemetry or analytics SDK wired in
## Comments
- Sparse. Comments only appear to explain non-obvious architectural decisions:
- No inline narration of straightforward code
- Not used anywhere. Rely on TypeScript types for documentation.
## Function Design
- Utility functions in `src/utils/chitti.ts` are tight (1-5 lines each)
- Storage/Firestore wrappers are one-liners delegating to the SDK
- Screen components are larger (100-160+ lines) and contain both logic and a `makeStyles` factory in the same file
- Positional arguments for 1-3 params (`getGroupById(uid, gid)`)
- Object destructuring for React component props: `function GroupCard({ group, onPress, onDelete }: Props)`
- Default values and `??` for optional fallbacks: `group.drawType ?? 'lottery'` in `src/utils/chitti.ts:11`
- All async functions return `Promise<T>` with explicit return type annotations — `src/lib/firestore.ts:11,16,25,29`
- Nullable returns use `T | null` rather than `undefined` — `getGroupById`, `getCurrentCycle`
- Pure utility functions never mutate inputs; they return new objects/arrays — `syncCyclePayments` returns `{ ...cycle, payments }`
## Module Design
- React components and screens: `export default` for the primary component
- Library modules: named `export` for every function (`export async function getGroups(...)`)
- Constants and types: named `export` (`export const auth`, `export interface ChittiGroup`)
- `src/lib/firebase.ts` mixes both: named exports for `auth`/`db` plus `export default app`
- `src/types/index.ts` — single barrel for all domain types
- `src/storage/index.ts` — facade over `src/lib/firestore.ts` that auto-injects the current user's UID
- Re-export shims via `import * as FS from '../lib/firestore'` pattern in `src/storage/index.ts:4`
## Theming & Styling Conventions
- Every screen/component owning styles uses `useMemo(() => makeStyles(colors), [colors])` so styles recompute on theme change — `src/screens/HomeScreen.tsx:18`
- Color tokens live in `src/lib/theme.ts` (`light`, `dark`, `ThemeColors` interface). Hard-coded hex colors only used for white-on-primary surfaces (`'#fff'`) and a small number of constants in `App.tsx`/`LoginScreen.tsx`
- Font weights consumed via spread: `{ fontSize: 16, ...fonts.bold }` — `src/lib/theme.ts:73-79`
- `StyleSheet.create` is the only styling primitive. No styled-components, no NativeWind.
## React Patterns
- Functional components only; no class components
- Hooks placed at the top of the component body in this order: navigation/context hooks, `useMemo` styles, `useState`, `useEffect`/`useFocusEffect`, handler functions, derived values, JSX return
- `useFocusEffect(useCallback(...))` for screen-mount data fetches — `src/screens/HomeScreen.tsx:24`
- Context providers expose a `useX()` hook companion (`useAuth`, `useTheme`) rather than exporting the raw context
- Navigation typing via `RootStackParamList` from `src/navigation/types.ts` and `NativeStackNavigationProp<RootStackParamList, 'ScreenName'>`
## Async & Data Conventions
- `async/await` preferred for sequenced operations; `.then(...)` only for fire-and-forget UI side effects
- Firestore documents stripped of `undefined` via `JSON.parse(JSON.stringify(obj))` before write — `src/lib/firestore.ts:21-23`
- Auth-scoped data access centralized through `src/storage/index.ts` so screens never deal with UIDs
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
```
## Component Responsibilities
| Component | Responsibility | File |
|-----------|----------------|------|
| Root entry | Registers root component with Expo runtime | `index.ts` |
| App shell | Loads Inter fonts, wires Theme/Auth providers and navigator | `App.tsx` |
| AuthProvider | Subscribes to Firebase `onAuthStateChanged`, exposes `user`/`loading` | `src/lib/AuthContext.tsx` |
| ThemeProvider | Resolves light/dark colors, persists override in AsyncStorage | `src/lib/ThemeContext.tsx` |
| AppNavigator | Native stack navigator, auth-gated routes, deep linking config | `src/navigation/AppNavigator.tsx` |
| Firebase init | Singleton Firebase app, exports `auth` and `db` | `src/lib/firebase.ts` |
| Firestore DAL | Per-user `users/{uid}/groups/*` CRUD, plus `memberTokens/{token}` lookup | `src/lib/firestore.ts` |
| Storage shim | Auth-aware wrapper that injects `auth.currentUser.uid` for screens | `src/storage/index.ts` |
| Domain utils | Pure chit-fund logic (cycles, dividends, eligibility, formatting) | `src/utils/chitti.ts` |
| Domain types | `ChittiGroup`, `Member`, `Cycle`, `Payment`, `DrawType` | `src/types/index.ts` |
| GroupCard | Presentational group summary card used on Home | `src/components/GroupCard.tsx` |
## Pattern Overview
- Provider-wrapped functional components with hooks (`useState`, `useEffect`, `useMemo`, `useFocusEffect`).
- Auth-gated stack navigator: presence of `user` switches the screen set.
- Per-user data isolation in Firestore via path `users/{uid}/groups/{groupId}`.
- A separate top-level `memberTokens/{token}` collection enables unauthenticated public member views via deep link.
- Storage layer is a swappable shim — screens import from `../storage` regardless of backend (originally AsyncStorage, now Firestore).
## Layers
- Purpose: UI, navigation, local form state, calls into storage and utils.
- Location: `src/screens/`, `src/components/`
- Contains: React function components, `StyleSheet`s built from theme via `makeStyles(colors)`.
- Depends on: `src/storage`, `src/utils/chitti`, `src/lib/ThemeContext`, `src/lib/AuthContext`, `src/navigation/types`.
- Used by: `AppNavigator`.
- Purpose: Route definition, params typing, deep linking.
- Location: `src/navigation/`
- Contains: `AppNavigator.tsx` (stack config + linking), `types.ts` (`RootStackParamList`).
- Depends on: All screens + `AuthContext`/`ThemeContext`.
- Purpose: Cross-cutting state (auth, theme).
- Location: `src/lib/AuthContext.tsx`, `src/lib/ThemeContext.tsx`
- Depends on: `src/lib/firebase` (auth), `src/lib/theme` (colors), `AsyncStorage` (theme persistence).
- Purpose: Pure functions over `ChittiGroup`/`Cycle`/`Member`.
- Location: `src/utils/chitti.ts`
- Depends on: `src/types` only.
- Used by: Screens and `GroupCard`.
- Purpose: Persistence abstraction.
- Location: `src/storage/index.ts` (shim), `src/lib/firestore.ts` (Firestore CRUD), `src/lib/firebase.ts` (SDK init).
- Depends on: `firebase/app`, `firebase/auth`, `firebase/firestore`.
## Data Flow
### Primary Request Path (load groups on Home)
### Mutation Path (upsert group)
### Auth Flow
### Public Member Deep Link
- No global store. Local `useState` per screen + two React Contexts (`AuthContext`, `ThemeContext`). Server state is fetched on focus via `useFocusEffect`.
## Key Abstractions
- Purpose: Aggregate root containing members and cycles for a chit fund.
- Examples: `src/types/index.ts:32`, persisted at `users/{uid}/groups/{id}`.
- Pattern: Document aggregate — entire group document read/written as a unit.
- Purpose: One monthly draw + payment ledger.
- Examples: `src/types/index.ts:17`, generated by `initializeCycles` (`src/utils/chitti.ts:3`).
- Pattern: Pre-allocated array of length `durationMonths`, mutated in place when `conducted`.
- Purpose: Decouple screens from data backend.
- Examples: `src/storage/index.ts` re-exports `getGroups/getGroupById/upsertGroup/deleteGroup` regardless of backend.
- Pattern: Facade — uid is captured from `auth.currentUser` and forwarded to the underlying Firestore module.
- Purpose: Light/dark color tokens and Inter font helpers.
- Examples: `src/lib/theme.ts` (`light`, `dark`, `fonts`), `useTheme()` from `src/lib/ThemeContext.tsx`.
- Pattern: Component-local `makeStyles(colors)` factory memoized with `useMemo`.
## Entry Points
- Location: `index.ts`
- Triggers: Expo runtime (`registerRootComponent`).
- Responsibilities: Mounts `App`.
- Location: `App.tsx`
- Triggers: Mounted by Expo.
- Responsibilities: Loads Inter fonts, installs `react-native-gesture-handler` + `react-native-get-random-values` side-effect imports, renders provider tree.
- Location: `src/navigation/AppNavigator.tsx`
- Triggers: Rendered inside providers.
- Responsibilities: Auth gating, deep linking config, stack screen registration.
## Architectural Constraints
- **Threading:** Single JS thread (React Native). All Firestore calls are async/await.
- **Global state:** Firebase app is a module-level singleton (`src/lib/firebase.ts:14`). `LoginScreen` stashes `recaptchaVerifier` on `window` for web phone auth (`src/screens/LoginScreen.tsx:38`).
- **Web vs native branching:** `HomeScreen` uses `window.confirm` for delete confirmation (`src/screens/HomeScreen.tsx:27`); `LoginScreen` uses web-only `signInWithPopup` and `RecaptchaVerifier` — Google + phone auth assume a web runtime today.
- **Auth requirement:** Storage shim throws `Not authenticated` if `auth.currentUser` is null (`src/storage/index.ts:9`); never call it before `AuthProvider` reports a user.
- **Firestore data shape:** Whole-document writes; nested `members` and `cycles` arrays grow with group size. No subcollections.
- **No backend / no server validation:** Firestore security rules (not in repo) are the only authorization boundary; client trusts itself.
- **Hard-coded Firebase config:** API key and project IDs live in source (`src/lib/firebase.ts:5-12`), not in env files.
- **Circular imports:** None observed.
## Anti-Patterns
### `stripUndefined` via JSON round-trip
### Web-only auth on a cross-platform Expo app
### `window.confirm` for delete UX
### Reading entire group document for every screen
### Hard-coded Firebase API key in source
## Error Handling
- `LoginScreen` catches Firebase errors and stores `e.message` in `error` state (`src/screens/LoginScreen.tsx:26`).
- `src/storage/index.ts:9` throws `Error('Not authenticated')` if `auth.currentUser` is null.
- Firestore `getGroupById` returns `null` for missing docs rather than throwing (`src/lib/firestore.ts:16`).
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
