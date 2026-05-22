import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './firebase';
import { resetDemoData, seedDemoData } from '../storage/demo';

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
    const unsub = onAuthStateChanged(auth, u => {
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
    try { await signOut(auth); } catch { /* not signed in, ignore */ }
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
