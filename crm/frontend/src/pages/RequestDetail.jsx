import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import StatusBadge, { STATUS_CONFIG } from "../components/StatusBadge";

const STATUSES = Object.keys(STATUS_CONFIG);

const SPARE_PART_STATUS = {
  requested: { label: "Запрошена",    color: "text-orange-500" },
  confirmed: { label: "Подтверждена", color: "text-indigo-500" },
  sent:      { label: "Отправлена",   color: "text-emerald-500" },
};

const CARD = "bg-white rounded-[20px] border border-black/[0.05] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.04)] p-6";
const INPUT = "w-full border border-black/[0.1] rounded-xl px-4 py-2.5 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-white";

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [partners, setPartners] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [editPartner, setEditPartner] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [newPart, setNewPart] = useState("");
  const [addingPart, setAddingPart] = useState(false);

  function load() {
    api.getRequest(id).then((r) => {
      setReq(r);
      setTotalAmount(r.total_amount || "");
    }).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    api.getPartners().then(setPartners).catch(() => {});
  }, [id]);

  async function handleStatusUpdate(e) {
    e.preventDefault();
    if (!newStatus) return;
    setSaving(true);
    try {
      await api.updateStatus(id, {
        status: newStatus,
        comment: statusComment || undefined,
        changed_by: "manager",
        total_amount: totalAmount ? parseFloat(totalAmount) : undefined,
      });
      setNewStatus("");
      setStatusComment("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignPartner(e) {
    e.preventDefault();
    if (!selectedPartner) return;
    setSaving(true);
    try {
      await api.updateRequest(id, { partner_id: parseInt(selectedPartner) });
      setEditPartner(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSparePart(e) {
    e.preventDefault();
    if (!newPart.trim()) return;
    setAddingPart(true);
    try {
      await api.addSparePart(id, { part_name: newPart.trim() });
      setNewPart("");
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAddingPart(false);
    }
  }

  async function handleSparePartStatus(partId, status) {
    try {
      await api.updateSparePart(partId, { status });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  if (error) return <div className="text-red-500 p-4 text-[14px]">{error}</div>;
  if (!req) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-[#AEAEB2] text-[14px]">Загрузка...</div>
    </div>
  );

  const commission = req.total_amount ? (req.total_amount * 0.3).toFixed(0) : null;

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="text-[#AEAEB2] hover:text-[#6E6E73] mt-1 transition-colors text-[14px]">
          ← Назад
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-[22px] font-semibold text-[#1D1D1F] tracking-tight">Заявка #{req.id}</h2>
            <StatusBadge status={req.status} />
          </div>
          <p className="text-[13px] text-[#AEAEB2] mt-1">
            Создана: {new Date(req.created_at).toLocaleString("ru")}
            {req.updated_at && ` · Обновлена: ${new Date(req.updated_at).toLocaleString("ru")}`}
          </p>
        </div>
      </div>

      {/* Client info */}
      <div className={CARD}>
        <h3 className="text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider mb-4">Клиент</h3>
        <div className="space-y-3">
          <InfoRow label="Имя" value={req.client_name} />
          <InfoRow label="Телефон" value={
            <a href={`tel:${req.client_phone}`} className="text-indigo-600 hover:underline">{req.client_phone}</a>
          } />
          <InfoRow label="Город" value={req.city?.name || "—"} />
          <InfoRow label="Источник" value={req.source === "avito" ? "Авито" : req.source} />
          <InfoRow label="Оборудование" value={req.equipment_type || "—"} />
          {req.description && (
            <div>
              <p className="text-[12px] text-[#AEAEB2] mb-1.5">Описание</p>
              <p className="text-[14px] text-[#3A3A3C] bg-[#F5F5F7] rounded-xl p-3 whitespace-pre-wrap leading-relaxed">{req.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Partner */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider">Партнёр</h3>
          <button
            onClick={() => setEditPartner(!editPartner)}
            className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
          >
            {req.partner ? "Изменить" : "Назначить"}
          </button>
        </div>
        {req.partner ? (
          <div className="space-y-3">
            <InfoRow label="Имя" value={req.partner.name} />
            <InfoRow label="Телефон" value={req.partner.phone || "—"} />
            <InfoRow label="Telegram" value={
              req.partner.telegram_username ? `@${req.partner.telegram_username}` :
              req.partner.telegram_id ? `ID: ${req.partner.telegram_id}` : "не привязан"
            } />
            {req.partner_comment && (
              <div>
                <p className="text-[12px] text-[#AEAEB2] mb-1.5">Комментарий партнёра</p>
                <p className="text-[14px] text-[#3A3A3C] bg-[#F5F5F7] rounded-xl p-3">{req.partner_comment}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[14px] text-[#AEAEB2]">Партнёр не назначен</p>
        )}
        {editPartner && (
          <form onSubmit={handleAssignPartner} className="mt-4 flex gap-2">
            <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)} className={`flex-1 ${INPUT}`}>
              <option value="">— выберите партнёра —</option>
              {partners.filter((p) => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.city?.name || "без города"})</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedPartner || saving}
              className="bg-[#1D1D1F] text-white px-5 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors"
            >
              Сохранить
            </button>
          </form>
        )}
      </div>

      {/* Finance */}
      <div className={CARD}>
        <h3 className="text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider mb-4">Финансы</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[12px] text-[#AEAEB2] mb-1">Сумма ремонта</p>
            <p className="text-[20px] font-semibold text-[#1D1D1F] tracking-tight">
              {req.total_amount ? `${req.total_amount.toLocaleString("ru")} ₽` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-[#AEAEB2] mb-1">Комиссия 30%</p>
            <p className="text-[20px] font-semibold text-emerald-600 tracking-tight">
              {commission ? `${parseInt(commission).toLocaleString("ru")} ₽` : "—"}
            </p>
          </div>
          <div>
            <p className="text-[12px] text-[#AEAEB2] mb-1">Партнёру 70%</p>
            <p className="text-[20px] font-semibold text-[#6E6E73] tracking-tight">
              {req.total_amount ? `${(req.total_amount * 0.7).toLocaleString("ru", { maximumFractionDigits: 0 })} ₽` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Status change */}
      <div className={CARD}>
        <h3 className="text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider mb-4">Изменить статус</h3>
        <form onSubmit={handleStatusUpdate} className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNewStatus(s === newStatus ? "" : s)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                  newStatus === s
                    ? "bg-[#1D1D1F] text-white"
                    : "bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#EBEBED]"
                }`}
              >
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
          {["done", "closed"].includes(newStatus) && (
            <input
              type="number"
              placeholder="Сумма ремонта (₽)"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className={INPUT}
            />
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Комментарий (необязательно)"
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              className={`flex-1 ${INPUT}`}
            />
            <button
              type="submit"
              disabled={!newStatus || saving}
              className="bg-[#1D1D1F] text-white px-5 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors"
            >
              {saving ? "..." : "Обновить"}
            </button>
          </div>
        </form>
      </div>

      {/* Spare parts */}
      <div className={CARD}>
        <h3 className="text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider mb-4">Запчасти</h3>
        {req.spare_parts.length === 0 ? (
          <p className="text-[14px] text-[#AEAEB2] mb-4">Запчасти не запрашивались</p>
        ) : (
          <div className="space-y-2 mb-4">
            {req.spare_parts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-[#F5F5F7] rounded-[14px]">
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#1D1D1F]">{p.part_name}</p>
                  <p className="text-[12px] text-[#AEAEB2] mt-0.5">
                    Кол-во: {p.quantity}{p.price ? ` · ${p.price.toLocaleString("ru")} ₽` : ""}
                  </p>
                </div>
                <span className={`text-[12px] font-medium ${SPARE_PART_STATUS[p.status]?.color}`}>
                  {SPARE_PART_STATUS[p.status]?.label || p.status}
                </span>
                {p.status !== "sent" && (
                  <select
                    value={p.status}
                    onChange={(e) => handleSparePartStatus(p.id, e.target.value)}
                    className="text-[12px] border border-black/[0.1] rounded-lg px-2 py-1.5 bg-white focus:outline-none"
                  >
                    <option value="requested">Запрошена</option>
                    <option value="confirmed">Подтверждена</option>
                    <option value="sent">Отправлена</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddSparePart} className="flex gap-2">
          <input
            type="text"
            placeholder="Название запчасти..."
            value={newPart}
            onChange={(e) => setNewPart(e.target.value)}
            className={`flex-1 ${INPUT}`}
          />
          <button
            type="submit"
            disabled={!newPart.trim() || addingPart}
            className="bg-[#1D1D1F] text-white px-5 py-2.5 rounded-xl text-[14px] font-medium hover:bg-[#3A3A3C] disabled:opacity-40 transition-colors"
          >
            Добавить
          </button>
        </form>
      </div>

      {/* Status history */}
      <div className={CARD}>
        <h3 className="text-[11px] font-semibold text-[#AEAEB2] uppercase tracking-wider mb-4">История статусов</h3>
        {req.status_logs.length === 0 ? (
          <p className="text-[14px] text-[#AEAEB2]">История пуста</p>
        ) : (
          <div className="space-y-3">
            {[...req.status_logs].reverse().map((log) => (
              <div key={log.id}>
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={log.status} />
                  <span className="text-[12px] text-[#AEAEB2]">{new Date(log.created_at).toLocaleString("ru")}</span>
                  <span className="text-[12px] text-[#AEAEB2] ml-auto">
                    {log.changed_by.startsWith("partner:") ? "Партнёр" : log.changed_by}
                  </span>
                </div>
                {log.comment && (
                  <p className="text-[13px] text-[#6E6E73] mt-1.5 pl-1">{log.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-4 text-[14px]">
      <span className="text-[#AEAEB2] w-24 shrink-0">{label}</span>
      <span className="font-medium text-[#1D1D1F] min-w-0 break-words">{value}</span>
    </div>
  );
}
