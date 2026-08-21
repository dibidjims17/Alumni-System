import { API_BASE_URL } from "../config";

function authHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getStudentDocuments(studentId) {
  const response = await fetch(`${API_BASE_URL}/Documents/student/${studentId}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch documents");
  return response.json();
}

export async function initializeChecklist(studentId) {
  const response = await fetch(`${API_BASE_URL}/Documents/student/${studentId}/initialize`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to initialize checklist");
  return response.json();
}

export async function updateDocumentStatus(documentId, status, notes) {
  const response = await fetch(`${API_BASE_URL}/Documents/${documentId}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status, notes }),
  });
  if (!response.ok) throw new Error("Failed to update document");
  return response.json();
}

export async function addCustomDocument(studentId, documentType, customLabel) {
  const response = await fetch(`${API_BASE_URL}/Documents/student/${studentId}/custom`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ documentType, customLabel }),
  });
  if (!response.ok) throw new Error("Failed to add custom document");
  return response.json();
}

export async function deleteDocument(documentId) {
  const response = await fetch(`${API_BASE_URL}/Documents/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete document");
  return true;
}

// Maps parsed CSV rows (PascalCase headers) to the API's expected camelCase body
export async function importDocuments(csvRows) {
  const payload = csvRows.map((row) => ({
    studentNumber: row.StudentNumber?.trim() || "",
    documentType: row.DocumentType?.trim() || "",
    status: row.Status?.trim() || "",
    notes: row.Notes?.trim() || "",
  }));

  const response = await fetch(`${API_BASE_URL}/Documents/import`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Document import failed");
  }
  return response.json();
}