const BASE = "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Не авторизован");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Ошибка запроса");
  }
  if (res.status === 204) return null;
  return res.json();
}

async function loginRequest(email, password) {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Ошибка входа");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (email, password) => loginRequest(email, password),
  me: () => request("GET", "/auth/me"),
  checkSetup: () => request("GET", "/auth/check-setup"),
  setup: (name, email, password) => request("POST", "/auth/setup", { name, email, password }),
  register: (email, password) => request("POST", "/auth/register", { name: email, email, password }),
  logout: () => { localStorage.removeItem("token"); window.location.href = "/login"; },

  // Requests
  getRequests: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
    ).toString();
    return request("GET", `/requests${qs ? "?" + qs : ""}`);
  },
  getRequest: (id) => request("GET", `/requests/${id}`),
  getPriorities: (limit = 6) => request("GET", `/requests/priorities?limit=${limit}`),
  getAiInsight: (id) => request("POST", `/requests/${id}/ai-insight`),
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
  getAiSummary: () => request("POST", "/stats/ai-summary"),
};
