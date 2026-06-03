import React, { useEffect, useState } from "react";
import { api } from "../api";

const CARD = "bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)]";
const INPUT = "w-full border border-black/[0.1] rounded-xl px-4 py-2.5 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-white";

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [cities, setCities] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [newCity, setNewCity] = useState("");

  function load() {
    api.getPartners().then(setPartners).catch((e) => setError(e.message));
    api.getCities().then(setCities).catch(() => {});
  }

  useEffect(load, []);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(p) {
    setEditing(p.id);
    setForm({
      name: p.name,
      phone: p.phone || "",
      telegram_id: p.telegram_id || "",
      telegram_username: p.telegram_username || "",
      city_id: p.city_id ? String(p.city_id) : "",
      is_active: p.is_active,
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      city_id: form.city_id ? parseInt(form.city_id) : null,
      telegram_id: form.telegram_id || null,
      telegram_username: form.telegram_username || null,
    };
    try {
      if (editing) {
        await api.updatePartner(editing, payload);
      } else {
        await api.createPartner(payload);
      }
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(id) {
    if (!confirm("Удалить партнёра?")) return;
    try {
      await api.deletePartner(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddCity(name) {
    if (!name.trim()) return;
    try {
      await api.createCity({ name: name.trim() });
      api.getCities().then(setCities);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <h2 className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight">Партнёры</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-[14px]">
          {error}
        </div>
      )}

      {/* Cities */}
      <div className={`${CARD} p-6`}>
        <h3 className="text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider mb-4">Города ({cities.length})</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {cities.map((c) => (
            <span key={c.id} className="bg-[#F5F5F7] text-[#3A3A3C] px-3 py-1 rounded-full text-[13px] font-medium">
              {c.name}
            </span>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); handleAddCity(newCity); setNewCity(""); }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Добавить город..."
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            className={`${INPUT} flex-1 max-w-xs`}
          />
          <button
            type="submit"
            disabled={!newCity.trim()}
            className="bg-[#1D1D1F] text-white px-4 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors"
          >
            Добавить
          </button>
        </form>
      </div>

      <button
        onClick={openAdd}
        className="flex items-center justify-center gap-2 w-full bg-[#1D1D1F] text-white py-4 rounded-[20px] text-[14px] font-medium hover:bg-[#3A3A3C] transition-colors mb-4"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Добавить партнёра
      </button>

      {/* Partners list */}
      <div className={`${CARD} overflow-hidden`}>
        {partners.length === 0 ? (
          <div className="p-12 text-center text-[#AEAEB2] text-[14px]">Партнёры не добавлены</div>
        ) : (
          <>
          {/* Мобильный список (карточки) */}
          <div className="sm:hidden divide-y divide-black/[0.04]">
            {partners.map((p) => (
              <div
                key={p.id}
                onClick={() => openEdit(p)}
                className={`px-5 py-4 flex items-start gap-3 hover:bg-[#F9F9FB] transition-colors cursor-pointer ${!p.is_active ? "opacity-50" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[#1D1D1F] truncate">{p.name}</p>
                  <p className="text-[13px] text-[#AEAEB2] truncate mt-0.5">
                    {[p.city?.name, p.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                  <p className="text-[12px] mt-1">
                    {p.telegram_username
                      ? <span className="text-[#6E6E73]">@{p.telegram_username}</span>
                      : p.telegram_id
                      ? <span className="font-mono text-[#6E6E73]">{p.telegram_id}</span>
                      : <span className="text-red-400">Telegram не привязан</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${
                    p.is_active ? "bg-emerald-50 text-emerald-600" : "bg-[#F2F2F7] text-[#6E6E73]"
                  }`}>
                    {p.is_active ? "Активен" : "Неактивен"}
                  </span>
                  {p.is_active && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeactivate(p.id); }}
                      className="text-red-400 text-[13px] font-medium hover:underline"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Десктопная таблица */}
          <table className="hidden sm:table w-full text-[14px]">
            <thead>
              <tr className="border-b border-black/[0.05]">
                <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider">Имя</th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider hidden sm:table-cell">Город</th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider hidden md:table-cell">Телефон</th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider hidden md:table-cell">Telegram</th>
                <th className="px-5 py-4 text-left text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider">Статус</th>
                <th className="px-5 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04]">
              {partners.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => openEdit(p)}
                  className={`hover:bg-[#F9F9FB] transition-colors cursor-pointer ${!p.is_active ? "opacity-40" : ""}`}
                >
                  <td className="px-5 py-3.5 font-medium text-[#1D1D1F]">{p.name}</td>
                  <td className="px-5 py-3.5 text-[#6E6E73] hidden sm:table-cell">{p.city?.name || "—"}</td>
                  <td className="px-5 py-3.5 text-[#6E6E73] hidden md:table-cell">{p.phone || "—"}</td>
                  <td className="px-5 py-3.5 text-[#6E6E73] hidden md:table-cell">
                    {p.telegram_username
                      ? `@${p.telegram_username}`
                      : p.telegram_id
                      ? <span className="font-mono text-[13px]">{p.telegram_id}</span>
                      : <span className="text-red-400 text-[13px]">не привязан</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${
                      p.is_active ? "bg-emerald-50 text-emerald-600" : "bg-[#F2F2F7] text-[#6E6E73]"
                    }`}>
                      {p.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      {p.is_active && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeactivate(p.id); }}
                          className="text-red-400 text-[13px] hover:underline"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md p-7">
            <h3 className="text-[17px] font-semibold text-[#1D1D1F] mb-5">
              {editing ? "Редактировать партнёра" : "Новый партнёр"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Имя *">
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} placeholder="ИП Иванов" />
              </Field>
              <Field label="Город">
                <select value={form.city_id} onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value }))} className={INPUT}>
                  <option value="">— выберите —</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Телефон">
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={INPUT} placeholder="+7 999 000 0000" />
              </Field>
              <Field label="Telegram ID">
                <input value={form.telegram_id} onChange={(e) => setForm((f) => ({ ...f, telegram_id: e.target.value }))} className={INPUT} placeholder="Числовой ID из /start бота" />
              </Field>
              <Field label="Telegram username">
                <input value={form.telegram_username} onChange={(e) => setForm((f) => ({ ...f, telegram_username: e.target.value }))} className={INPUT} placeholder="username (без @)" />
              </Field>
              {error && <p className="text-red-500 text-[13px]">{error}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-black/[0.1] rounded-xl py-2.5 text-[14px] text-[#3A3A3C] hover:bg-[#F5F5F7] transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#1D1D1F] text-white rounded-xl py-2.5 text-[14px] font-medium hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors"
                >
                  {saving ? "..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[#6E6E73] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const EMPTY_FORM = { name: "", phone: "", telegram_id: "", telegram_username: "", city_id: "", is_active: true };
