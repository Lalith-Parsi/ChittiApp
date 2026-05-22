// Shim: delegates all calls to Firestore using the current user's UID.
// Screens continue to import from '../storage' unchanged.
import { auth } from '../lib/firebase';
import * as FS from '../lib/firestore';
import { ChittiGroup } from '../types';

function uid(): string {
  const u = auth.currentUser;
  if (!u) throw new Error('Not authenticated');
  return u.uid;
}

export async function getGroups(): Promise<ChittiGroup[]> {
  return FS.getGroups(uid());
}

export async function getGroupById(id: string): Promise<ChittiGroup | null> {
  return FS.getGroupById(uid(), id);
}

export async function upsertGroup(group: ChittiGroup): Promise<void> {
  return FS.upsertGroup(uid(), group);
}

export async function deleteGroup(id: string): Promise<void> {
  return FS.deleteGroup(uid(), id);
}
