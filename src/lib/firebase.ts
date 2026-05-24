// src/lib/firebase.ts — Phase 01 plan 01-04 (DATA-04).
//
// Loads the Firebase Web SDK config from `Constants.expoConfig.extra.firebase`
// (populated by app.config.ts from EXPO_PUBLIC_FIREBASE_* env vars).
// Throws a loud, named error at module-eval time when keys are missing —
// surfacing config drift immediately rather than silently mis-initializing.
//
// AUTH SPLIT (Plan 01-04): Auth is no longer served from this file. Native
// phone-auth flows through '@react-native-firebase/auth' — import it directly
// at call sites (`import auth from '@react-native-firebase/auth'`). This file
// owns only the Firestore JS-SDK initialization for now; if/when Firestore
// moves native (Phase 2+), this file can shrink to a default-app export.

import Constants from 'expo-constants';
import { initializeApp, getApps, FirebaseOptions } from 'firebase/app';
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

export default app;
