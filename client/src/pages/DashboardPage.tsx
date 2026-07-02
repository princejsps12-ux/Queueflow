import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyticsApi } from "../api/endpoints";
import type { OverallAnalytics } from "../api/types";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";

const PIE_COLORS = ["#3b5cf5", "#f43f5e"];

function formatDateLabel(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${month}/${day}`;
}

export function DashboardPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<OverallAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    analyticsApi
      .overall()
      .then(setData)
      .catch((err) => showToast(getApiErrorMessage(err, "Failed to load analytics"), "error"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingSpinner label="Loading analytics..." />;
  if (!data) return null;

  if (data.queueCount === 0) {
    return (
      <EmptyState
        title="No analytics yet"
        description="Create a queue and start serving tokens to see analytics here."
      />
    );
  }

  const trendData = data.queueLengthTrend.map((point, i) => ({
    date: formatDateLabel(point.date),
    waiting: point.waiting,
    avgWait: data.avgWaitTimeTrend[i]?.avgWaitMinutes ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">Overview across all of your queues.</p>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Currently Waiting" value={data.currentWaiting} />
        <StatCard
          label="Avg Wait Time"
          value={data.avgWaitTimeMinutes !== null ? `${data.avgWaitTimeMinutes}m` : "—"}
        />
        <StatCard label="Served Today" value={data.servedToday} accent="text-emerald-600" />
        <StatCard label="Cancelled Today" value={data.cancelledToday} accent="text-rose-600" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Queue Length Trend (7 days)">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line type="monotone" dataKey="waiting" name="Waiting" stroke="#3b5cf5" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Wait Time Trend (minutes)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="avgWait" name="Avg wait (min)" fill="#8babff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Served vs Cancelled">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.servedVsCancelled}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {data.servedVsCancelled.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Per-Queue Summary">
          <div className="flex flex-col divide-y divide-slate-100">
            {data.perQueue.map((q) => (
              <div key={q.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{q.name}</p>
                  <p className="text-xs text-slate-400">
                    {q.servedToday} served / {q.cancelledToday} cancelled today
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{q.currentWaiting} waiting</p>
                  <p className="text-xs text-slate-400">
                    {q.avgWaitTimeMinutes !== null ? `${q.avgWaitTimeMinutes}m avg wait` : "No data yet"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}
