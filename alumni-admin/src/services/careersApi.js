import { API_BASE_URL } from "../config";

function authHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getCareers(status = "") {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(`${API_BASE_URL}/Career${query}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch career submissions");
  return response.json();
}

export async function getCareerStats() {
  const response = await fetch(`${API_BASE_URL}/Career/stats`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch career stats");
  return response.json();
}

export async function getStudentCareer(studentId) {
  const response = await fetch(`${API_BASE_URL}/Career/student/${studentId}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch career record");
  return response.json();
}

export async function reviewCareer(id, status, note = null, courseAlignment = null) {
  const response = await fetch(`${API_BASE_URL}/Career/${id}/review`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status, note, courseAlignment }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to review submission");
  return data;
}

export async function sendCareerReminder(studentId) {
  const response = await fetch(`${API_BASE_URL}/Career/student/${studentId}/remind`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to send career reminder");
  return data;
}

// Month-scoped career report (SuperAdmin): submissions received in the
// month, review workload, distributions and the rows behind them.
export async function getCareerReport(year, month) {
  const response = await fetch(
    `${API_BASE_URL}/Career/report?year=${year}&month=${month}`,
    { headers: authHeaders() }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Failed to fetch career report");
  return data;
}

// CSV download of the same rows. Blob pattern copied from tracerApi.
export async function exportCareerReportCsv(year, month) {
  const response = await fetch(
    `${API_BASE_URL}/Career/report/export?year=${year}&month=${month}`,
    { headers: authHeaders() }
  );
  if (!response.ok) throw new Error("Failed to export career report");

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `career_report_${year}-${String(month).padStart(2, "0")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
