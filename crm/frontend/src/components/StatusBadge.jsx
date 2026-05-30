import React from "react";

const STATUS_CONFIG = {
  new:           { label: "Новая",               color: "bg-[#F2F2F7] text-[#6E6E73]" },
  transferred:   { label: "Передана партнёру",   color: "bg-indigo-50 text-indigo-600" },
  in_progress:   { label: "В работе",            color: "bg-amber-50 text-amber-700" },
  waiting_parts: { label: "Ожидает запчасти",    color: "bg-orange-50 text-orange-600" },
  parts_sent:    { label: "Запчасти отправлены", color: "bg-violet-50 text-violet-600" },
  done:          { label: "Готово",              color: "bg-emerald-50 text-emerald-600" },
  closed:        { label: "Закрыта / Оплачена",  color: "bg-[#F2F2F7] text-[#6E6E73]" },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-[#F2F2F7] text-[#6E6E73]" };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };
