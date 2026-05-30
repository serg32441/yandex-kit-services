import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import StatusBadge, { STATUS_CONFIG } from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

const STATUS_ORDER = ["transferred", "in_progress", "waiting_parts", "closed"];
const STATUS_LABELS = {
  transferred: "Переданы", in_progress: "В работе",
  waiting_parts: "Ждут запчасти", closed: "Закрыты",
};

function SmallStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-[#F2F2F7] text-[#6E6E73]" };
  return (
    <span className={`inline-flex items-center justify-center min-w-[130px] px-3 py-1 rounded-full text-[11px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] p-5">
      <p className="text-[13px] font-medium text-[#6E6E73]">{label}</p>
      <p className="text-[28px] font-semibold text-[#1D1D1F] tracking-tight mt-2 leading-none">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getDashboard().then(setStats).catch((e) => setError(e.message));
    api.getPriorities(5).then(setPriorities).catch(() => {});
  }, []);

  if (error) return <div className="text-red-500 p-4 text-[14px]">{error}</div>;
  if (!stats) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-[#AEAEB2] text-[14px]">Загрузка...</div>
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Заявок сегодня" value={stats.total_today} />
        <StatCard
          label={`За ${new Date().toLocaleString("ru", { month: "long" })}`}
          value={stats.total_this_month}
        />
        <StatCard label="Ждут запчасти" value={stats.by_status?.waiting_parts || 0} />
        <StatCard
          label={`Комиссия (${new Date().toLocaleString("ru", { month: "long" })})`}
          value={`${(stats.commission_this_month || 0).toLocaleString("ru")} ₽`}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/requests/new"
          className="col-start-2 sm:col-start-4 flex items-center justify-center gap-2 bg-[#1D1D1F] text-white py-4 rounded-[20px] text-[14px] font-medium hover:bg-[#3A3A3C] transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Новая заявка
        </Link>
      </div>

      <div className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_ORDER.map((s) => (
            <Link
              key={s}
              to={`/requests?status=${s}`}
              className="text-center p-4 rounded-[16px] bg-[#F5F5F7] hover:bg-[#EBEBED] transition-colors"
            >
              <p className="text-[26px] font-semibold text-[#1D1D1F] tracking-tight">{stats.by_status?.[s] || 0}</p>
              <p className="text-[12px] text-[#6E6E73] mt-1 leading-tight">{STATUS_LABELS[s]}</p>
            </Link>
          ))}
        </div>
      </div>

      {priorities.length > 0 && (
        <div className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-7 pt-5 pb-3 flex items-center gap-2">
            <span className="text-[15px]">⚡</span>
            <h3 className="text-[15px] font-semibold text-[#1D1D1F]">Требуют внимания</h3>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {priorities.map((r) => (
              <Link
                key={r.id}
                to={`/requests/${r.id}`}
                className="flex items-center gap-4 px-7 py-3.5 hover:bg-[#F9F9FB] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1D1D1F] truncate">{r.client_name}</p>
                  <p className="text-[12px] text-[#AEAEB2] truncate mt-0.5">{r.recommendation || r.equipment_type || "—"}</p>
                </div>
                <div className="shrink-0">
                  <PriorityBadge priority={r.priority} score={r.score} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="divide-y divide-black/[0.04]">
          {stats.recent_requests.map((r) => (
            <Link
              key={r.id}
              to={`/requests/${r.id}`}
              className="flex items-center gap-4 px-7 py-4 hover:bg-[#F9F9FB] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-[#1D1D1F] truncate">{r.client_name}</p>
                <p className="text-[13px] text-[#AEAEB2] truncate mt-0.5">{r.equipment_type || "—"}</p>
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
