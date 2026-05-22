# Technology Stack

**Analysis Date:** 2026-05-22

## Languages

**Primary:**
- TypeScript ~6.0.3 (strict mode) - All app source under `src/`, `App.tsx`, `index.ts`
- TSX - React Native component files (e.g., `src/screens/*.tsx`, `src/components/GroupCard.tsx`)

**Secondary:**
- JSON - Configuration (`package.json`, `app.json`, `tsconfig.json`)

## Runtime

**Environment:**
- React Native 0.85.3 (mobile runtime via Expo SDK 56)
- React 19.2.3 / React DOM 19.2.3
- Expo Go / native build via `registerRootComponent` in `index.ts`
- Web target via `react-native-web` ^0.21.2 and `@expo/metro-runtime` ~56.0.11

**Package Manager:**
- npm (inferred from `package-lock.json`)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- Expo SDK ~56.0.3 - Cross-platform app framework (iOS, Android, Web)
  - Pinned SDK; per `AGENTS.md` must follow https://docs.expo.dev/versions/v56.0.0/
- React Native 0.85.3 - Mobile UI primitives
- React Navigation 7.x - Routing
  - `@react-navigation/native` ^7.2.4
  - `@react-navigation/native-stack` ^7.15.1
  - `@react-navigation/bottom-tabs` ^7.16.1
  - Configured in `src/navigation/AppNavigator.tsx`, `src/navigation/types.ts`

**Testing:**
- None detected - no test framework, no test files, no test scripts in `package.json`

**Build/Dev:**
- Expo CLI - `expo start`, `expo start --android`, `expo start --ios`, `expo start --web` (see `package.json` scripts)
- Metro bundler (via `@expo/metro-runtime`)
- TypeScript ~6.0.3 with `expo/tsconfig.base` extension (`tsconfig.json`)

## Key Dependencies

**Critical:**
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

**Infrastructure:**
- `@expo/vector-icons` ^15.1.1 - Ionicons used across screens (e.g., `src/screens/LoginScreen.tsx`)
- `@expo-google-fonts/inter` ^0.4.2 - Inter font family loaded via `useFonts` in `App.tsx`
- `expo-font` ~56.0.5 - Font loader (also registered as plugin in `app.json`)
- `expo-status-bar` ~56.0.4 - Status bar control
- `react-native-web` ^0.21.2 - Web platform support

## Configuration

**Environment:**
- No `.env*` files present (only `.env*.local` ignored in `.gitignore`)
- Firebase config is hardcoded as a literal object in `src/lib/firebase.ts` (apiKey, projectId, appId, etc.) - not env-driven
- No runtime environment variables consumed by app code

**Build:**
- `app.json` - Expo app manifest (name `ChittiApp`, slug `ChittiApp`, version `1.0.0`, plugins: `expo-font`)
- `tsconfig.json` - Extends `expo/tsconfig.base`, `strict: true`
- `package.json` - Dependencies + Expo scripts
- No Babel, Metro, ESLint, Prettier, or Jest config files present

## Platform Requirements

**Development:**
- Node.js (version not pinned via `.nvmrc`)
- npm
- Expo CLI (invoked via `npx expo` through `package.json` scripts)
- Per `AGENTS.md`: read Expo v56 versioned docs before writing code

**Production:**
- iOS (`supportsTablet: true` in `app.json`)
- Android (adaptive icon configured, `predictiveBackGestureEnabled: false`)
- Web (favicon configured, served via `react-native-web` + Metro)
- Native folders `/ios` and `/android` are gitignored (Expo-managed workflow)

---

*Stack analysis: 2026-05-22*
