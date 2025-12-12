const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000";

async function api(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts
  });
  const text = await res.text();
  try { return { status: res.status, ok: res.ok, data: text ? JSON.parse(text) : null }; } catch { return { status: res.status, ok: res.ok, data: text }; }
}

export async function register(username, email, password) {
  const r = await api("/api/register", { method: "POST", body: JSON.stringify({ username, email, password }) });
  return r;
}
export async function login(usernameOrEmail, password) {
  const r = await api("/api/login", { method: "POST", body: JSON.stringify({ usernameOrEmail, password }) });
  return r;
}
export async function logout() {
  return await api("/api/logout", { method: "POST" });
}
export async function me() {
  return await api("/api/me", { method: "GET" });
}
export async function fetchSchedules() {
  return await api("/api/schedules", { method: "GET" });
}
export async function createSchedule(schedule_name, subjects) {
  return await api("/api/schedules", { method: "POST", body: JSON.stringify({ schedule_name, subjects }) });
}
export async function deleteSchedule(id) {
  return await api(`/api/schedules/${encodeURIComponent(id)}`, { method: "DELETE" });
}
export async function updateSchedule(id, payload) {
  return await api(`/api/schedules/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) });
}
