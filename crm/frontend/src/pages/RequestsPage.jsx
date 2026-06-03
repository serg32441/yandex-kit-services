import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

const STATUSES = [
  { value: "", label: "Все статусы" },
  { value: "new", label: "Новая" },
  { value: "transferred", label: "Передана партнёру" },
  { value: "in_progress", label: "В работе" },
  { value: "waiting_parts", label: "Ожидает запчасти" },
  { value: "parts_sent", label: "Запчасти отправлены" },
  { value: "done", label: "Готово" },
  { value: "closed", label: "Закрыта / Оплачена" },
];

const SELECT = "border border-black/[0.1] rounded-xl px-4 py-2.5 text-[14px] text-[#1D1D1F] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";

export default function RequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortByPriority, setSortByPriority] = useState(false);

  const status = searchParams.get("status") || "";
  const cityId = searchParams.get("city_id") || "";

  useEffect(() => {
    api.getCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { status, city_id: cityId, search: search || undefined, limit: 100 };
    api.getRequests(params).then(setRequests).finally(() => setLoading(false));
  }, [status, cityId, search]);

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  const displayed = sortByPriority
    ? [...requests].sort((a, b) => (b.score || 0) - (a.score || 0))
    : requests;

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h2 className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight">Заявки</h2>
        <Link
          to="/requests/new"
          className="flex items-center gap-2 bg-[#1D1D1F] text-white px-4 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[#3A3A3C] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Новая заявка
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Поиск по имени, телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${SELECT} flex-1 min-w-48 placeholder-[#AEAEB2]`}
        />
        <select value={status} onChange={(e) => setFilter("status", e.target.value)} className={SELECT}>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={cityId} onChange={(e) => setFilter("city_id", e.target.value)} className={SELECT}>
          <option value="">Все города</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          type="button"
          onClick={() => setSortByPriority((v) => !v)}
          className={`px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
            sortByPriority
              ? "bg-[#1D1D1F] text-white"
              : "border border-black/[0.1] text-[#3A3A3C] hover:bg-[#F5F5F7]"
          }`}
        >
          ⚡ Сначала важные
        </button>
      </div>

      {/* Список / таблица */}
      <div className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#AEAEB2] text-[14px]">Загрузка...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-[#AEAEB2] text-[14px]">Заявки не найдены</div>
        ) : (
          <>
            {/* Мобильный список (карточки) */}
            <div className="sm:hidden divide-y divide-black/[0.04]">
              {displayed.map((r) => (
                <Link
                  key={r.id}
                  to={`/requests/${r.id}`}
                  className="flex items-start gap-3 px-4 py-4 hover:bg-[#F9F9FB] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-medium text-[#1D1D1F] truncate">{r.client_name}</p>
                      {r.priority === "high" && <PriorityBadge priority={r.priority} score={r.score} />}
                    </div>
                    <p className="text-[12px] text-[#AEAEB2] mt-0.5">
                      {[r.equipment_type, r.city?.name].filter(Boolean).join(" · ") || r.client_phone || "—"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={r.status} />
                    <p className="text-[12px] text-[#AEAEB2]">
                      {new Date(r.created_at).toLocaleDateString("ru", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Десктопная таблица */}
            <table className="hidden sm:table w-full text-[14px]">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider w-12">#</th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider">Клиент</th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider hidden md:table-cell">Оборудование</th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider">Город</th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider hidden lg:table-cell">Партнёр</th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider">Приоритет</th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider">Статус</th>
                  <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider hidden lg:table-cell">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {displayed.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F9F9FB] transition-colors">
                    <td className="px-5 py-3.5 text-[#AEAEB2] text-[13px]">{r.id}</td>
                    <td className="px-5 py-3.5">
                      <Link to={`/requests/${r.id}`} className="hover:text-indigo-600 transition-colors">
                        <p className="font-medium text-[#1D1D1F]">{r.client_name}</p>
                        <p className="text-[12px] text-[#AEAEB2] mt-0.5">{r.client_phone}</p>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#6E6E73] hidden md:table-cell">{r.equipment_type || "—"}</td>
                    <td className="px-5 py-3.5 text-[#6E6E73]">{r.city?.name || "—"}</td>
                    <td className="px-5 py-3.5 text-[#6E6E73] hidden lg:table-cell">
                      {r.partner?.name || <span className="text-[#AEAEB2]">—</span>}
                    </td>
                    <td className="px-5 py-3.5"><PriorityBadge priority={r.priority} score={r.score} /></td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5 text-[#AEAEB2] text-[13px] hidden lg:table-cell">
                      {new Date(r.created_at).toLocaleDateString("ru")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      <p className="text-[13px] text-[#AEAEB2] px-1">{requests.length} заявок</p>
    </div>
  );
}
