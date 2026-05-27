import React, { useEffect, useState } from "react";
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }
  return children;
}

function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
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
