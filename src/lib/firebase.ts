// src/lib/firebase.ts — Phase 02 architecture redesign.
//
// Firebase app init only. Firestore has been removed — all data now lives in
// Supabase (PostgreSQL). This file keeps the Firebase app singleton alive so
// that @react-native-firebase/auth (phone OTP) and @react-native-firebase/messaging
// (FCM push notifications) continue to work.
//
// Reads config from `Constants.expoConfig.extra.firebase` (populated by
// app.config.ts from EXPO_PUBLIC_FIREBASE_* env vars).

import Constants from 'expo-constants';
import { initializeApp, getApps, FirebaseOptions } from 'firebase/app';

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

export default app;
