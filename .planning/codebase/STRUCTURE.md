# Codebase Structure

**Analysis Date:** 2026-05-22

## Directory Layout

```
ChittiApp/
├── App.tsx                       # Provider tree + font loading + navigator mount
├── index.ts                      # Expo `registerRootComponent` entry
├── app.json                      # Expo config (name, icons, plugins, linking schemes)
├── package.json                  # Deps + Expo scripts (start/android/ios/web)
├── tsconfig.json                 # Extends `expo/tsconfig.base`, strict: true
├── AGENTS.md / CLAUDE.md         # Agent instructions (Expo v56 docs reminder)
├── LICENSE
├── assets/                       # Static images: icons, splash, favicon
│   ├── android-icon-background.png
│   ├── android-icon-foreground.png
│   ├── android-icon-monochrome.png
│   ├── favicon.png
│   ├── icon.png
│   └── splash-icon.png
├── .claude/                      # Claude Code workspace settings
└── src/
    ├── components/               # Reusable presentational components
    │   └── GroupCard.tsx
    ├── lib/                      # Cross-cutting infra: Firebase, contexts, theme
    │   ├── AuthContext.tsx
    │   ├── firebase.ts
    │   ├── firestore.ts
    │   ├── theme.ts
    │   └── ThemeContext.tsx
    ├── navigation/               # Stack navigator + route param types
    │   ├── AppNavigator.tsx
    │   └── types.ts
    ├── screens/                  # One file per route in `RootStackParamList`
    │   ├── AddMemberScreen.tsx
    │   ├── CreateGroupScreen.tsx
    │   ├── DrawScreen.tsx
    │   ├── GroupDetailScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── LoginScreen.tsx
    │   ├── MemberDetailScreen.tsx
    │   ├── MemberPublicViewScreen.tsx
    │   └── PaymentTrackingScreen.tsx
    ├── storage/                  # Auth-aware data facade
    │   └── index.ts
    ├── types/                    # Domain types
    │   └── index.ts
    └── utils/                    # Pure domain logic
        └── chitti.ts
```

## Directory Purposes

**`src/components/`:**
- Purpose: Reusable, presentational components (no data fetching).
- Contains: Function components with theme-driven styles.
- Key files: `GroupCard.tsx`.

**`src/lib/`:**
- Purpose: Cross-cutting infrastructure used by screens and providers.
- Contains: Firebase init, Firestore CRUD, Auth/Theme contexts, theme color tokens & font definitions.
- Key files: `firebase.ts`, `firestore.ts`, `AuthContext.tsx`, `ThemeContext.tsx`, `theme.ts`.

**`src/navigation/`:**
- Purpose: Stack navigator, deep linking config, and route param typing.
- Contains: `AppNavigator.tsx` (route table + linking), `types.ts` (`RootStackParamList`).

**`src/screens/`:**
- Purpose: One file per navigation route. Owns screen layout, form state, and orchestrates calls into `storage` and `utils`.
- Contains: Default-exported function components named `<Name>Screen`.
- Key files: `HomeScreen.tsx` (group list), `LoginScreen.tsx` (auth), `GroupDetailScreen.tsx`.

**`src/storage/`:**
- Purpose: Thin auth-aware facade over Firestore. Screens import only from here.
- Contains: `index.ts` exporting `getGroups`, `getGroupById`, `upsertGroup`, `deleteGroup`.

**`src/types/`:**
- Purpose: Shared domain types.
- Contains: `index.ts` with `ChittiGroup`, `Member`, `Cycle`, `Payment`, `DrawType`.

**`src/utils/`:**
- Purpose: Pure helper functions over domain types — no React, no Firebase.
- Contains: `chitti.ts` (cycle init, dividends, eligibility, formatting).

**`assets/`:**
- Purpose: Static images consumed by `app.json` and React Native `require`/`import`.
- Generated: No. Committed: Yes.

**`.claude/`:**
- Purpose: Claude Code workspace settings (`settings.json`, `settings.local.json`).
- Generated: No. Committed: `settings.json` only (per `.gitignore` conventions).

## Key File Locations

**Entry Points:**
- `index.ts`: Registers `App` with Expo.
- `App.tsx`: Provider tree + font loading.

**Configuration:**
- `app.json`: Expo project config — name, icons, splash, `expo-font` plugin.
- `tsconfig.json`: Extends `expo/tsconfig.base`, enables `strict`.
- `package.json`: Scripts (`start`, `android`, `ios`, `web`) and dependency versions.
- `src/lib/firebase.ts`: Hard-coded Firebase web config (project `chitti-app-edfb1`).

**Core Logic:**
- `src/lib/firestore.ts`: Firestore CRUD against `users/{uid}/groups/*` and `memberTokens/{token}`.
- `src/storage/index.ts`: Auth-aware shim that injects `uid`.
- `src/utils/chitti.ts`: All pure chit-fund domain logic.
- `src/navigation/AppNavigator.tsx`: Route table + auth gating + deep linking.

**Testing:**
- None — no test framework configured, no `*.test.*` / `*.spec.*` files in repo.

## Naming Conventions

**Files:**
- Screens: `PascalCaseScreen.tsx` (e.g. `HomeScreen.tsx`, `MemberPublicViewScreen.tsx`).
- Components: `PascalCase.tsx` (e.g. `GroupCard.tsx`).
- Contexts: `PascalCaseContext.tsx` (e.g. `AuthContext.tsx`, `ThemeContext.tsx`).
- Infra modules: `camelCase.ts` (e.g. `firebase.ts`, `firestore.ts`, `theme.ts`).
- Barrels: `index.ts` (used in `src/storage/`, `src/types/`).

**Directories:**
- Lowercase singular nouns (`components`, `lib`, `navigation`, `screens`, `storage`, `types`, `utils`).

**Identifiers:**
- React components: `PascalCase` (`AppNavigator`, `GroupCard`).
- Functions and variables: `camelCase` (`getGroups`, `signInWithGoogle`).
- Types/interfaces: `PascalCase` (`ChittiGroup`, `Member`, `RootStackParamList`).
- Constants: occasional `UPPER_SNAKE_CASE` (`STORAGE_KEY`, `DRAW_OPTIONS`).
- Hooks: `useXxx` (`useAuth`, `useTheme`).

## Where to Add New Code

**New Screen:**
- Implementation: `src/screens/<Name>Screen.tsx` (default export).
- Register: add to `RootStackParamList` in `src/navigation/types.ts` and a `<Stack.Screen>` in `src/navigation/AppNavigator.tsx`.
- If publicly linkable, add a `screens` entry to `linking.config`.

**New Reusable Component:**
- Implementation: `src/components/<Name>.tsx`.
- Style with `makeStyles(colors)` factory + `useTheme()` per the `GroupCard.tsx` pattern.

**New Domain Field:**
- Type: extend `src/types/index.ts`.
- Logic: add pure helper to `src/utils/chitti.ts`.
- Persistence: no schema change needed — Firestore is schemaless; ensure `stripUndefined` semantics are acceptable (`src/lib/firestore.ts:21`).

**New Firestore Read/Write:**
- Add to `src/lib/firestore.ts` (takes explicit `uid`).
- Re-export auth-aware wrapper from `src/storage/index.ts`.

**New Cross-Cutting State:**
- Add a new `*Context.tsx` in `src/lib/` and wrap it in `App.tsx` provider tree.

**New Static Asset:**
- Place under `assets/`; reference from `app.json` (icons) or via `require('../../assets/...')` from code.

**New Environment / Secret:**
- Currently no env layer. Recommended: introduce `app.config.ts` reading `process.env` and feeding `extra` into `expo-constants`; then refactor `src/lib/firebase.ts` to read from there.

## Special Directories

**`assets/`:**
- Purpose: App icons, splash, favicon referenced by `app.json`.
- Generated: No. Committed: Yes.

**`.claude/`:**
- Purpose: Claude Code workspace and per-user settings.
- Generated: Partially (`settings.local.json`). Committed: typically only `settings.json`.

**`.git/`:**
- Purpose: Git metadata.
- Generated: Yes. Committed: N/A.

**`node_modules/`:**
- Purpose: Installed packages.
- Generated: Yes (by `npm install`). Committed: No.

---

*Structure analysis: 2026-05-22*
