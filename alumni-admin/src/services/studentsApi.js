import { API_BASE_URL } from "../config";

function authHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getStudents() {
  const response = await fetch(`${API_BASE_URL}/Students`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch students");
  return response.json();
}

export async function getStudentStats() {
  const response = await fetch(`${API_BASE_URL}/Students/stats`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch student stats");
  return response.json();
}

export async function toggleStudentStatus(id) {
  const response = await fetch(`${API_BASE_URL}/Students/${id}/toggle-status`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to toggle student status");
  return response.json();
}

export async function getStudentProfile(id) {
  const response = await fetch(`${API_BASE_URL}/Students/${id}/profile`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch student profile");
  return response.json();
}

export async function updateStudent(id, payload) {
  const response = await fetch(`${API_BASE_URL}/Students/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to update student");
  }
  return response.json();
}

export async function resetStudentPassword(id) {
  const response = await fetch(`${API_BASE_URL}/Students/${id}/reset-password`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to reset password");
  return response.json();
}

// Maps parsed CSV rows (PascalCase headers) to the API's expected camelCase body
export async function importStudents(csvRows) {
  const payload = csvRows.map((row) => ({
    studentNumber: row.StudentNumber?.trim() || "",
    fullName: row.FullName?.trim() || "",
    email: row.Email?.trim() || "",
    program: row.Program?.trim() || "",
    schoolYear: row.SchoolYear?.trim() || "",
  }));

  const response = await fetch(`${API_BASE_URL}/Students/import`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Import failed");
  }
  return response.json();
}