import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";

const STATUSES = [
  { value: "", label: "Все статусы" },
  { value: "new", label: "Новая" },
  { value: "transferred", label: "Передана партнёру" },
  { value: "in_progress", label: "В работе" },
  { value: "waiting_parts", label: "Ожидает запчасти" },
  { value: "parts_sent", label: "Запчасти отправлены" },
  { value: "done", label: "Готово" },
  { value: "closed", label: "Закрыта / Оплачена" },
];

export default function RequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const status = searchParams.get("status") || "";
  const cityId = searchParams.get("city_id") || "";

  useEffect(() => {
    api.getCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { status, city_id: cityId, search: search || undefined, limit: 100 };
    api.getRequests(params)
      .then(setRequests)
      .finally(() => setLoading(false));
  }, [status, cityId, search]);

  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Заявки</h2>
        <Link
          to="/requests/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Новая заявка
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Поиск по имени, телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => setFilter("status", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={cityId}
          onChange={(e) => setFilter("city_id", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все города</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Загрузка...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Заявки не найдены</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-gray-500 font-medium w-12">#</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Клиент</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium hidden md:table-cell">Оборудование</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium hidden sm:table-cell">Город</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium hidden lg:table-cell">Партнёр</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium">Статус</th>
                <th className="px-4 py-3 text-left text-gray-500 font-medium hidden sm:table-cell">Дата</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{r.id}</td>
                  <td className="px-4 py-3">
                    <Link to={`/requests/${r.id}`} className="hover:text-blue-600 transition-colors">
                      <p className="font-medium">{r.client_name}</p>
                      <p className="text-gray-400">{r.client_phone}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {r.equipment_type || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                    {r.city?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                    {r.partner?.name || <span className="text-gray-400 italic">не назначен</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                    {new Date(r.created_at).toLocaleDateString("ru")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-sm text-gray-400">{requests.length} заявок</p>
    </div>
  );
}
