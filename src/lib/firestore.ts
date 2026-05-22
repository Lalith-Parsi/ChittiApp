import {
  collection, doc, getDocs, getDoc, setDoc,
  deleteDoc, query, where, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { ChittiGroup } from '../types';

const groupsCol = (uid: string) => collection(db, 'users', uid, 'groups');
const groupDoc  = (uid: string, gid: string) => doc(db, 'users', uid, 'groups', gid);

export async function getGroups(uid: string): Promise<ChittiGroup[]> {
  const snap = await getDocs(groupsCol(uid));
  return snap.docs.map(d => d.data() as ChittiGroup);
}

export async function getGroupById(uid: string, gid: string): Promise<ChittiGroup | null> {
  const snap = await getDoc(groupDoc(uid, gid));
  return snap.exists() ? (snap.data() as ChittiGroup) : null;
}

function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export async function upsertGroup(uid: string, group: ChittiGroup): Promise<void> {
  await setDoc(groupDoc(uid, group.id), stripUndefined(group));
}

export async function deleteGroup(uid: string, gid: string): Promise<void> {
  await deleteDoc(groupDoc(uid, gid));
}

// Shareable member token lookup
export async function getGroupByMemberToken(token: string): Promise<{ group: ChittiGroup; memberId: string } | null> {
  const snap = await getDoc(doc(db, 'memberTokens', token));
  if (!snap.exists()) return null;
  const { uid, groupId, memberId } = snap.data() as { uid: string; groupId: string; memberId: string };
  const group = await getGroupById(uid, groupId);
  return group ? { group, memberId } : null;
}

export async function saveMemberToken(token: string, uid: string, groupId: string, memberId: string): Promise<void> {
  await setDoc(doc(db, 'memberTokens', token), { uid, groupId, memberId });
}
