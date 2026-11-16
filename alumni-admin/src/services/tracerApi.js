import { API_BASE_URL } from "../config";

// Admin Tracer Study reporting (P3) — read-only, SuperAdmin + Staff.
// Auth header convention matches jobsApi: Bearer token from localStorage.

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("adminToken")}` };
}

// Paged, filtered responses for the admin table.
// filters: { search, status, employment, relatedness, program }
export async function getTracerResponses(page = 1, filters = {}) {
  const params = new URLSearchParams({ page: String(page) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const response = await fetch(`${API_BASE_URL}/Tracer/responses?${params}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load tracer responses");
  return response.json(); // { items, total, page, pageSize }
}

// Stats cards + distributions (response rate, funnel, outcomes, skills).
export async function getTracerStats() {
  const response = await fetch(`${API_BASE_URL}/Tracer/stats`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to load tracer stats");
  return response.json();
}

// CSV download of every response (the school deliverable). Blob pattern
// copied from jobsApi.exportApplicants.
export async function exportTracerCsv() {
  const response = await fetch(`${API_BASE_URL}/Tracer/export`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to export tracer responses");

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `tracer_responses_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
