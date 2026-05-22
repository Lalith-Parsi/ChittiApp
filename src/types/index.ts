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
}

export interface Cycle {
  id: string;
  cycleNumber: number;
  date: string;
  payments: Payment[];
  winnerId?: string;
  winAmount: number;
  discount?: number;
  dividendPerMember?: number;
  drawType: 'lottery' | 'auction' | 'self-assign';
  conducted: boolean;
}

export type DrawType = 'lottery' | 'auction' | 'self-assign';

export interface ChittiGroup {
  id: string;
  name: string;
  description?: string;
  amount: number;
  totalMembers: number;
  durationMonths: number;
  drawType?: DrawType;
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
