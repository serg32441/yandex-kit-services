import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const INPUT = "w-full border border-black/[0.1] rounded-xl px-4 py-2.5 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-white";

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [partners, setPartners] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    city_id: "",
    partner_id: "",
    equipment_type: "",
    description: "",
    source: "avito",
  });

  useEffect(() => {
    api.getCities().then(setCities).catch(() => {});
    api.getPartners({ active_only: true }).then(setPartners).catch(() => {});
  }, []);

  const filteredPartners = form.city_id
    ? partners.filter((p) => p.city_id === parseInt(form.city_id))
    : partners;

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "city_id") setForm((f) => ({ ...f, city_id: value, partner_id: "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.client_name.trim() || !form.client_phone.trim()) {
      setError("Имя и телефон клиента обязательны");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        city_id: form.city_id ? parseInt(form.city_id) : undefined,
        partner_id: form.partner_id ? parseInt(form.partner_id) : undefined,
      };
      const created = await api.createRequest(payload);
      navigate(`/requests/${created.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-[#AEAEB2] hover:text-[#6E6E73] transition-colors text-[14px]">
          ← Назад
        </button>
        <h2 className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight">Новая заявка</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-5 text-[14px]">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] p-6 space-y-4"
      >
        <Field label="Имя клиента *">
          <input required type="text" placeholder="Иван Иванов"
            value={form.client_name} onChange={(e) => set("client_name", e.target.value)} className={INPUT} />
        </Field>

        <Field label="Телефон *">
          <input required type="tel" placeholder="+7 999 123 4567"
            value={form.client_phone} onChange={(e) => set("client_phone", e.target.value)} className={INPUT} />
        </Field>

        <Field label="Город">
          <select value={form.city_id} onChange={(e) => set("city_id", e.target.value)} className={INPUT}>
            <option value="">— выберите город —</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Партнёр">
          <select value={form.partner_id} onChange={(e) => set("partner_id", e.target.value)} className={INPUT}>
            <option value="">— назначить позже —</option>
            {filteredPartners.filter((p) => p.is_active).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.city && form.city_id === "" ? ` (${p.city.name})` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Оборудование">
          <input type="text" placeholder="Кресло для маникюра, лампа UV..."
            value={form.equipment_type} onChange={(e) => set("equipment_type", e.target.value)} className={INPUT} />
        </Field>

        <Field label="Источник">
          <select value={form.source} onChange={(e) => set("source", e.target.value)} className={INPUT}>
            <option value="avito">Авито</option>
            <option value="phone">Звонок</option>
            <option value="repeat">Повторный клиент</option>
            <option value="referral">Рекомендация</option>
            <option value="other">Другое</option>
          </select>
        </Field>

        <Field label="Описание проблемы">
          <textarea placeholder="Опишите поломку..." value={form.description}
            onChange={(e) => set("description", e.target.value)} rows={3} className={INPUT} />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[#1D1D1F] text-white py-3 rounded-xl text-[14px] font-semibold hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors mt-2"
        >
          {saving ? "Создаю..." : "Создать заявку"}
        </button>
      </form>
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
