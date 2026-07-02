import { Token } from "@prisma/client";
import { prisma } from "../lib/prisma";

const TREND_DAYS = 7;
const MS_PER_MINUTE = 60_000;

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = startOfDay(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function waitMinutes(t: Token): number | null {
  if (!t.servedAt) return null;
  return (t.servedAt.getTime() - t.createdAt.getTime()) / MS_PER_MINUTE;
}

export interface AnalyticsResult {
  currentWaiting: number;
  avgWaitTimeMinutes: number | null;
  servedToday: number;
  cancelledToday: number;
  totalServed: number;
  totalCancelled: number;
  queueLengthTrend: { date: string; waiting: number }[];
  avgWaitTimeTrend: { date: string; avgWaitMinutes: number | null }[];
  servedVsCancelled: { name: string; value: number }[];
}

export async function computeAnalytics(queueIds: string[]): Promise<AnalyticsResult> {
  if (queueIds.length === 0) {
    return {
      currentWaiting: 0,
      avgWaitTimeMinutes: null,
      servedToday: 0,
      cancelledToday: 0,
      totalServed: 0,
      totalCancelled: 0,
      queueLengthTrend: lastNDays(TREND_DAYS).map((d) => ({ date: dateKey(d), waiting: 0 })),
      avgWaitTimeTrend: lastNDays(TREND_DAYS).map((d) => ({ date: dateKey(d), avgWaitMinutes: null })),
      servedVsCancelled: [
        { name: "Served", value: 0 },
        { name: "Cancelled", value: 0 },
      ],
    };
  }

  const tokens = await prisma.token.findMany({ where: { queueId: { in: queueIds } } });

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const currentWaiting = tokens.filter((t) => t.status === "WAITING").length;
  const servedTokens = tokens.filter((t) => t.status === "SERVED" && t.servedAt);
  const avgWaitTimeMinutes = average(servedTokens.map(waitMinutes).filter((v): v is number => v !== null));

  const servedToday = tokens.filter(
    (t) => t.status === "SERVED" && t.servedAt && t.servedAt >= todayStart && t.servedAt <= todayEnd
  ).length;
  const cancelledToday = tokens.filter(
    (t) => t.status === "CANCELLED" && t.cancelledAt && t.cancelledAt >= todayStart && t.cancelledAt <= todayEnd
  ).length;

  const totalServed = tokens.filter((t) => t.status === "SERVED").length;
  const totalCancelled = tokens.filter((t) => t.status === "CANCELLED").length;

  const days = lastNDays(TREND_DAYS);

  const queueLengthTrend = days.map((day) => {
    const dayEnd = endOfDay(day);
    const waiting = tokens.filter((t) => {
      if (t.createdAt > dayEnd) return false;
      if (t.servedAt && t.servedAt <= dayEnd) return false;
      if (t.cancelledAt && t.cancelledAt <= dayEnd) return false;
      return true;
    }).length;
    return { date: dateKey(day), waiting };
  });

  const avgWaitTimeTrend = days.map((day) => {
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    const dayServed = servedTokens.filter((t) => t.servedAt! >= dayStart && t.servedAt! <= dayEnd);
    const avgWaitMinutes = average(dayServed.map(waitMinutes).filter((v): v is number => v !== null));
    return { date: dateKey(day), avgWaitMinutes };
  });

  return {
    currentWaiting,
    avgWaitTimeMinutes,
    servedToday,
    cancelledToday,
    totalServed,
    totalCancelled,
    queueLengthTrend,
    avgWaitTimeTrend,
    servedVsCancelled: [
      { name: "Served", value: totalServed },
      { name: "Cancelled", value: totalCancelled },
    ],
  };
}
