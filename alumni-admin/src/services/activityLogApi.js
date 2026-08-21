import { API_BASE_URL } from "../config";

function authHeaders() {
  const token = localStorage.getItem("adminToken");
  return { Authorization: `Bearer ${token}` };
}

export async function getActivityLogPage(page = 1) {
  const response = await fetch(`${API_BASE_URL}/ActivityLog?page=${page}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch activity log");
  return response.json(); // { items, total, page }
}

// Fetches every page and combines them into one array
export async function getAllActivityLogs() {
  const first = await getActivityLogPage(1);
  let allItems = [...first.items];
  const total = first.total;
  const pageSize = first.items.length; // infer page size from first response

  let currentPage = 2;
  while (allItems.length < total && pageSize > 0) {
    const next = await getActivityLogPage(currentPage);
    if (!next.items || next.items.length === 0) break; // safety stop
    allItems = allItems.concat(next.items);
    currentPage++;
  }

  return allItems;
}