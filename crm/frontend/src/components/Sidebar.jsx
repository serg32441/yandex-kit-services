import React from "react";
import { NavLink } from "react-router-dom";
import { api } from "../api";

const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" stroke="#a5b4fc" fill="#a5b4fc" fillOpacity="0.2"/>
      <rect x="14" y="3" width="7" height="7" stroke="#a5b4fc" fill="#a5b4fc" fillOpacity="0.2"/>
      <rect x="14" y="14" width="7" height="7" stroke="#a5b4fc" fill="#a5b4fc" fillOpacity="0.2"/>
      <rect x="3" y="14" width="7" height="7" stroke="#a5b4fc" fill="#a5b4fc" fillOpacity="0.2"/>
    </svg>
  ),
  requests: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#a5b4fc" fill="#a5b4fc" fillOpacity="0.2"/>
      <polyline points="14 2 14 8 20 8" stroke="#a5b4fc"/>
      <line x1="16" y1="13" x2="8" y2="13" stroke="#c4b5fd"/>
      <line x1="16" y1="17" x2="8" y2="17" stroke="#c4b5fd"/>
    </svg>
  ),
  partners: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#a5b4fc"/>
      <circle cx="9" cy="7" r="4" stroke="#a5b4fc" fill="#a5b4fc" fillOpacity="0.2"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#c4b5fd"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#c4b5fd"/>
    </svg>
  ),
};

const links = [
  { to: "/dashboard", label: "Дашборд", icon: icons.dashboard },
  { to: "/requests", label: "Заявки", icon: icons.requests },
  { to: "/partners", label: "Партнёры", icon: icons.partners },
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
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              {icon}
              <span className="text-[16px]">{label}</span>
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
