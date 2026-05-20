import React from "react";

const STATUS_CONFIG = {
  new:           { label: "Новая",               color: "bg-gray-100 text-gray-700 border-gray-300" },
  transferred:   { label: "Передана партнёру",   color: "bg-blue-100 text-blue-700 border-blue-300" },
  in_progress:   { label: "В работе",            color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  waiting_parts: { label: "Ожидает запчасти",    color: "bg-orange-100 text-orange-700 border-orange-300" },
  parts_sent:    { label: "Запчасти отправлены", color: "bg-purple-100 text-purple-700 border-purple-300" },
  done:          { label: "Готово",              color: "bg-green-100 text-green-700 border-green-300" },
  closed:        { label: "Закрыта / Оплачена",  color: "bg-gray-200 text-gray-600 border-gray-400" },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export { STATUS_CONFIG };
