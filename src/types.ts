export type TradeType = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';
export type TradeResult = 'win' | 'loss' | 'breakeven' | 'pending';

export interface Trade {
  id: string;
  symbol: string;
  type: TradeType;
  entryPrice: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
  exitPrice?: number | null;
  quantity: number;
  status: TradeStatus;
  result: TradeResult;
  pnl?: number | null;
  rr?: number | null;
  setup?: string;
  session?: string;
  zone?: string;
  timeframe?: string;
  images?: string[];
  notes?: string;
  commission?: number | null;
  entryDate: string;
  exitDate?: string | null;
  portfolioId: string;
}

export interface Portfolio {
  id: string;
  name: string;
  balance: number;
  initialBalance: number;
  currency: string;
  isArchived?: boolean;
  archivedAt?: string;
  transactions?: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'adjustment';
  amount: number;
  date: string;
  portfolioId: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  level: number;
  exp: number;
  statPoints: number;
  rank: string;
  skills: {
    discipline: number;
    riskManagement: number;
    technicalAnalysis: number;
    psychology: number;
  };
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardExp: number;
  rewardStat?: string;
  rewardStats?: string[];
  rewardStatValue?: number;
  isCompleted: boolean;
  type: 'main' | 'sub' | 'daily';
  isRecurring?: boolean;
  lastCompletedAt?: string;
  completedStatBoosts?: Record<string, number>;
  completedLevelUp?: boolean;
}

export interface Stats {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  avgRr: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
}
