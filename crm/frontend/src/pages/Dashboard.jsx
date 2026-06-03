import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { STATUS_CONFIG } from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

// Воронка заявок: путь от поступления до закрытия.
// «Новые» — это заявки, ещё не переданные партнёру, главная ежедневная задача.
const PIPELINE = [
  { key: "new",           label: "Новые",         hint: "ждут партнёра" },
  { key: "transferred",   label: "Переданы",      hint: "у партнёра" },
  { key: "in_progress",   label: "В работе",      hint: "выполняются" },
  { key: "waiting_parts", label: "Ждут запчасти", hint: "на паузе" },
  { key: "closed",        label: "Закрыты",       hint: "оплачены" },
];

function greeting(hour) {
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

function SmallStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-[#F2F2F7] text-[#6E6E73]" };
  return (
    <span className={`inline-flex items-center justify-center min-w-[130px] px-3 py-1 rounded-full text-[11px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function SummarySection({ title, dot, items }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <p className="text-[11px] font-semibold text-[#6E6E73] uppercase tracking-wider">{title}</p>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-[14px] text-[#3A3A3C] flex gap-2 leading-relaxed">
            <span className="text-[#C7C7CC] mt-0.5">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Карточка-метрика. accent=true выделяет «деньги» фирменным градиентом.
function StatCard({ label, value, hint, accent }) {
  return (
    <div
      className={`rounded-[20px] p-5 ${
        accent
          ? "bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-[0_8px_24px_rgba(99,102,241,0.25)]"
          : "bg-white border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)]"
      }`}
    >
      <p className={`text-[13px] font-medium ${accent ? "text-white/80" : "text-[#6E6E73]"}`}>{label}</p>
      <p className={`text-[28px] font-semibold tracking-tight mt-2 leading-none ${accent ? "text-white" : "text-[#1D1D1F]"}`}>
        {value}
      </p>
      {hint && <p className={`text-[12px] mt-2 ${accent ? "text-white/70" : "text-[#AEAEB2]"}`}>{hint}</p>}
    </div>
  );
}

function SectionHeader({ icon, title, action }) {
  return (
    <div className="flex items-center justify-between px-7 pt-5 pb-3">
      <div className="flex items-center gap-2">
        {icon && <span className="text-[15px]">{icon}</span>}
        <h3 className="text-[15px] font-semibold text-[#1D1D1F]">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [error, setError] = useState("");
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    api.getDashboard().then(setStats).catch((e) => setError(e.message));
    api.getPriorities(5).then(setPriorities).catch(() => {});
  }, []);

  async function runAiSummary() {
    setAiLoading(true);
    setAiSummary(null);
    try {
      const data = await api.getAiSummary();
      setAiSummary(data);
    } catch (e) {
      setAiSummary({ available: true, error: e.message });
    } finally {
      setAiLoading(false);
    }
  }

  if (error) return <div className="text-red-500 p-4 text-[14px]">{error}</div>;
  if (!stats) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-[#AEAEB2] text-[14px]">Загрузка...</div>
    </div>
  );

  const now = new Date();
  const monthLabel = now.toLocaleString("ru", { month: "long" });
  const dateLabel = now.toLocaleDateString("ru", { weekday: "long", day: "numeric", month: "long" });
  const newCount = stats.by_status?.new || 0;
  const commission = stats.commission_this_month || 0;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Шапка: приветствие и дата */}
      <div>
        <h1 className="text-[26px] font-semibold text-[#1D1D1F] tracking-tight leading-tight">
          {greeting(now.getHours())}
        </h1>
        <p className="text-[14px] text-[#AEAEB2] mt-1 capitalize">{dateLabel}</p>
      </div>

      {/* Призыв к действию: новые заявки ждут передачи партнёру */}
      {newCount > 0 && (
        <Link
          to="/requests?status=new"
          className="flex items-center gap-4 rounded-[20px] bg-amber-50 border border-amber-200 px-5 py-4 hover:bg-amber-100/70 transition-colors group"
        >
          <div className="w-10 h-10 rounded-[12px] bg-amber-400/20 flex items-center justify-center shrink-0">
            <span className="text-[18px]">🔔</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-[#1D1D1F]">
              {newCount} {newCount === 1 ? "новая заявка ждёт" : "новых заявок ждут"} передачи партнёру
            </p>
            <p className="text-[13px] text-amber-700/80 mt-0.5">Назначьте партнёра, пока клиент не ушёл к конкурентам</p>
          </div>
          <span className="text-[14px] font-medium text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform">
            Распределить →
          </span>
        </Link>
      )}

      {/* Ключевые метрики */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Заявок сегодня" value={stats.total_today} />
        <StatCard label="Активные сейчас" value={stats.total_active} hint="в работе у партнёров" />
        <StatCard label={`Заявок за ${monthLabel}`} value={stats.total_this_month} />
        <StatCard
          label={`Комиссия за ${monthLabel}`}
          value={`${commission.toLocaleString("ru")} ₽`}
          hint="по закрытым заявкам"
          accent
        />
      </div>

      {/* Главное действие */}
      <Link
        to="/requests/new"
        className="flex items-center justify-center gap-2 w-full bg-[#1D1D1F] text-white py-4 rounded-[20px] text-[14px] font-medium hover:bg-[#3A3A3C] transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Новая заявка
      </Link>

      {/* Воронка заявок */}
      <div className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] p-5">
        <p className="text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider mb-3 px-1">Воронка заявок</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PIPELINE.map((s) => {
            const count = stats.by_status?.[s.key] || 0;
            const isNew = s.key === "new" && count > 0;
            return (
              <Link
                key={s.key}
                to={`/requests?status=${s.key}`}
                className={`text-center p-4 rounded-[16px] transition-colors ${
                  isNew
                    ? "bg-amber-50 hover:bg-amber-100 ring-1 ring-amber-200"
                    : "bg-[#F5F5F7] hover:bg-[#EBEBED]"
                }`}
              >
                <p className={`text-[26px] font-semibold tracking-tight ${isNew ? "text-amber-600" : "text-[#1D1D1F]"}`}>
                  {count}
                </p>
                <p className="text-[12px] font-medium text-[#3A3A3C] mt-1 leading-tight">{s.label}</p>
                <p className="text-[11px] text-[#AEAEB2] mt-0.5 leading-tight">{s.hint}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Требуют внимания */}
      {priorities.length > 0 && (
        <div className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <SectionHeader icon="⚡" title="Требуют внимания" />
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

      {/* Последние заявки */}
      <div className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        <SectionHeader
          title="Последние заявки"
          action={
            <Link to="/requests" className="text-[13px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
              Все заявки →
            </Link>
          }
        />
        {stats.recent_requests.length === 0 ? (
          <div className="px-7 py-10 text-center">
            <p className="text-[14px] text-[#AEAEB2]">Заявок пока нет</p>
            <Link to="/requests/new" className="inline-block mt-2 text-[14px] font-medium text-indigo-600 hover:text-indigo-700">
              Создать первую заявку →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04]">
            {stats.recent_requests.map((r) => (
              <Link
                key={r.id}
                to={`/requests/${r.id}`}
                className="flex items-center gap-4 px-7 py-4 hover:bg-[#F9F9FB] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[#1D1D1F] truncate">{r.client_name}</p>
                  <p className="text-[13px] text-[#AEAEB2] truncate mt-0.5">
                    {[r.equipment_type, r.city?.name].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="shrink-0">
                  <SmallStatusBadge status={r.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ИИ-сводка по бизнесу */}
      <div className="rounded-[20px] border border-indigo-100 bg-gradient-to-br from-[#F7F6FE] to-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z"/>
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-[#1D1D1F]">ИИ-сводка по бизнесу</h3>
          </div>
          <button
            onClick={runAiSummary}
            disabled={aiLoading}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2 rounded-xl text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
          >
            {aiLoading ? "Анализирую..." : aiSummary ? "Обновить" : "Сгенерировать"}
          </button>
        </div>

        {!aiSummary && !aiLoading && (
          <p className="text-[13px] text-[#6E6E73] mt-3">
            ИИ проанализирует заявки, партнёров и города за месяц и подскажет, на чём сфокусироваться.
          </p>
        )}

        {aiSummary?.error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-[13px] mt-3">
            {aiSummary.error}
          </div>
        )}

        {aiSummary && !aiSummary.error && (
          <div className="mt-4 space-y-4">
            {aiSummary.headline && (
              <p className="text-[15px] font-medium text-[#1D1D1F] leading-relaxed">{aiSummary.headline}</p>
            )}
            {aiSummary.highlights?.length > 0 && (
              <SummarySection title="Идёт хорошо" dot="bg-emerald-500" items={aiSummary.highlights} />
            )}
            {aiSummary.attention?.length > 0 && (
              <SummarySection title="Требует внимания" dot="bg-amber-500" items={aiSummary.attention} />
            )}
            {aiSummary.recommendations?.length > 0 && (
              <SummarySection title="Рекомендации" dot="bg-indigo-500" items={aiSummary.recommendations} />
            )}
            {aiSummary.model && (
              <p className="text-[11px] text-[#AEAEB2]">Сгенерировано: {aiSummary.model}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
