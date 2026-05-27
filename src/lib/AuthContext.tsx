import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { resetDemoData, seedDemoData } from '../storage/demo';

type User = FirebaseAuthTypes.User;

/**
 * `@react-native-firebase/app` declares `"exports": { "react-native": "*" }` —
 * it is a native-only module and resolves to undefined on web. Touching `auth()`
 * on web throws "auth is not a function" at module init, crashing the app.
 *
 * Web is dev-only per PROJECT.md, so we no-op the native auth listener on web
 * and rely entirely on demo mode (`enterDemoMode()`) for previewing the app in
 * a browser. iOS + Android use the real native listener.
 */
const IS_WEB = Platform.OS === 'web';

/**
 * Minimal shape of the signed-in user that the rest of the app cares about.
 * Real Firebase `User` is assignable to this; demo mode constructs a fake one.
 */
interface AppUser {
  uid: string;
  phoneNumber: string | null;
  isDemo: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isDemo: boolean;
  enterDemoMode: () => void;
  leaveDemoMode: () => Promise<void>;
}

const DEMO_USER: AppUser = {
  uid: 'demo-user',
  phoneNumber: '+91 98765 43210',
  isDemo: true,
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemo: false,
  enterDemoMode: () => {},
  leaveDemoMode: async () => {},
});

/** Module-level flag the storage shim reads to decide whether to route to demo
 *  or to Firestore. Lives outside React so storage helpers (which aren't hooks)
 *  can check it synchronously. */
export let __demoMode = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [demoActive, setDemoActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_WEB) {
      // No native auth on web — flip loading off so the LoginScreen renders.
      // Real sign-in is unavailable here; use demo mode to preview.
      setLoading(false);
      return;
    }
    const unsub = auth().onAuthStateChanged(u => {
      setFirebaseUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const enterDemoMode = useCallback(() => {
    __demoMode = true;
    seedDemoData();
    setDemoActive(true);
  }, []);

  const leaveDemoMode = useCallback(async () => {
    __demoMode = false;
    resetDemoData();
    setDemoActive(false);
    // Also sign out of Firebase if there happens to be a real user — keeps state tidy.
    // Skip on web (native auth isn't loaded there).
    if (!IS_WEB) {
      try { await auth().signOut(); } catch { /* not signed in, ignore */ }
    }
  }, []);

  const user: AppUser | null = demoActive
    ? DEMO_USER
    : firebaseUser
      ? { uid: firebaseUser.uid, phoneNumber: firebaseUser.phoneNumber, isDemo: false }
      : null;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isDemo: demoActive,
      enterDemoMode,
      leaveDemoMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
