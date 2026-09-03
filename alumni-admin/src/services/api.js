import { API_BASE_URL } from "../config";

export async function loginAdmin(username, password) {
  const response = await fetch(`${API_BASE_URL}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Login failed");
  }

  return response.json();
}

export function saveSession(data) {
  localStorage.setItem("adminToken", data.token);
  localStorage.setItem("adminInfo", JSON.stringify({
    fullName: data.fullName,
    username: data.username,
    role: data.role,
  }));
}

export function getSession() {
  const token = localStorage.getItem("adminToken");
  const infoRaw = localStorage.getItem("adminInfo");
  if (!token || !infoRaw) return null;

  try {
    return { token, ...JSON.parse(infoRaw) };
  } catch {
    // Corrupted stored session — treat as logged out.
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminInfo");
}