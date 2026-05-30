import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

const INPUT = "w-full border border-black/[0.1] rounded-xl px-4 py-2.5 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-white";

const SpeechRecognition =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [cities, setCities] = useState([]);
  const [partners, setPartners] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Голосовой / текстовый ИИ-ввод
  const recognitionRef = useRef(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseNote, setParseNote] = useState("");

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
    return () => { try { recognitionRef.current?.stop(); } catch { /* ignore */ } };
  }, []);

  function startListening() {
    if (!SpeechRecognition) return;
    setParseNote("");
    const rec = new SpeechRecognition();
    rec.lang = "ru-RU";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
      setTranscript(full);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error !== "aborted") setParseNote(`Ошибка распознавания: ${e.error}`);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setTranscript("");
    try { rec.start(); setListening(true); } catch { /* already started */ }
  }

  function stopListening() {
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }

  async function applyTranscript() {
    if (!transcript.trim()) return;
    if (listening) stopListening();
    setParsing(true);
    setParseNote("");
    try {
      const data = await api.parseRequest(transcript);
      if (data.error) { setParseNote(data.error); return; }
      setForm((f) => ({
        ...f,
        client_name: data.client_name || f.client_name,
        client_phone: data.client_phone || f.client_phone,
        city_id: data.city_id ? String(data.city_id) : f.city_id,
        equipment_type: data.equipment_type || f.equipment_type,
        description: data.description || f.description,
        source: data.source || f.source,
      }));
      if (data.city_name && !data.city_id) {
        setParseNote(`Город «${data.city_name}» не найден в системе — выберите вручную или добавьте на странице «Партнёры».`);
      } else {
        setParseNote("Готово! Поля заполнены — проверьте и при необходимости поправьте.");
      }
    } catch (e) {
      setParseNote(e.message);
    } finally {
      setParsing(false);
    }
  }

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

      {/* ИИ-ввод заявки голосом или текстом */}
      <div className="rounded-[20px] border border-indigo-100 bg-gradient-to-br from-[#F7F6FE] to-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] p-5 mb-5">
        <button
          type="button"
          onClick={() => setVoiceOpen((v) => !v)}
          className="flex items-center justify-between w-full"
        >
          <span className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
            </span>
            <span className="text-[15px] font-semibold text-[#1D1D1F]">Заполнить голосом или текстом</span>
          </span>
          <span className="text-[#AEAEB2] text-[13px]">{voiceOpen ? "Свернуть" : "Открыть"}</span>
        </button>

        {voiceOpen && (
          <div className="mt-4 space-y-3">
            <p className="text-[13px] text-[#6E6E73]">
              {SpeechRecognition
                ? "Нажмите «Записать» и продиктуйте заявку, либо введите текст вручную. ИИ сам разложит данные по полям."
                : "Введите или вставьте текст заявки — ИИ сам разложит данные по полям. (Голосовой ввод недоступен в этом браузере — лучше работает в Chrome.)"}
            </p>

            {SpeechRecognition && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-[#1D1D1F] text-white hover:bg-[#3A3A3C]"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                </svg>
                {listening ? "Остановить запись" : "Записать"}
              </button>
            )}

            <textarea
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Например: Звонил Иван Петров, телефон +7 999 123 45 67, Сочи, не работает лампа для маникюра, мигает и выключается"
              className={INPUT}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={applyTranscript}
                disabled={!transcript.trim() || parsing}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-2.5 rounded-xl text-[14px] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z"/>
                </svg>
                {parsing ? "Распознаю..." : "Заполнить форму"}
              </button>
              {transcript && (
                <button
                  type="button"
                  onClick={() => { setTranscript(""); setParseNote(""); }}
                  className="text-[13px] text-[#AEAEB2] hover:text-[#6E6E73] transition-colors"
                >
                  Очистить
                </button>
              )}
            </div>

            {parseNote && (
              <p className="text-[13px] text-indigo-600 bg-white/70 rounded-lg px-3 py-2">{parseNote}</p>
            )}
          </div>
        )}
      </div>

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
