/**
 * Storage shim — routes every screen call to either the in-memory demo store
 * (when `__demoMode` from AuthContext is on) or to Supabase (PostgreSQL) using
 * the real user's Firebase UID. Screens import from '../storage' and never
 * know which backend is active.
 */
import auth from '@react-native-firebase/auth';
import { __demoMode } from '../lib/AuthContext';
import * as FS from '../lib/supabase-db';
import * as Demo from './demo';
import { ChittiGroup } from '../types';

// Re-export public token functions used by MemberPublicViewScreen and AddMemberScreen
export { getGroupByMemberToken, saveMemberToken } from '../lib/supabase-db';

function uid(): string {
  const u = auth().currentUser;
  if (!u) throw new Error('Not authenticated');
  return u.uid;
}

export async function getGroups(): Promise<ChittiGroup[]> {
  if (__demoMode) return Demo.getGroups();
  return FS.getGroups(uid());
}

export async function getGroupById(id: string): Promise<ChittiGroup | null> {
  if (__demoMode) return Demo.getGroupById(id);
  return FS.getGroupById(uid(), id);
}

export async function upsertGroup(group: ChittiGroup): Promise<void> {
  if (__demoMode) return Demo.upsertGroup(group);
  return FS.upsertGroup(uid(), group);
}

export async function deleteGroup(id: string): Promise<void> {
  if (__demoMode) return Demo.deleteGroup(id);
  return FS.deleteGroup(uid(), id);
}
