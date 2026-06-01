import React from "react";
import { NavLink } from "react-router-dom";
import { api } from "../api";

const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" fill="currentColor" fillOpacity="0.12"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" fill="currentColor" fillOpacity="0.12"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" fill="currentColor" fillOpacity="0.12"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" fill="currentColor" fillOpacity="0.12"/>
    </svg>
  ),
  requests: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" fill="currentColor" fillOpacity="0.1"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor"/>
      <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor"/>
      <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor"/>
    </svg>
  ),
  partners: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" fill="currentColor" fillOpacity="0.1"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor"/>
    </svg>
  ),
};

const links = [
  { to: "/dashboard", label: "Дашборд",   icon: icons.dashboard },
  { to: "/requests",  label: "Заявки",    icon: icons.requests },
  { to: "/partners",  label: "Партнёры",  icon: icons.partners },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 md:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-black/[0.06] flex flex-col z-30
        transition-transform duration-200
        md:static md:w-[220px] md:translate-x-0 md:shrink-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-16 px-5 flex items-center justify-between border-b border-black/[0.04]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm shrink-0">
              <svg width="14" height="14" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="6" r="4" fill="white"/>
                <circle cx="5" cy="22" r="3" fill="white" fillOpacity="0.7"/>
                <circle cx="23" cy="22" r="3" fill="white" fillOpacity="0.7"/>
                <line x1="14" y1="10" x2="5" y2="19" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="14" y1="10" x2="23" y2="19" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-[#1D1D1F] tracking-tight">РемХаб</span>
          </div>
          <button onClick={onClose} className="md:hidden text-[#AEAEB2] hover:text-[#6E6E73] p-1 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {links.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[15px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-[#3A3A3C] hover:bg-[#F5F5F7]"
                }`
              }
            >
              {icon}
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-black/[0.04]">
          <p className="text-[12px] text-[#AEAEB2] mb-2.5 leading-relaxed">Партнёры общаются через Telegram-бота</p>
          <button
            onClick={() => api.logout()}
            className="text-[13px] text-[#AEAEB2] hover:text-[#6E6E73] transition-colors"
          >
            Выйти →
          </button>
        </div>
      </aside>
    </>
  );
}
