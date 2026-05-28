import React from "react";

const STATUS_CONFIG = {
  new:           { label: "Новая",               color: "bg-gray-100 text-gray-400" },
  transferred:   { label: "Передана партнёру",   color: "bg-blue-50 text-blue-400" },
  in_progress:   { label: "В работе",            color: "bg-yellow-50 text-yellow-600" },
  waiting_parts: { label: "Ожидает запчасти",    color: "bg-orange-50 text-orange-400" },
  parts_sent:    { label: "Запчасти отправлены", color: "bg-purple-50 text-purple-400" },
  done:          { label: "Готово",              color: "bg-green-50 text-green-500" },
  closed:        { label: "Закрыта / Оплачена",  color: "bg-gray-100 text-gray-400" },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-400" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };
