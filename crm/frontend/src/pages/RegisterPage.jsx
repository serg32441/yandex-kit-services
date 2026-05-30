import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api";

const INPUT = "w-full border border-black/[0.1] rounded-xl px-4 py-3 text-[15px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-white";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError("Пароли не совпадают"); return; }
    if (password.length < 6) { setError("Пароль должен быть минимум 6 символов"); return; }
    setLoading(true);
    setError("");
    try {
      const data = await api.register(email, password);
      localStorage.setItem("token", data.access_token);
      navigate("/dashboard");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
            <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="6" r="4" fill="white"/>
              <circle cx="5" cy="22" r="3" fill="white" fillOpacity="0.7"/>
              <circle cx="23" cy="22" r="3" fill="white" fillOpacity="0.7"/>
              <line x1="14" y1="10" x2="5" y2="19" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="14" y1="10" x2="23" y2="19" stroke="white" strokeOpacity="0.6" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-[24px] border border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04),0_16px_48px_rgba(0,0,0,0.06)] p-8">
          <h1 className="text-[20px] font-semibold text-[#1D1D1F] mb-1 text-center">Создать аккаунт</h1>
          <p className="text-[14px] text-[#6E6E73] text-center mb-7">Это бесплатно</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-[13px] mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[12px] font-medium text-[#6E6E73] mb-1.5">Email</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT} placeholder="manager@example.com"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#6E6E73] mb-1.5">Пароль</label>
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT} placeholder="минимум 6 символов"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#6E6E73] mb-1.5">Повторите пароль</label>
              <input
                type="password" required value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={INPUT} placeholder="••••••••"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-[#1D1D1F] text-white rounded-xl py-3 text-[15px] font-semibold hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors mt-1"
            >
              {loading ? "Создаём..." : "Зарегистрироваться"}
            </button>
          </form>

          <p className="mt-6 text-center text-[14px] text-[#6E6E73]">
            Уже есть аккаунт?{" "}
            <Link to="/login" className="text-indigo-600 hover:underline font-medium">Войти</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
