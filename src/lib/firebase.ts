// src/lib/firebase.ts — Phase 01 plan 01-02 (DATA-04).
//
// Loads the Firebase Web SDK config from `Constants.expoConfig.extra.firebase`
// (populated by app.config.ts from EXPO_PUBLIC_FIREBASE_* env vars).
// Throws a loud, named error at module-eval time when keys are missing —
// surfacing config drift immediately rather than silently mis-initializing.
//
// AUTH NOTE: This file no longer exports `auth` from '@react-native-firebase/auth'.
// Plan 01-03 / 01-04 will swap consumers (AuthContext, LoginScreen) to import
// auth directly from '@react-native-firebase/auth'. To avoid breaking those
// callers between Plan 02 and Plan 04, the legacy JS-SDK `auth` export is
// retained TEMPORARILY below — see the TEMP marker.

import Constants from 'expo-constants';
import { initializeApp, getApps, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

interface ExpoFirebaseExtra {
  firebase: FirebaseOptions;
}

function readConfig(): FirebaseOptions {
  const extra = (Constants.expoConfig?.extra ?? {}) as Partial<ExpoFirebaseExtra>;
  const cfg = extra.firebase;
  if (!cfg?.apiKey || !cfg?.projectId || !cfg?.appId) {
    throw new Error(
      'Firebase config missing from Constants.expoConfig.extra.firebase — ' +
        'check .env / EAS secrets (EXPO_PUBLIC_FIREBASE_API_KEY, ' +
        'EXPO_PUBLIC_FIREBASE_PROJECT_ID, EXPO_PUBLIC_FIREBASE_APP_ID are required).',
    );
  }
  return cfg;
}

const firebaseConfig = readConfig();
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);

// TEMP: removed in Plan 01-03 when AuthContext + LoginScreen swap to
// @react-native-firebase/auth. Kept here so the in-between commit-state
// builds cleanly.
export const auth = getAuth(app);

export default app;
