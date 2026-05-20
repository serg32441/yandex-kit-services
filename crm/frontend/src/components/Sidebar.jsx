import React from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Дашборд", icon: "📊" },
  { to: "/requests", label: "Заявки", icon: "📋" },
  { to: "/partners", label: "Партнёры", icon: "👥" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-700">
        <h1 className="font-bold text-lg leading-tight">🔧 Ремонт CRM</h1>
        <p className="text-gray-400 text-xs mt-0.5">Управление заявками</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`
            }
          >
            <span>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        Партнёры общаются через Telegram-бота
      </div>
    </aside>
  );
}
