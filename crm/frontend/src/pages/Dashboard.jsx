import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import StatusBadge, { STATUS_CONFIG } from "../components/StatusBadge";

function SmallStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const STATUS_ORDER = [
  "transferred", "in_progress", "waiting_parts", "closed",
];
const STATUS_LABELS = {
  new: "Новые", transferred: "Переданы", in_progress: "В работе",
  waiting_parts: "Ждут запчасти", parts_sent: "Запчасти отправлены",
  done: "Готово", closed: "Закрыты",
};

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDashboard()
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!stats) return <div className="p-4 text-gray-400">Загрузка...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Заявок сегодня" value={stats.total_today} />
        <StatCard
          label={`За ${new Date().toLocaleString("ru", { month: "long" })}`}
          value={stats.total_this_month}
        />
        <StatCard
          label="Ждут запчасти"
          value={stats.by_status?.waiting_parts || 0}
        />
        <StatCard
          label={`Комиссия (${new Date().toLocaleString("ru", { month: "long" })})`}
          value={`${(stats.commission_this_month || 0).toLocaleString("ru")} ₽`}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/requests/new"
          className="col-start-2 sm:col-start-4 flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Новая заявка
        </Link>
      </div>

      {/* Status breakdown */}
      <div className="bg-white rounded-xl border p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_ORDER.map((s) => (
            <Link
              key={s}
              to={`/requests?status=${s}`}
              className="text-center p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <p className="text-2xl font-bold">{stats.by_status?.[s] || 0}</p>
              <p className="text-xs text-gray-500 mt-1">{STATUS_LABELS[s]}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent requests */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="divide-y">
          {stats.recent_requests.map((r) => (
            <Link
              key={r.id}
              to={`/requests/${r.id}`}
              className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.client_name}</p>
                <p className="text-xs text-gray-400 truncate">{r.equipment_type || "—"}</p>
              </div>
              <div className="shrink-0">
                <SmallStatusBadge status={r.status} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
