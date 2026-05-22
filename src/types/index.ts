export interface Member {
  id: string;
  name: string;
  phone: string;
  hasReceived: boolean;
  cycleReceived?: number;
  joinedAt: string;
  shareToken?: string;
}

export interface Payment {
  memberId: string;
  paid: boolean;
  paidDate?: string;
  /** Payment mode the foreman recorded — UI label only, no integration. */
  mode?: 'cash' | 'upi' | 'bank' | 'cheque' | 'other';
  /** Optional free-text note attached when marking paid. */
  note?: string;
}

export interface Cycle {
  id: string;
  cycleNumber: number;
  date: string;
  payments: Payment[];
  winnerId?: string;
  /** Prize the winner takes — for lottery this equals the chit value; for auction/manual
   *  it's the bid (= chitValue − discount). */
  winAmount: number;
  /** chitValue − winAmount. */
  discount?: number;
  /** Foreman commission applied to this cycle (in rupees). */
  foremanCommission?: number;
  dividendPerMember?: number;
  drawType: 'lottery' | 'auction' | 'self-assign' | 'manual';
  conducted: boolean;
}

export type DrawType = 'lottery' | 'auction' | 'self-assign' | 'manual';

export interface ChittiGroup {
  id: string;
  name: string;
  description?: string;
  /** Per-member monthly subscription (gross, before dividend). */
  amount: number;
  totalMembers: number;
  durationMonths: number;
  /** Default draw type for new cycles. Per-cycle override is supported. */
  drawType?: DrawType;
  /** Foreman commission as a percent of chit value (Act cap: 5%). Defaults to 5. */
  foremanCommissionPct?: number;
  /** Maximum discount as a percent of chit value (Act cap: 30%). Defaults to 30. */
  maxDiscountPct?: number;
  startDate: string;
  startDay: number;
  startMonth: number;
  startYear: number;
  paymentDay: number;
  members: Member[];
  cycles: Cycle[];
  createdAt: string;
  isActive: boolean;
}
