import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { ThemeProvider } from './src/lib/ThemeContext';
import { AuthProvider } from './src/lib/AuthContext';
import { ToastProvider } from './src/lib/ToastContext';
import AppNavigator from './src/navigation/AppNavigator';

// FCM background handler — must be registered at module level (before the component).
// Handles notifications when the app is closed or in the background.
if (Platform.OS !== 'web') {
  const { default: messaging } = require('@react-native-firebase/messaging');
  messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
    console.log('[FCM] Background message:', remoteMessage);
  });
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  // Register FCM device token after app mounts.
  // Skipped on web (native modules unavailable there).
  useEffect(() => {
    if (Platform.OS === 'web') return;

    async function registerFCM() {
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        const auth = require('@react-native-firebase/auth').default;
        const { upsertFcmToken } = require('./src/lib/supabase-db');

        // Request permission (iOS asks; Android 13+ asks; older Android grants automatically)
        const status = await messaging().requestPermission();
        const granted =
          status === 1 /* AUTHORIZED */ || status === 2; /* PROVISIONAL */
        if (!granted) return;

        const fcmToken = await messaging().getToken();
        const user = auth().currentUser;
        if (user && fcmToken) {
          await upsertFcmToken(
            user.uid,
            fcmToken,
            Platform.OS === 'ios' ? 'ios' : 'android',
          );
        }
      } catch (e) {
        // FCM registration failure is non-fatal — app works without push notifications
        console.warn('[FCM] Token registration failed:', e);
      }
    }

    registerFCM();

    // Foreground message handler — FCM doesn't auto-show a banner when app is open,
    // so we log it here. Connect to ToastProvider in a future iteration for in-app alerts.
    const messaging = require('@react-native-firebase/messaging').default;
    const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
      console.log('[FCM] Foreground message:', remoteMessage);
    });

    return unsubscribe;
  }, []);

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#0F0F1A' }} />;

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppNavigator />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
