import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [cities, setCities] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);

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
    if (!confirm("Деактивировать партнёра?")) return;
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

  const [newCity, setNewCity] = useState("");

  return (
    <div className="max-w-4xl space-y-5">
      <h2 className="text-2xl font-bold">Партнёры</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Cities management */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Города ({cities.length})</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {cities.map((c) => (
            <span key={c.id} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
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
            className="border rounded-lg px-3 py-1.5 text-sm flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newCity.trim()}
            className="text-sm bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            Добавить
          </button>
        </form>
      </div>

      <button
        onClick={openAdd}
        className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-4 rounded-2xl text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        Добавить партнёра
      </button>

      {/* Partners table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {partners.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Партнёры не добавлены</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Имя</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium hidden sm:table-cell">Город</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium hidden md:table-cell">Телефон</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium hidden md:table-cell">Telegram</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {partners.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-50 ${!p.is_active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{p.city?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.phone || "—"}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {p.telegram_username
                      ? `@${p.telegram_username}`
                      : p.telegram_id
                      ? <span className="font-mono text-xs">{p.telegram_id}</span>
                      : <span className="text-red-400 text-xs">не привязан</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {p.is_active ? "Активен" : "Неактивен"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(p)}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Изменить
                      </button>
                      {p.is_active && (
                        <button
                          onClick={() => handleDeactivate(p.id)}
                          className="text-red-400 text-xs hover:underline"
                        >
                          Деактивировать
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-lg mb-4">
              {editing ? "Редактировать партнёра" : "Новый партнёр"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
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
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-gray-50">Отмена</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
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
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const INPUT = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const EMPTY_FORM = { name: "", phone: "", telegram_id: "", telegram_username: "", city_id: "", is_active: true };
