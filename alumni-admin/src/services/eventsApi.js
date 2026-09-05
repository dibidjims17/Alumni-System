import { API_BASE_URL } from "../config";

function authHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getAllEvents(search = "") {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const response = await fetch(`${API_BASE_URL}/Events/all${query}`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch events");
  const data = await response.json();
  return Array.isArray(data) ? data : data.items || [];
}

export async function createEvent(event) {
  const response = await fetch(`${API_BASE_URL}/Events`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(event),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to create event");
  }
  return response.json();
}

export async function updateEvent(id, event) {
  const response = await fetch(`${API_BASE_URL}/Events/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(event),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to update event");
  }
  return response.json();
}

export async function deleteEvent(id) {
  const response = await fetch(`${API_BASE_URL}/Events/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to delete event");
  return response.json();
}

export async function getEventAttendees(eventId) {
  const response = await fetch(`${API_BASE_URL}/Events/${eventId}/attendees`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch attendees");
  return response.json();
}

export async function getDeletedEvents() {
  const response = await fetch(`${API_BASE_URL}/Events/trash`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch event trash");
  return response.json();
}

export async function restoreEvent(id) {
  const response = await fetch(`${API_BASE_URL}/Events/${id}/restore`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to restore event");
  return response.json();
}

export async function permanentlyDeleteEvent(id) {
  const response = await fetch(`${API_BASE_URL}/Events/${id}/permanent`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Failed to permanently delete event");
  return response.json();
}
