import { API_BASE_URL } from "../config";

function authHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getAdmins() {
  const response = await fetch(`${API_BASE_URL}/Admin`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch admins");
  return response.json();
}

export async function createAdmin(admin) {
  const response = await fetch(`${API_BASE_URL}/Admin`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(admin),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to create admin");
  }
  return response.json();
}

export async function toggleAdminStatus(id) {
  const response = await fetch(`${API_BASE_URL}/Admin/${id}/toggle-status`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to toggle admin status");
  return response.json();
}

export async function updateAdminRole(id, role) {
  const response = await fetch(`${API_BASE_URL}/Admin/${id}/role`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error("Failed to update admin role");
  return response.json();
}

export async function updateAdminProfile(id, { fullName, email }) {
  const response = await fetch(`${API_BASE_URL}/Admin/${id}/profile`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ fullName, email }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to update profile");
  }
  return response.json();
}

export async function uploadAdminPicture(id, file) {
  const token = localStorage.getItem("adminToken");
  const formData = new FormData();
  formData.append("file", file);
  // No Content-Type header — the browser sets the multipart boundary.
  const response = await fetch(`${API_BASE_URL}/Admin/${id}/picture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to upload picture");
  }
  return response.json();
}