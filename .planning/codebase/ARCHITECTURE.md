<!-- refreshed: 2026-05-22 -->
# Architecture

**Analysis Date:** 2026-05-22

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                  Expo / React Native Client                  │
│                          `App.tsx`                           │
├──────────────────┬──────────────────┬───────────────────────┤
│  ThemeProvider   │   AuthProvider   │     AppNavigator      │
│ `ThemeContext`   │  `AuthContext`   │  `AppNavigator.tsx`   │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                       Screens Layer                          │
│  Home / Login / CreateGroup / GroupDetail / AddMember /      │
│  Draw / PaymentTracking / MemberDetail / MemberPublicView    │
│                       `src/screens/*`                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Domain Utilities          │  Storage Shim                   │
│  `src/utils/chitti.ts`     │  `src/storage/index.ts`         │
└────────────────────────────┴───────────────┬────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│            Firestore Data Access (`src/lib/firestore.ts`)    │
│            Firebase SDK init (`src/lib/firebase.ts`)         │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Firebase Backend: Auth (Google/Phone) + Firestore           │
│  Project: `chitti-app-edfb1`                                 │
└─────────────────────────────────────────────────────────────┘
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

**Overall:** Single-page React Native client with a thin Firestore data layer. No backend code; Firestore is the source of truth, accessed directly from the device using per-user document subtrees.

**Key Characteristics:**
- Provider-wrapped functional components with hooks (`useState`, `useEffect`, `useMemo`, `useFocusEffect`).
- Auth-gated stack navigator: presence of `user` switches the screen set.
- Per-user data isolation in Firestore via path `users/{uid}/groups/{groupId}`.
- A separate top-level `memberTokens/{token}` collection enables unauthenticated public member views via deep link.
- Storage layer is a swappable shim — screens import from `../storage` regardless of backend (originally AsyncStorage, now Firestore).

## Layers

**Presentation (Screens + Components):**
- Purpose: UI, navigation, local form state, calls into storage and utils.
- Location: `src/screens/`, `src/components/`
- Contains: React function components, `StyleSheet`s built from theme via `makeStyles(colors)`.
- Depends on: `src/storage`, `src/utils/chitti`, `src/lib/ThemeContext`, `src/lib/AuthContext`, `src/navigation/types`.
- Used by: `AppNavigator`.

**Navigation:**
- Purpose: Route definition, params typing, deep linking.
- Location: `src/navigation/`
- Contains: `AppNavigator.tsx` (stack config + linking), `types.ts` (`RootStackParamList`).
- Depends on: All screens + `AuthContext`/`ThemeContext`.

**Application/Context:**
- Purpose: Cross-cutting state (auth, theme).
- Location: `src/lib/AuthContext.tsx`, `src/lib/ThemeContext.tsx`
- Depends on: `src/lib/firebase` (auth), `src/lib/theme` (colors), `AsyncStorage` (theme persistence).

**Domain / Utilities:**
- Purpose: Pure functions over `ChittiGroup`/`Cycle`/`Member`.
- Location: `src/utils/chitti.ts`
- Depends on: `src/types` only.
- Used by: Screens and `GroupCard`.

**Data Access:**
- Purpose: Persistence abstraction.
- Location: `src/storage/index.ts` (shim), `src/lib/firestore.ts` (Firestore CRUD), `src/lib/firebase.ts` (SDK init).
- Depends on: `firebase/app`, `firebase/auth`, `firebase/firestore`.

## Data Flow

### Primary Request Path (load groups on Home)

1. User authenticated, `HomeScreen` mounted (`src/screens/HomeScreen.tsx:24`).
2. `useFocusEffect` calls `getGroups()` from `src/storage/index.ts:13`.
3. Shim resolves `auth.currentUser.uid` (`src/storage/index.ts:7`) and delegates to `FS.getGroups(uid)`.
4. `getGroups` reads `users/{uid}/groups` via `getDocs` (`src/lib/firestore.ts:11`).
5. Documents are cast to `ChittiGroup[]` and returned to screen state.
6. `FlatList` renders each via `GroupCard` (`src/components/GroupCard.tsx`).

### Mutation Path (upsert group)

1. Screen builds/edits a `ChittiGroup` (e.g. `CreateGroupScreen`, `DrawScreen`).
2. Calls `upsertGroup(group)` from `src/storage/index.ts:21`.
3. Shim → `FS.upsertGroup(uid, group)` → `setDoc(doc(db,'users',uid,'groups',gid), stripUndefined(group))` (`src/lib/firestore.ts:25`).
4. `stripUndefined` round-trips through `JSON.parse(JSON.stringify(...))` to remove `undefined` fields rejected by Firestore.

### Auth Flow

1. `LoginScreen` invokes either `signInWithPopup(auth, new GoogleAuthProvider())` or `signInWithPhoneNumber` + OTP confirm (`src/screens/LoginScreen.tsx:22-60`).
2. Firebase emits an `onAuthStateChanged` event.
3. `AuthProvider` updates `user` state (`src/lib/AuthContext.tsx:17`).
4. `AppNavigator` re-renders authenticated stack (`src/navigation/AppNavigator.tsx:46`).

### Public Member Deep Link

1. Inbound URL `chitti://member/:token` or `https://chitti-app-edfb1.web.app/member/:token` matches `linking.config` (`src/navigation/AppNavigator.tsx:20`).
2. `MemberPublicViewScreen` reads `token` route param.
3. `getGroupByMemberToken(token)` reads `memberTokens/{token}` to resolve `{uid, groupId, memberId}`, then loads the owner's group (`src/lib/firestore.ts:34`).

**State Management:**
- No global store. Local `useState` per screen + two React Contexts (`AuthContext`, `ThemeContext`). Server state is fetched on focus via `useFocusEffect`.

## Key Abstractions

**`ChittiGroup`:**
- Purpose: Aggregate root containing members and cycles for a chit fund.
- Examples: `src/types/index.ts:32`, persisted at `users/{uid}/groups/{id}`.
- Pattern: Document aggregate — entire group document read/written as a unit.

**`Cycle`:**
- Purpose: One monthly draw + payment ledger.
- Examples: `src/types/index.ts:17`, generated by `initializeCycles` (`src/utils/chitti.ts:3`).
- Pattern: Pre-allocated array of length `durationMonths`, mutated in place when `conducted`.

**Storage shim:**
- Purpose: Decouple screens from data backend.
- Examples: `src/storage/index.ts` re-exports `getGroups/getGroupById/upsertGroup/deleteGroup` regardless of backend.
- Pattern: Facade — uid is captured from `auth.currentUser` and forwarded to the underlying Firestore module.

**Theming:**
- Purpose: Light/dark color tokens and Inter font helpers.
- Examples: `src/lib/theme.ts` (`light`, `dark`, `fonts`), `useTheme()` from `src/lib/ThemeContext.tsx`.
- Pattern: Component-local `makeStyles(colors)` factory memoized with `useMemo`.

## Entry Points

**Native/Web bundle entry:**
- Location: `index.ts`
- Triggers: Expo runtime (`registerRootComponent`).
- Responsibilities: Mounts `App`.

**App shell:**
- Location: `App.tsx`
- Triggers: Mounted by Expo.
- Responsibilities: Loads Inter fonts, installs `react-native-gesture-handler` + `react-native-get-random-values` side-effect imports, renders provider tree.

**Navigation root:**
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

**What happens:** `src/lib/firestore.ts:21` uses `JSON.parse(JSON.stringify(obj))` before every `setDoc` to strip `undefined` fields.
**Why it's wrong:** Drops `Date`, `Map`, class instances, and silently rewrites non-JSON values; obscures the real shape of the document and adds a full-tree clone per write.
**Do this instead:** Set optional fields to explicit `null` in the domain types, or omit them with a typed sanitizer that returns `Partial<ChittiGroup>`.

### Web-only auth on a cross-platform Expo app

**What happens:** `LoginScreen` calls `signInWithPopup` and constructs a `RecaptchaVerifier` against a DOM element id `recaptcha-container` (`src/screens/LoginScreen.tsx:25,39`).
**Why it's wrong:** These APIs do not exist on iOS/Android React Native; the login screen will throw on device.
**Do this instead:** Use `expo-auth-session` (already a dep) for Google on native and `@react-native-firebase/auth` or Expo's Firebase JS phone-auth recipe per platform; branch with `Platform.OS`.

### `window.confirm` for delete UX

**What happens:** `HomeScreen.handleDelete` calls `window.confirm` and falls through to delete on native (`src/screens/HomeScreen.tsx:27-31`).
**Why it's wrong:** On native there is no confirmation — taps delete instantly.
**Do this instead:** Use `Alert.alert` from `react-native` with cross-platform fallback.

### Reading entire group document for every screen

**What happens:** Every screen fetches the whole `ChittiGroup` (`getGroupById`) and writes it back wholesale (`upsertGroup`).
**Why it's wrong:** Race conditions on concurrent edits, large payloads as `members`/`cycles` grow, no atomic field updates.
**Do this instead:** Use Firestore `updateDoc` with field paths, or migrate `members`/`cycles` to subcollections.

### Hard-coded Firebase API key in source

**What happens:** `src/lib/firebase.ts:5-12` embeds the project's web API key.
**Why it's wrong:** Even though Firebase web keys are not secrets per se, committing project IDs and keys means no per-environment config (dev/prod) and rotation requires a code change.
**Do this instead:** Read from `expo-constants` `extra` populated by `app.config.ts` from environment variables.

## Error Handling

**Strategy:** Try/catch in screen-level async handlers; surface errors via local `error` state or `Alert`. The data layer throws; nothing retries.

**Patterns:**
- `LoginScreen` catches Firebase errors and stores `e.message` in `error` state (`src/screens/LoginScreen.tsx:26`).
- `src/storage/index.ts:9` throws `Error('Not authenticated')` if `auth.currentUser` is null.
- Firestore `getGroupById` returns `null` for missing docs rather than throwing (`src/lib/firestore.ts:16`).

## Cross-Cutting Concerns

**Logging:** None — no logger, no `console.log` usage in production paths.
**Validation:** Ad hoc in screens (e.g. phone length check in `LoginScreen.sendOTP`).
**Authentication:** Firebase Auth (Google popup + Phone OTP). Session state observed via `onAuthStateChanged`; gating happens in `AppNavigator`.
**Theming:** `ThemeContext` provides `colors`, `isDark`, `toggleTheme`; consumed by every screen and component via `useTheme()`.
**Fonts:** Inter family loaded once in `App.tsx`; referenced via `fonts.{regular|medium|semiBold|bold|extraBold}` from `src/lib/theme.ts`.
**Deep linking:** Configured in `AppNavigator` `linking` (`src/navigation/AppNavigator.tsx:20`); enables shareable member view.

---

*Architecture analysis: 2026-05-22*
