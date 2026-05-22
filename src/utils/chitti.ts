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

export function calculateDividend(totalPool: number, winAmount: number, memberCount: number): number {
  const discount = totalPool - winAmount;
  return Math.floor(discount / memberCount);
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
