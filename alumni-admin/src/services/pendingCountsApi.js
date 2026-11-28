import { API_BASE_URL } from "../config";

// Admin nav badge counts — three fast COUNT queries, one request.
// Returns { suggestions, careers, yearChangeRequests }
export async function pendingCountsApi() {
  const response = await fetch(`${API_BASE_URL}/admin/pending-counts`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("adminToken")}` },
  });
  if (!response.ok) throw new Error("Failed to load pending counts");
  return response.json(); // { suggestions, careers, yearChangeRequests }
}