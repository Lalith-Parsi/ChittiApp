/**
 * In-memory demo storage — mirrors the Firestore storage interface but holds
 * everything in a module-level Map. Used when `useDemo` is true in
 * AuthContext (set by the "Preview without signing in" button on LoginScreen).
 *
 * Seeded with three realistic Indian chit groups in different lifecycle states
 * so the empty app doesn't look empty when someone is just previewing.
 *
 * IMPORTANT: Demo data never touches Firestore. Sign-out + re-enter demo mode
 * re-seeds from scratch.
 */

import { ChittiGroup, Member, Cycle } from '../types';
import { initializeCycles } from '../utils/chitti';

const store = new Map<string, ChittiGroup>();
let seeded = false;

export async function getGroups(): Promise<ChittiGroup[]> {
  return Array.from(store.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getGroupById(id: string): Promise<ChittiGroup | null> {
  return store.get(id) ?? null;
}

export async function upsertGroup(group: ChittiGroup): Promise<void> {
  store.set(group.id, group);
}

export async function deleteGroup(id: string): Promise<void> {
  store.delete(id);
}

/* ───────────────────────── Seed data ───────────────────────── */

function mkMember(name: string, phone: string, prizedCycle?: number): Member {
  return {
    id: `m-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    phone,
    hasReceived: prizedCycle !== undefined,
    cycleReceived: prizedCycle,
    joinedAt: '2026-01-15T10:00:00Z',
  };
}

function mkPayments(memberIds: string[], paid: number, paidDate: string): Cycle['payments'] {
  return memberIds.map((mid, i) => ({
    memberId: mid,
    paid: i < paid,
    paidDate: i < paid ? paidDate : undefined,
    mode: i < paid ? (['upi', 'cash', 'upi', 'bank', 'upi', 'cheque'][i % 6] as Cycle['payments'][number]['mode']) : undefined,
  }));
}

/**
 * Group 1 — Anna Nagar Family Chit. Mid-cycle (12 of 20 paid in cycle 5 of 20).
 * Two members already prized in earlier cycles. The flagship demo group.
 */
function seedAnnaNagar(): ChittiGroup {
  const id = 'demo-anna-nagar';
  const members = [
    mkMember('Ravi Krishnan',     '+91 98765 43210'),
    mkMember('Priya Menon',       '+91 98123 45678', 3),
    mkMember('Suresh Iyer',       '+91 90123 45678'),
    mkMember('Anjali Sharma',     '+91 99988 76543', 1),
    mkMember('Karthik Reddy',     '+91 97654 32109'),
    mkMember('Lakshmi Pillai',    '+91 89765 43210'),
    mkMember('Vinod Joseph',      '+91 98765 11223'),
    mkMember('Meera Pillai',      '+91 98765 11220'),
    mkMember('Arjun Nair',        '+91 98712 33445'),
    mkMember('Rohit Subramanian', '+91 90876 54321'),
    mkMember('Deepa Iyer',        '+91 90123 45612'),
    mkMember('Vikram Rao',        '+91 98765 67891', 2),
    mkMember('Sangeeta Pandian',  '+91 98987 11122'),
    mkMember('Naveen Kumar',      '+91 99876 11223', 4),
    mkMember('Aishwarya Krishnan','+91 98123 99988'),
    mkMember('Manish Gupta',      '+91 98765 09876'),
    mkMember('Pooja Anand',       '+91 88123 55667'),
    mkMember('Bharath Reddy',     '+91 89012 30912'),
    mkMember('Kavitha Menon',     '+91 98765 22334'),
    mkMember('Sandeep Joseph',    '+91 90876 11122'),
  ];
  const ids = members.map(m => m.id);

  // 20-month chit, currently in cycle 5. Cycles 1-4 conducted (4 prized).
  const baseGroup: ChittiGroup = {
    id,
    name: 'Anna Nagar Family Chit',
    description: 'Monthly family chit · started Nov 2025',
    amount: 5000,
    totalMembers: 20,
    durationMonths: 20,
    drawType: 'lottery',
    foremanCommissionPct: 5,
    maxDiscountPct: 30,
    startDate: '2025-11-01T00:00:00Z',
    startDay: 1,
    startMonth: 10,
    startYear: 2025,
    paymentDay: 15,
    members,
    cycles: [],
    createdAt: '2025-10-25T08:00:00Z',
    isActive: true,
  };

  // Build cycles — first 4 conducted, 5 in progress, rest pending.
  const cycles = initializeCycles(baseGroup).map((c, i) => {
    if (i === 0) {
      return { ...c, conducted: true, winnerId: 'm-anjali-sharma',     winAmount: 100000, discount: 0,     foremanCommission: 5000, dividendPerMember: 0,    drawType: 'lottery' as const, date: '2025-11-20T10:00:00Z', payments: mkPayments(ids, 20, '2025-11-15') };
    }
    if (i === 1) {
      return { ...c, conducted: true, winnerId: 'm-vikram-rao',        winAmount: 100000, discount: 0,     foremanCommission: 5000, dividendPerMember: 0,    drawType: 'lottery' as const, date: '2025-12-20T10:00:00Z', payments: mkPayments(ids, 20, '2025-12-15') };
    }
    if (i === 2) {
      return { ...c, conducted: true, winnerId: 'm-priya-menon',       winAmount: 78500,  discount: 21500, foremanCommission: 5000, dividendPerMember: 825,  drawType: 'manual'  as const, date: '2026-01-20T10:00:00Z', payments: mkPayments(ids, 20, '2026-01-15') };
    }
    if (i === 3) {
      return { ...c, conducted: true, winnerId: 'm-naveen-kumar',      winAmount: 82000,  discount: 18000, foremanCommission: 5000, dividendPerMember: 650,  drawType: 'manual'  as const, date: '2026-02-20T10:00:00Z', payments: mkPayments(ids, 20, '2026-02-15') };
    }
    if (i === 4) {
      return { ...c, conducted: false, payments: mkPayments(ids, 12, '2026-03-10') };
    }
    return c;
  });

  return { ...baseGroup, cycles };
}

/**
 * Group 2 — Office Lunch Chit. 10-member, cycle 8 of 10, all paid — ready to draw.
 * Demonstrates the "draw enabled" state.
 */
function seedOfficeLunch(): ChittiGroup {
  const id = 'demo-office-lunch';
  const members = [
    mkMember('Vinay Bhatt',      '+91 98765 10001'),
    mkMember('Sneha Krishnan',   '+91 98765 10002', 2),
    mkMember('Hari Mohan',       '+91 98765 10003', 5),
    mkMember('Divya Subramanian','+91 98765 10004'),
    mkMember('Pradeep Iyer',     '+91 98765 10005', 1),
    mkMember('Anita Reddy',      '+91 98765 10006', 7),
    mkMember('Manoj Pillai',     '+91 98765 10007'),
    mkMember('Shruti Joseph',    '+91 98765 10008', 6),
    mkMember('Rakesh Nair',      '+91 98765 10009', 3),
    mkMember('Geetha Menon',     '+91 98765 10010', 4),
  ];
  const ids = members.map(m => m.id);

  const baseGroup: ChittiGroup = {
    id,
    name: 'Office Lunch Chit',
    amount: 2000,
    totalMembers: 10,
    durationMonths: 10,
    drawType: 'lottery',
    foremanCommissionPct: 5,
    maxDiscountPct: 30,
    startDate: '2025-08-01T00:00:00Z',
    startDay: 1,
    startMonth: 7,
    startYear: 2025,
    paymentDay: 5,
    members,
    cycles: [],
    createdAt: '2025-07-20T08:00:00Z',
    isActive: true,
  };

  const cycles = initializeCycles(baseGroup).map((c, i) => {
    const prizedOrder = ['m-pradeep-iyer', 'm-sneha-krishnan', 'm-rakesh-nair', 'm-geetha-menon', 'm-hari-mohan', 'm-shruti-joseph', 'm-anita-reddy'];
    if (i < 7) {
      return { ...c, conducted: true, winnerId: prizedOrder[i], winAmount: 20000, discount: 0, foremanCommission: 1000, dividendPerMember: 0, drawType: 'lottery' as const, date: `2025-${String(8 + i).padStart(2, '0')}-10T10:00:00Z`, payments: mkPayments(ids, 10, `2025-${String(8 + i).padStart(2, '0')}-05`) };
    }
    if (i === 7) {
      return { ...c, conducted: false, payments: mkPayments(ids, 10, '2026-03-05') };
    }
    return c;
  });

  return { ...baseGroup, cycles };
}

/**
 * Group 3 — Saraswathi Trust Chit. Just created, no members yet.
 * Demonstrates the "pre-members" state and the new-chit form output.
 */
function seedSaraswathi(): ChittiGroup {
  return {
    id: 'demo-saraswathi',
    name: 'Saraswathi Trust Chit',
    description: 'Annual community chit',
    amount: 8333,
    totalMembers: 24,
    durationMonths: 24,
    drawType: 'manual',
    foremanCommissionPct: 5,
    maxDiscountPct: 30,
    startDate: '2026-04-01T00:00:00Z',
    startDay: 1,
    startMonth: 3,
    startYear: 2026,
    paymentDay: 1,
    members: [],
    cycles: [],
    createdAt: '2026-03-12T08:00:00Z',
    isActive: true,
  };
}

/** Seed the in-memory store with three realistic groups. Idempotent. */
export function seedDemoData(): void {
  if (seeded) return;
  seeded = true;
  store.set('demo-anna-nagar', seedAnnaNagar());
  store.set('demo-office-lunch', seedOfficeLunch());
  store.set('demo-saraswathi', seedSaraswathi());
}

/** Reset demo state — used when leaving demo mode. */
export function resetDemoData(): void {
  store.clear();
  seeded = false;
}
