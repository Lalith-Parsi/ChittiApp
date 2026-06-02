// src/lib/supabase.ts
//
// Supabase client singleton. Reads credentials from `Constants.expoConfig.extra`
// (populated by app.config.ts from EXPO_PUBLIC_SUPABASE_* env vars).
//
// AUTH SPLIT: Firebase Auth manages the user session. We disable Supabase's own
// auth flow entirely. The Firebase JWT is injected per-request via AuthContext.tsx
// using `supabase.auth.setSession(...)` whenever the Firebase token changes.
// This enables Supabase Row Level Security (RLS) policies to use
// `auth.jwt() ->> 'sub'` as the Firebase UID.

import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

interface ExpoSupabaseExtra {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function readConfig(): { url: string; anonKey: string } {
  const extra = (Constants.expoConfig?.extra ?? {}) as Partial<ExpoSupabaseExtra>;
  if (!extra.supabaseUrl || !extra.supabaseAnonKey) {
    throw new Error(
      'Supabase config missing from Constants.expoConfig.extra — ' +
        'check .env (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY required).',
    );
  }
  return { url: extra.supabaseUrl, anonKey: extra.supabaseAnonKey };
}

const { url, anonKey } = readConfig();

export const supabase = createClient(url, anonKey, {
  auth: {
    // Firebase manages the session — disable Supabase's own auth flow
    autoRefreshToken: false,
    persistSession: false,
    detectSessionFromUrl: false,
  },
});
