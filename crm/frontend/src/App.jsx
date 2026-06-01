import React, { useEffect, useState, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import RequestsPage from "./pages/RequestsPage";
import RequestDetail from "./pages/RequestDetail";
import NewRequestPage from "./pages/NewRequestPage";
import PartnersPage from "./pages/PartnersPage";
import LoginPage from "./pages/LoginPage";
import SetupPage from "./pages/SetupPage";
import RegisterPage from "./pages/RegisterPage";
import { api } from "./api";

function AuthGate({ children }) {
  const [state, setState] = useState("loading");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      api.checkSetup().then((r) => {
        if (r.needs_setup) navigate("/setup", { replace: true });
        else navigate("/login", { replace: true });
      }).catch(() => navigate("/login", { replace: true }));
      return;
    }
    api.me().then(() => setState("ok")).catch(() => {
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
    });
  }, []);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-[#AEAEB2] text-[14px]">Загрузка...</div>
      </div>
    );
  }
  return children;
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      <Sidebar isOpen={sidebarOpen} onClose={close} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-black/[0.06] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[#6E6E73] hover:text-[#1D1D1F] transition-colors p-1"
            aria-label="Открыть меню"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="text-[15px] font-semibold text-[#1D1D1F]">РемХаб</span>
        </header>
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/requests" element={<RequestsPage />} />
            <Route path="/requests/new" element={<NewRequestPage />} />
            <Route path="/requests/:id" element={<RequestDetail />} />
            <Route path="/partners" element={<PartnersPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route
          path="/*"
          element={
            <AuthGate>
              <Layout />
            </AuthGate>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
