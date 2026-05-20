const BASE = "/api";

async function request(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Ошибка запроса");
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Requests
  getRequests: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
    ).toString();
    return request("GET", `/requests${qs ? "?" + qs : ""}`);
  },
  getRequest: (id) => request("GET", `/requests/${id}`),
  createRequest: (data) => request("POST", "/requests", data),
  updateRequest: (id, data) => request("PATCH", `/requests/${id}`, data),
  updateStatus: (id, data) => request("PATCH", `/requests/${id}/status`, data),
  addSparePart: (requestId, data) => request("POST", `/requests/${requestId}/spare-parts`, data),
  updateSparePart: (partId, data) => request("PATCH", `/requests/spare-parts/${partId}`, data),

  // Partners
  getPartners: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
    ).toString();
    return request("GET", `/partners${qs ? "?" + qs : ""}`);
  },
  createPartner: (data) => request("POST", "/partners", data),
  updatePartner: (id, data) => request("PATCH", `/partners/${id}`, data),
  deletePartner: (id) => request("DELETE", `/partners/${id}`),

  // Cities
  getCities: () => request("GET", "/cities"),
  createCity: (data) => request("POST", "/cities", data),
  deleteCity: (id) => request("DELETE", `/cities/${id}`),

  // Stats
  getDashboard: () => request("GET", "/stats/dashboard"),
};
