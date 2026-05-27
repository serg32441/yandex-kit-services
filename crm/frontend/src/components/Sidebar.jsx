import React from "react";
import { NavLink } from "react-router-dom";
import { api } from "../api";

const links = [
  { to: "/dashboard", label: "Дашборд", icon: "📊" },
  { to: "/requests", label: "Заявки", icon: "📋" },
  { to: "/partners", label: "Партнёры", icon: "👥" },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col z-30
          transition-transform duration-200
          md:static md:w-56 md:translate-x-0 md:shrink-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <span className="text-gray-400 text-xs">Меню</span>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white text-xl leading-none p-1"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
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

        <div className="p-4 border-t border-gray-700 space-y-2">
          <p className="text-xs text-gray-500">Партнёры общаются через Telegram-бота</p>
          <button
            onClick={() => api.logout()}
            className="w-full text-left text-xs text-gray-400 hover:text-white transition-colors py-1"
          >
            Выйти →
          </button>
        </div>
      </aside>
    </>
  );
}
