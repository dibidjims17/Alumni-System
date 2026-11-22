import { API_BASE_URL } from "../config";

function authHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Review queue for user-submitted post suggestions (SuperAdmin + Staff,
// enforced by the API). Pending rows sort first server-side.
export async function getSuggestions(status = "", page = 1, pageSize = 100) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (status) params.set("status", status);
  const response = await fetch(`${API_BASE_URL}/NewsSuggestion?${params}`, {
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to fetch suggestions");
  return data;
}

// Approve (publishes to the Community feed as a News post) or Reject
// (note required by the backend). Returns { message }.
export async function reviewSuggestion(id, status, note = null) {
  const response = await fetch(`${API_BASE_URL}/NewsSuggestion/${id}/review`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status, reviewNote: note }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to review suggestion");
  return data;
}
