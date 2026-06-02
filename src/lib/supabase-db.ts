// src/lib/supabase-db.ts — Phase 02 architecture redesign.
//
// Replaces src/lib/firestore.ts. All function signatures are identical so
// src/storage/index.ts only needs a one-line import swap.
//
// Normalization strategy: Firestore stored a ChittiGroup as one fat document
// (with nested members[] and cycles[{payments[]}]). Supabase uses 4 tables:
//   groups → members → cycles → payments
//
// Every read operation (getGroupById, getGroups) reassembles the full
// ChittiGroup shape from these 4 tables so screens receive the exact same
// TypeScript type they always have and require zero changes.
//
// Every write operation (upsertGroup) decomposes a ChittiGroup back into
// rows and batch-upserts each table using Supabase's `onConflict` upsert.

import { supabase } from './supabase';
import { ChittiGroup, Member, Cycle, Payment } from '../types';

/* ─────────────────────────── SQL row types ─────────────────────────── */

interface GroupRow {
  id: string;
  uid: string;
  name: string;
  description: string | null;
  amount: number;
  total_members: number;
  duration_months: number;
  draw_type: string;
  foreman_commission_pct: number;
  max_discount_pct: number;
  start_date: string;
  start_day: number;
  start_month: number;
  start_year: number;
  payment_day: number;
  created_at: string;
  is_active: boolean;
}

interface MemberRow {
  id: string;
  group_id: string;
  name: string;
  phone: string;
  has_received: boolean;
  cycle_received: number | null;
  joined_at: string;
  share_token: string | null;
}

interface CycleRow {
  id: string;
  group_id: string;
  cycle_number: number;
  date: string;
  winner_id: string | null;
  win_amount: number;
  discount: number | null;
  foreman_commission: number | null;
  dividend_per_member: number | null;
  draw_type: string;
  conducted: boolean;
}

interface PaymentRow {
  id: string;
  cycle_id: string;
  member_id: string;
  paid: boolean;
  paid_date: string | null;
  mode: string | null;
  note: string | null;
}

/* ─────────────────────── Row → TypeScript mappers ──────────────────── */

function rowToMember(r: MemberRow): Member {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    hasReceived: r.has_received,
    cycleReceived: r.cycle_received ?? undefined,
    joinedAt: r.joined_at,
    shareToken: r.share_token ?? undefined,
  };
}

function rowToPayment(r: PaymentRow): Payment {
  return {
    memberId: r.member_id,
    paid: r.paid,
    paidDate: r.paid_date ?? undefined,
    mode: (r.mode as Payment['mode']) ?? undefined,
    note: r.note ?? undefined,
  };
}

function rowToCycle(r: CycleRow, payments: Payment[]): Cycle {
  return {
    id: r.id,
    cycleNumber: r.cycle_number,
    date: r.date,
    payments,
    winnerId: r.winner_id ?? undefined,
    winAmount: r.win_amount,
    discount: r.discount ?? undefined,
    foremanCommission: r.foreman_commission ?? undefined,
    dividendPerMember: r.dividend_per_member ?? undefined,
    drawType: r.draw_type as Cycle['drawType'],
    conducted: r.conducted,
  };
}

function rowToGroup(r: GroupRow, members: Member[], cycles: Cycle[]): ChittiGroup {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    amount: r.amount,
    totalMembers: r.total_members,
    durationMonths: r.duration_months,
    drawType: r.draw_type as ChittiGroup['drawType'],
    foremanCommissionPct: r.foreman_commission_pct,
    maxDiscountPct: r.max_discount_pct,
    startDate: r.start_date,
    startDay: r.start_day,
    startMonth: r.start_month,
    startYear: r.start_year,
    paymentDay: r.payment_day,
    members,
    cycles,
    createdAt: r.created_at,
    isActive: r.is_active,
  };
}

/* ─────────────────────── TypeScript → Row mappers ──────────────────── */

function groupToRow(uid: string, g: ChittiGroup): Omit<GroupRow, 'created_at'> & { created_at: string } {
  return {
    id: g.id,
    uid,
    name: g.name,
    description: g.description ?? null,
    amount: g.amount,
    total_members: g.totalMembers,
    duration_months: g.durationMonths,
    draw_type: g.drawType ?? 'lottery',
    foreman_commission_pct: g.foremanCommissionPct ?? 5,
    max_discount_pct: g.maxDiscountPct ?? 30,
    start_date: g.startDate,
    start_day: g.startDay,
    start_month: g.startMonth,
    start_year: g.startYear,
    payment_day: g.paymentDay,
    created_at: g.createdAt,
    is_active: g.isActive,
  };
}

function memberToRow(groupId: string, m: Member): MemberRow {
  return {
    id: m.id,
    group_id: groupId,
    name: m.name,
    phone: m.phone,
    has_received: m.hasReceived,
    cycle_received: m.cycleReceived ?? null,
    joined_at: m.joinedAt,
    share_token: m.shareToken ?? null,
  };
}

function cycleToRow(groupId: string, c: Cycle): CycleRow {
  return {
    id: c.id,
    group_id: groupId,
    cycle_number: c.cycleNumber,
    date: c.date,
    winner_id: c.winnerId ?? null,
    win_amount: c.winAmount,
    discount: c.discount ?? null,
    foreman_commission: c.foremanCommission ?? null,
    dividend_per_member: c.dividendPerMember ?? null,
    draw_type: c.drawType,
    conducted: c.conducted,
  };
}

function paymentToRow(cycleId: string, p: Payment): Omit<PaymentRow, 'id'> {
  return {
    cycle_id: cycleId,
    member_id: p.memberId,
    paid: p.paid,
    paid_date: p.paidDate ?? null,
    mode: p.mode ?? null,
    note: p.note ?? null,
  };
}

/* ────────────────────────── Helpers ─────────────────────────────────── */

function throwIfError<T>(data: T | null, error: unknown, context: string): T {
  if (error) throw new Error(`Supabase error in ${context}: ${JSON.stringify(error)}`);
  if (data === null) throw new Error(`No data returned from ${context}`);
  return data;
}

/* ────────────────────────── Public API ──────────────────────────────── */

export async function getGroups(uid: string): Promise<ChittiGroup[]> {
  const { data: groupRows, error } = await supabase
    .from('groups')
    .select('*')
    .eq('uid', uid);
  if (error) throw new Error(`getGroups error: ${JSON.stringify(error)}`);
  if (!groupRows || groupRows.length === 0) return [];

  const groupIds = groupRows.map(g => g.id);

  // Batch fetch all child records in 3 parallel queries
  const [
    { data: memberRows, error: membErr },
    { data: cycleRows, error: cycleErr },
  ] = await Promise.all([
    supabase.from('members').select('*').in('group_id', groupIds),
    supabase.from('cycles').select('*').in('group_id', groupIds).order('cycle_number'),
  ]);
  if (membErr) throw new Error(`getGroups members error: ${JSON.stringify(membErr)}`);
  if (cycleErr) throw new Error(`getGroups cycles error: ${JSON.stringify(cycleErr)}`);

  const cycleIds = (cycleRows ?? []).map(c => c.id);
  const { data: paymentRows, error: payErr } = cycleIds.length > 0
    ? await supabase.from('payments').select('*').in('cycle_id', cycleIds)
    : { data: [], error: null };
  if (payErr) throw new Error(`getGroups payments error: ${JSON.stringify(payErr)}`);

  return assembleGroups(groupRows as GroupRow[], memberRows as MemberRow[], cycleRows as CycleRow[], paymentRows as PaymentRow[]);
}

export async function getGroupById(uid: string, gid: string): Promise<ChittiGroup | null> {
  const { data: groupRow, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', gid)
    .eq('uid', uid)
    .maybeSingle();
  if (error) throw new Error(`getGroupById error: ${JSON.stringify(error)}`);
  if (!groupRow) return null;

  const [
    { data: memberRows, error: membErr },
    { data: cycleRows, error: cycleErr },
  ] = await Promise.all([
    supabase.from('members').select('*').eq('group_id', gid),
    supabase.from('cycles').select('*').eq('group_id', gid).order('cycle_number'),
  ]);
  if (membErr) throw new Error(`getGroupById members error: ${JSON.stringify(membErr)}`);
  if (cycleErr) throw new Error(`getGroupById cycles error: ${JSON.stringify(cycleErr)}`);

  const cycleIds = (cycleRows ?? []).map(c => c.id);
  const { data: paymentRows, error: payErr } = cycleIds.length > 0
    ? await supabase.from('payments').select('*').in('cycle_id', cycleIds)
    : { data: [], error: null };
  if (payErr) throw new Error(`getGroupById payments error: ${JSON.stringify(payErr)}`);

  const groups = assembleGroups([groupRow as GroupRow], memberRows as MemberRow[], cycleRows as CycleRow[], paymentRows as PaymentRow[]);
  return groups[0] ?? null;
}

export async function upsertGroup(uid: string, group: ChittiGroup): Promise<void> {
  // 1. Upsert the group row
  const { error: gErr } = await supabase
    .from('groups')
    .upsert(groupToRow(uid, group), { onConflict: 'id' });
  if (gErr) throw new Error(`upsertGroup (groups) error: ${JSON.stringify(gErr)}`);

  // 2. Upsert members
  if (group.members.length > 0) {
    const { error: mErr } = await supabase
      .from('members')
      .upsert(group.members.map(m => memberToRow(group.id, m)), { onConflict: 'id' });
    if (mErr) throw new Error(`upsertGroup (members) error: ${JSON.stringify(mErr)}`);
  }

  // 3. Upsert cycles
  if (group.cycles.length > 0) {
    const { error: cErr } = await supabase
      .from('cycles')
      .upsert(group.cycles.map(c => cycleToRow(group.id, c)), { onConflict: 'id' });
    if (cErr) throw new Error(`upsertGroup (cycles) error: ${JSON.stringify(cErr)}`);

    // 4. Upsert payments (all cycles' payments in one call)
    const allPayments = group.cycles.flatMap(c =>
      c.payments.map(p => paymentToRow(c.id, p)),
    );
    if (allPayments.length > 0) {
      const { error: pErr } = await supabase
        .from('payments')
        .upsert(allPayments, { onConflict: 'cycle_id,member_id' });
      if (pErr) throw new Error(`upsertGroup (payments) error: ${JSON.stringify(pErr)}`);
    }
  }
}

export async function deleteGroup(uid: string, gid: string): Promise<void> {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', gid)
    .eq('uid', uid);
  if (error) throw new Error(`deleteGroup error: ${JSON.stringify(error)}`);
  // ON DELETE CASCADE handles members, cycles, payments automatically
}

export async function getGroupByMemberToken(
  token: string,
): Promise<{ group: ChittiGroup; memberId: string } | null> {
  // This is called unauthenticated (public member deep link).
  // RLS on member_tokens allows public SELECT, and groups allows
  // SELECT via "groups_public_via_token" policy.
  const { data: tokenRow, error } = await supabase
    .from('member_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error) throw new Error(`getGroupByMemberToken token error: ${JSON.stringify(error)}`);
  if (!tokenRow) return null;

  const group = await getGroupById(tokenRow.uid, tokenRow.group_id);
  return group ? { group, memberId: tokenRow.member_id } : null;
}

export async function saveMemberToken(
  token: string,
  uid: string,
  groupId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from('member_tokens')
    .upsert({ token, uid, group_id: groupId, member_id: memberId }, { onConflict: 'token' });
  if (error) throw new Error(`saveMemberToken error: ${JSON.stringify(error)}`);
}

export async function upsertFcmToken(
  uid: string,
  token: string,
  platform: 'ios' | 'android',
): Promise<void> {
  const { error } = await supabase
    .from('fcm_tokens')
    .upsert({ uid, token, platform, updated_at: new Date().toISOString() }, { onConflict: 'uid' });
  if (error) throw new Error(`upsertFcmToken error: ${JSON.stringify(error)}`);
}

/* ─────────────────────── Assembly helper ───────────────────────────── */

function assembleGroups(
  groupRows: GroupRow[],
  memberRows: MemberRow[],
  cycleRows: CycleRow[],
  paymentRows: PaymentRow[],
): ChittiGroup[] {
  // Index payments by cycle_id for O(1) lookup
  const paymentsByCycle = new Map<string, Payment[]>();
  for (const p of paymentRows) {
    const list = paymentsByCycle.get(p.cycle_id) ?? [];
    list.push(rowToPayment(p));
    paymentsByCycle.set(p.cycle_id, list);
  }

  // Index members and cycles by group_id
  const membersByGroup = new Map<string, Member[]>();
  for (const m of memberRows) {
    const list = membersByGroup.get(m.group_id) ?? [];
    list.push(rowToMember(m));
    membersByGroup.set(m.group_id, list);
  }

  const cyclesByGroup = new Map<string, Cycle[]>();
  for (const c of cycleRows) {
    const list = cyclesByGroup.get(c.group_id) ?? [];
    list.push(rowToCycle(c, paymentsByCycle.get(c.id) ?? []));
    cyclesByGroup.set(c.group_id, list);
  }

  return groupRows.map(g =>
    rowToGroup(
      g,
      membersByGroup.get(g.id) ?? [],
      cyclesByGroup.get(g.id) ?? [],
    ),
  );
}
