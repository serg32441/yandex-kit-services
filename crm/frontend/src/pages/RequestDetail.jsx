import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import StatusBadge, { STATUS_CONFIG } from "../components/StatusBadge";

const STATUSES = Object.keys(STATUS_CONFIG);

const SPARE_PART_STATUS = {
  requested: { label: "Запрошена", color: "text-orange-600" },
  confirmed: { label: "Подтверждена", color: "text-blue-600" },
  sent:      { label: "Отправлена", color: "text-green-600" },
};

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [partners, setPartners] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Edit state
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

  if (error) return <div className="text-red-500 p-4">{error}</div>;
  if (!req) return <div className="p-4 text-gray-400">Загрузка...</div>;

  const commission = req.total_amount ? (req.total_amount * 0.3).toFixed(0) : null;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 mt-1">
          ← Назад
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold">Заявка #{req.id}</h2>
            <StatusBadge status={req.status} />
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Создана: {new Date(req.created_at).toLocaleString("ru")}
            {req.updated_at && ` · Обновлена: ${new Date(req.updated_at).toLocaleString("ru")}`}
          </p>
        </div>
      </div>

      {/* Client info */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <h3 className="font-semibold text-gray-700 mb-1">Клиент</h3>
        <InfoRow label="Имя" value={req.client_name} />
        <InfoRow label="Телефон" value={
          <a href={`tel:${req.client_phone}`} className="text-blue-600 hover:underline">
            {req.client_phone}
          </a>
        } />
        <InfoRow label="Город" value={req.city?.name || "—"} />
        <InfoRow label="Источник" value={req.source === "avito" ? "Авито" : req.source} />
        <InfoRow label="Оборудование" value={req.equipment_type || "—"} />
        {req.description && (
          <div>
            <p className="text-xs text-gray-400 mb-1">Описание</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-2">
              {req.description}
            </p>
          </div>
        )}
      </div>

      {/* Partner */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Партнёр</h3>
          <button
            onClick={() => setEditPartner(!editPartner)}
            className="text-blue-600 text-sm hover:underline"
          >
            {req.partner ? "Изменить" : "Назначить"}
          </button>
        </div>

        {req.partner ? (
          <div className="space-y-2">
            <InfoRow label="Имя" value={req.partner.name} />
            <InfoRow label="Телефон" value={req.partner.phone || "—"} />
            <InfoRow label="Telegram" value={
              req.partner.telegram_username ? `@${req.partner.telegram_username}` :
              req.partner.telegram_id ? `ID: ${req.partner.telegram_id}` : "не привязан"
            } />
            {req.partner_comment && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Комментарий партнёра</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">{req.partner_comment}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Партнёр не назначен</p>
        )}

        {editPartner && (
          <form onSubmit={handleAssignPartner} className="mt-3 flex gap-2">
            <select
              value={selectedPartner}
              onChange={(e) => setSelectedPartner(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— выберите партнёра —</option>
              {partners.filter((p) => p.is_active).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city?.name || "без города"})
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedPartner || saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Сохранить
            </button>
          </form>
        )}
      </div>

      {/* Finance */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Финансы</h3>
        <div className="flex gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-400">Сумма ремонта</p>
            <p className="font-bold text-lg">{req.total_amount ? `${req.total_amount.toLocaleString("ru")} ₽` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Ваша комиссия (30%)</p>
            <p className="font-bold text-lg text-green-600">{commission ? `${parseInt(commission).toLocaleString("ru")} ₽` : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Партнёру (70%)</p>
            <p className="font-bold text-lg text-gray-600">
              {req.total_amount ? `${(req.total_amount * 0.7).toLocaleString("ru", { maximumFractionDigits: 0 })} ₽` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Status change */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Изменить статус</h3>
        <form onSubmit={handleStatusUpdate} className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setNewStatus(s === newStatus ? "" : s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  newStatus === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-200 text-gray-600 hover:border-gray-400"
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
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Комментарий (необязательно)"
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newStatus || saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "..." : "Обновить"}
            </button>
          </div>
        </form>
      </div>

      {/* Spare parts */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Запчасти</h3>
        {req.spare_parts.length === 0 ? (
          <p className="text-gray-400 text-sm">Запчасти не запрашивались</p>
        ) : (
          <div className="space-y-2 mb-3">
            {req.spare_parts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.part_name}</p>
                  <p className="text-xs text-gray-400">
                    Кол-во: {p.quantity}
                    {p.price ? ` · ${p.price.toLocaleString("ru")} ₽` : ""}
                  </p>
                </div>
                <span className={`text-xs font-medium ${SPARE_PART_STATUS[p.status]?.color}`}>
                  {SPARE_PART_STATUS[p.status]?.label || p.status}
                </span>
                {p.status !== "sent" && (
                  <select
                    value={p.status}
                    onChange={(e) => handleSparePartStatus(p.id, e.target.value)}
                    className="text-xs border rounded px-2 py-1 focus:outline-none"
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
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newPart.trim() || addingPart}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900 disabled:opacity-50"
          >
            Добавить
          </button>
        </form>
      </div>

      {/* Status history */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-700 mb-3">История статусов</h3>
        {req.status_logs.length === 0 ? (
          <p className="text-gray-400 text-sm">История пуста</p>
        ) : (
          <div className="space-y-3">
            {[...req.status_logs].reverse().map((log) => (
              <div key={log.id} className="text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={log.status} />
                  <span className="text-gray-400 text-xs">
                    {new Date(log.created_at).toLocaleString("ru")}
                  </span>
                  <span className="text-gray-300 text-xs ml-auto">
                    {log.changed_by.startsWith("partner:") ? "Партнёр" : log.changed_by}
                  </span>
                </div>
                {log.comment && (
                  <p className="text-gray-500 text-xs mt-1 pl-1">{log.comment}</p>
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
    <div className="flex gap-3 text-sm">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className="font-medium min-w-0 break-words">{value}</span>
    </div>
  );
}
