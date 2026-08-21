import { API_BASE_URL } from "../config";

function authHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getJobs() {
  const response = await fetch(`${API_BASE_URL}/Jobs`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch jobs");
  const data = await response.json();
  // In case this endpoint is also paginated like News (items/total/page)
  return Array.isArray(data) ? data : data.items || [];
}

export async function getJobById(id) {
  const response = await fetch(`${API_BASE_URL}/Jobs/${id}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch job");
  return response.json();
}

export async function createJob(job) {
  const response = await fetch(`${API_BASE_URL}/Jobs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(job),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to create job");
  }
  return response.json();
}

export async function updateJob(id, job) {
  const response = await fetch(`${API_BASE_URL}/Jobs/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(job),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to update job");
  }
  return response.json();
}

export async function deleteJob(id) {
  const response = await fetch(`${API_BASE_URL}/Jobs/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete job");
  return true;
}

export async function getJobApplicants(jobId) {
  const response = await fetch(`${API_BASE_URL}/Jobs/${jobId}/applicants`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch applicants");
  return response.json();
}

export async function updateApplicationStatus(applicationId, status, adminNotes) {
  const response = await fetch(`${API_BASE_URL}/Jobs/applications/${applicationId}/status`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ status, adminNotes }),
  });
  if (!response.ok) throw new Error("Failed to update application status");
  return response.json();
}

export async function downloadResume(resumeId) {
    const token = localStorage.getItem("adminToken");
    const response = await fetch(`${API_BASE_URL.replace("/api", "")}/api/Resume/${resumeId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to download resume");
  
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  }