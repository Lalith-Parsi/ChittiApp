# Coding Conventions

**Analysis Date:** 2026-05-22

## Naming Patterns

**Files:**
- React components and screens: `PascalCase.tsx` — e.g., `HomeScreen.tsx`, `GroupCard.tsx`, `AppNavigator.tsx`
- Non-component TypeScript modules: `camelCase.ts` — e.g., `firestore.ts`, `firebase.ts`, `chitti.ts`, `theme.ts`
- Context providers: `PascalCase + Context.tsx` — e.g., `AuthContext.tsx`, `ThemeContext.tsx`
- Barrel/entry modules use `index.ts` — e.g., `src/storage/index.ts`, `src/types/index.ts`

**Functions:**
- All functions use `camelCase`: `getGroups`, `upsertGroup`, `initializeCycles`, `getCurrentCycle`
- React components use `PascalCase`: `HomeScreen`, `GroupCard`, `AuthProvider`
- Custom hooks use `use` prefix: `useAuth`, `useTheme`
- Style factory functions use `makeStyles(c: ThemeColors)` pattern — `src/screens/HomeScreen.tsx:122`, `src/components/GroupCard.tsx:95`
- Internal helpers placed at top of file (uppercase optional): `ordinal` in `src/components/GroupCard.tsx:9`, `stripUndefined` in `src/lib/firestore.ts:21`

**Variables:**
- Local variables and state: `camelCase` — `groups`, `showArchived`, `pendingCount`
- React state pairs use `[x, setX]` with `setX` PascalCase suffix: `[user, setUser]`, `[loading, setLoading]`
- Short single-letter names allowed in tight callbacks/maps: `d`, `g`, `m`, `p`, `c`, `t`, `u`, `v` (see `src/lib/firestore.ts:13`, `src/utils/chitti.ts:8`)
- Theme/color parameter consistently shortened to `c` in style factories

**Types:**
- TypeScript `interface` for object shapes: `Member`, `Payment`, `Cycle`, `ChittiGroup`, `ThemeColors`, `Props`, `AuthContextType` — see `src/types/index.ts`
- `type` aliases for unions and narrow string literals: `DrawType = 'lottery' | 'auction' | 'self-assign'` in `src/types/index.ts:30`, `Step = 'home' | 'phone' | 'otp'` in `src/screens/LoginScreen.tsx:9`
- Local navigation type alias `type Nav = NativeStackNavigationProp<...>` — `src/screens/HomeScreen.tsx:13`
- Component props typed via inline `interface Props { ... }` adjacent to the component — `src/components/GroupCard.tsx:15`

## Code Style

**Formatting:**
- No `.prettierrc`, `.eslintrc`, `eslint.config.*`, or `biome.json` present at repo root. No linter/formatter is configured.
- Observed conventions (de facto):
  - 2-space indentation
  - Single quotes for strings
  - Semicolons terminate statements
  - Trailing commas in multi-line object/array literals
  - Aligned assignments using extra spaces for readability — `src/lib/theme.ts:26-46`, `src/screens/HomeScreen.tsx:20-22`, `src/screens/LoginScreen.tsx:15-20`
  - Arrow functions for callbacks; `function` keyword for top-level exports and React components
  - One-line JSX returns kept on single line when short; multi-line JSX wrapped with parens

**Linting:**
- None configured.
- TypeScript `strict: true` in `tsconfig.json` is the only static-analysis safety net. Extends `expo/tsconfig.base`.

## Import Organization

**Order observed across files (e.g., `src/screens/HomeScreen.tsx`, `src/components/GroupCard.tsx`):**
1. `react` core (`React`, hooks)
2. `react-native` primitives (`View`, `Text`, `StyleSheet`, ...)
3. Third-party libraries (`@react-navigation/*`, `@expo/vector-icons`, `firebase/*`)
4. Local types (`../types`)
5. Local storage / lib / utils (`../storage`, `../lib/...`, `../utils/...`)
6. Local components (`../components/...`)
7. Local navigation types (`../navigation/types`)

Side-effect imports at the very top of `App.tsx` (`'react-native-gesture-handler'`, `'react-native-get-random-values'`).

**Path Aliases:**
- None configured. All local imports use relative paths (`../types`, `../lib/firebase`, `./types`).

## Error Handling

**Patterns:**
- Async UI flows use `try / catch / finally` with `setLoading` toggling and an `error` state string surfaced into the JSX — `src/screens/LoginScreen.tsx:22-61`
- Catch clauses typed `(e: any)` and read `e.message ?? 'Fallback message'` — `src/screens/LoginScreen.tsx:26`, `:43`
- Some catches swallow the error and just set a friendly message — `src/screens/LoginScreen.tsx:56` (`catch { setError('Invalid OTP...') }`)
- Library/data layer throws plain `Error` for invariant violations: `throw new Error('Not authenticated')` in `src/storage/index.ts:9`
- Firestore helpers (`src/lib/firestore.ts`) do NOT wrap errors — they let them propagate to the caller
- Screen-level deletes use fire-and-forget `.then(...)` without `.catch(...)` — `src/screens/HomeScreen.tsx:31` (silently ignores failure)
- Confirmation dialogs use `window.confirm` guarded by `typeof window !== 'undefined'` (web-first) — `src/screens/HomeScreen.tsx:27`

## Logging

**Framework:** None. No logger, no `console.*` calls observed in inspected files.

**Patterns:**
- Errors are surfaced to users via inline `<Text style={styles.error}>` UI, not logged
- No telemetry or analytics SDK wired in

## Comments

**When to Comment:**
- Sparse. Comments only appear to explain non-obvious architectural decisions:
  - `src/storage/index.ts:1` — "Shim: delegates all calls to Firestore..."
  - `src/lib/firestore.ts:33` — "Shareable member token lookup"
  - `index.ts:5-7` — explains `registerRootComponent`
- No inline narration of straightforward code

**JSDoc/TSDoc:**
- Not used anywhere. Rely on TypeScript types for documentation.

## Function Design

**Size:**
- Utility functions in `src/utils/chitti.ts` are tight (1-5 lines each)
- Storage/Firestore wrappers are one-liners delegating to the SDK
- Screen components are larger (100-160+ lines) and contain both logic and a `makeStyles` factory in the same file

**Parameters:**
- Positional arguments for 1-3 params (`getGroupById(uid, gid)`)
- Object destructuring for React component props: `function GroupCard({ group, onPress, onDelete }: Props)`
- Default values and `??` for optional fallbacks: `group.drawType ?? 'lottery'` in `src/utils/chitti.ts:11`

**Return Values:**
- All async functions return `Promise<T>` with explicit return type annotations — `src/lib/firestore.ts:11,16,25,29`
- Nullable returns use `T | null` rather than `undefined` — `getGroupById`, `getCurrentCycle`
- Pure utility functions never mutate inputs; they return new objects/arrays — `syncCyclePayments` returns `{ ...cycle, payments }`

## Module Design

**Exports:**
- React components and screens: `export default` for the primary component
- Library modules: named `export` for every function (`export async function getGroups(...)`)
- Constants and types: named `export` (`export const auth`, `export interface ChittiGroup`)
- `src/lib/firebase.ts` mixes both: named exports for `auth`/`db` plus `export default app`

**Barrel Files:**
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

---

*Convention analysis: 2026-05-22*
