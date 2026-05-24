import { ExpoConfig, ConfigContext } from 'expo/config';

// app.config.ts — Phase 01 plan 01-02 (DATA-04).
// Replaces app.json (deleted in the same commit). RNFirebase config plugin
// is registered here; `extra.firebase` is populated from EXPO_PUBLIC_FIREBASE_*
// at config-evaluation time so that Constants.expoConfig.extra.firebase is
// available at runtime via src/lib/firebase.ts.
//
// forceStaticLinking: ['RNFBApp', 'RNFBAuth'] is MANDATORY on RN 0.84+ /
// Expo SDK 54+ — without it the iOS prebuild fails with "non-modular header
// inside framework module RNFBApp" (Pitfall A, RESEARCH §Pitfall A).
//
// Bundle identifier + Android package are locked to `com.chitti.app` for
// Phase 01. When the iOS / Android apps are registered in the Firebase
// console, the real GoogleService-Info.plist + google-services.json files
// must replace the stubs at the project root.

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'ChittiApp',
  slug: 'ChittiApp',
  scheme: 'chitti',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.chitti.app',
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? './GoogleService-Info.plist',
  },
  android: {
    package: 'com.chitti.app',
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png' },
  plugins: [
    'expo-font',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    'expo-dev-client',
    [
      'expo-build-properties',
      {
        ios: {
          useFrameworks: 'static',
          forceStaticLinking: ['RNFBApp', 'RNFBAuth'],
        },
      },
    ],
  ],
  extra: {
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    },
  },
});
