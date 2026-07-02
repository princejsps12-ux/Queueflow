export type TokenStatus = "WAITING" | "SERVING" | "SERVED" | "CANCELLED";

export interface Manager {
  id: string;
  email: string;
  name: string;
}

export interface QueueSummary {
  id: string;
  name: string;
  createdAt: string;
  waitingCount: number;
}

export interface Token {
  id: string;
  queueId: string;
  tokenNumber: number;
  personName: string | null;
  position: number;
  status: TokenStatus;
  createdAt: string;
  servedAt: string | null;
  cancelledAt: string | null;
}

export interface QueueDetail {
  id: string;
  name: string;
  managerId: string;
  createdAt: string;
  serving: Token | null;
  waiting: Token[];
}

export interface TrendPoint {
  date: string;
  waiting: number;
}

export interface WaitTrendPoint {
  date: string;
  avgWaitMinutes: number | null;
}

export interface ServedVsCancelledPoint {
  name: string;
  value: number;
}

export interface QueueAnalytics {
  currentWaiting: number;
  avgWaitTimeMinutes: number | null;
  servedToday: number;
  cancelledToday: number;
  totalServed: number;
  totalCancelled: number;
  queueLengthTrend: TrendPoint[];
  avgWaitTimeTrend: WaitTrendPoint[];
  servedVsCancelled: ServedVsCancelledPoint[];
}

export interface PerQueueAnalytics {
  id: string;
  name: string;
  currentWaiting: number;
  avgWaitTimeMinutes: number | null;
  servedToday: number;
  cancelledToday: number;
}

export interface OverallAnalytics extends QueueAnalytics {
  queueCount: number;
  perQueue: PerQueueAnalytics[];
}
