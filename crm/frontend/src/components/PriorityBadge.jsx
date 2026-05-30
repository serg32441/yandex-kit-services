import React from "react";

const PRIORITY_CONFIG = {
  high:   { label: "Высокий",  dot: "bg-red-500",    color: "bg-red-50 text-red-600" },
  medium: { label: "Средний",  dot: "bg-amber-500",  color: "bg-amber-50 text-amber-700" },
  low:    { label: "Низкий",   dot: "bg-[#C7C7CC]",  color: "bg-[#F2F2F7] text-[#8E8E93]" },
};

export default function PriorityBadge({ priority, score }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium whitespace-nowrap ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
      {typeof score === "number" && <span className="opacity-50">· {score}</span>}
    </span>
  );
}

export { PRIORITY_CONFIG };
