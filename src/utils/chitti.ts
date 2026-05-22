import { ChittiGroup, Cycle, Member, Payment } from '../types';

export function initializeCycles(group: ChittiGroup): Cycle[] {
  return Array.from({ length: group.durationMonths }, (_, i) => ({
    id: `${group.id}_cycle_${i + 1}`,
    cycleNumber: i + 1,
    date: '',
    payments: group.members.map(m => ({ memberId: m.id, paid: false })),
    winAmount: group.amount * group.totalMembers,
    drawType: group.drawType ?? 'lottery',
    conducted: false,
  }));
}

export function syncCyclePayments(cycle: Cycle, members: Member[]): Cycle {
  const existing = new Map(cycle.payments.map(p => [p.memberId, p]));
  const payments: Payment[] = members.map(m => existing.get(m.id) ?? { memberId: m.id, paid: false });
  return { ...cycle, payments };
}

export function getEligibleMembers(group: ChittiGroup): Member[] {
  return group.members.filter(m => !m.hasReceived);
}

/**
 * Chit value (C) = per-member subscription × total members. The "pot."
 */
export function getChitValue(group: ChittiGroup): number {
  return group.amount * group.totalMembers;
}

/**
 * Foreman commission in rupees for one cycle.
 * `pct` defaults to 5 (the Chit Funds Act 1982 cap).
 */
export function getForemanCommission(group: ChittiGroup): number {
  const pct = group.foremanCommissionPct ?? 5;
  return Math.round(getChitValue(group) * pct / 100);
}

/**
 * Maximum discount in rupees per the group's d_max setting.
 */
export function getMaxDiscount(group: ChittiGroup): number {
  const pct = group.maxDiscountPct ?? 30;
  return Math.round(getChitValue(group) * pct / 100);
}

/**
 * Dividend per subscriber for an auction/manual draw.
 *
 *     dividend = (discount − foreman_commission) / N
 *
 * Replaces the prior `(pool − winAmount) / N` calculation which silently treated
 * the foreman commission as zero. See `.planning/research/DOMAIN.md §7`.
 */
export function calculateDividend(
  chitValue: number,
  prize: number,
  members: number,
  foremanCommission: number,
): number {
  if (members <= 0) return 0;
  const discount = chitValue - prize;
  const dividendPool = Math.max(0, discount - foremanCommission);
  return Math.floor(dividendPool / members);
}

/**
 * Money-conservation invariant. Returns true iff the pot is fully accounted for.
 *
 *     N × subscription  ==  prize  +  foremanCommission  +  dividend × N
 *
 * `tolerance` covers rupee-rounding when integer dividends are floored — any
 * remainder up to (N − 1) rupees lands inside the pot and is absorbed by
 * commission/dividend rounding choices the operator makes.
 */
export function assertMoneyConservation(args: {
  chitValue: number;
  prize: number;
  foremanCommission: number;
  dividendPerMember: number;
  members: number;
  tolerance?: number;
}): boolean {
  const { chitValue, prize, foremanCommission, dividendPerMember, members } = args;
  const tolerance = args.tolerance ?? members;
  const accounted = prize + foremanCommission + dividendPerMember * members;
  return Math.abs(chitValue - accounted) <= tolerance;
}

export function getPaidCount(cycle: Cycle): number {
  return cycle.payments.filter(p => p.paid).length;
}

export function getPendingMembers(cycle: Cycle, members: Member[]): Member[] {
  const pending = new Set(cycle.payments.filter(p => !p.paid).map(p => p.memberId));
  return members.filter(m => pending.has(m.id));
}

export function getCycleMonth(group: ChittiGroup, cycleNumber: number): string {
  const month = (group.startMonth ?? new Date(group.startDate).getMonth());
  const year  = (group.startYear  ?? new Date(group.startDate).getFullYear());
  const date = new Date(year, month + cycleNumber - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function getCurrentCycle(group: ChittiGroup): Cycle | null {
  return group.cycles.find(c => !c.conducted) ?? null;
}

export function getCompletedCycles(group: ChittiGroup): Cycle[] {
  return group.cycles.filter(c => c.conducted);
}
