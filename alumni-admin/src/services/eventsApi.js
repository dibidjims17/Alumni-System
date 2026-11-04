import { API_BASE_URL } from "../config";

const FILE_ROOT = API_BASE_URL.replace("/api", "");

function authHeaders() {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// For FormData bodies: the browser must set Content-Type itself so it can
// include the multipart boundary.
function authHeader() {
  const token = localStorage.getItem("adminToken");
  return { Authorization: `Bearer ${token}` };
}

// Turns a stored image path (relative "Uploads/Events/x" or a legacy
// absolute server path) into a browser-loadable URL.
export function eventImageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = String(path).replace(/\\/g, "/");
  const marker = "Uploads/";
  const index = normalized.indexOf(marker);
  const relative = index >= 0 ? normalized.slice(index) : normalized.replace(/^\//, "");
  return `${FILE_ROOT}/${relative}`;
}

// Create/update now travel as multipart so the flyer rides along with the
// event instead of needing a second request.
function toFormData({ title, description, location, eventDate, isPublished, publishAt, imageFile, removeImage }) {
  const formData = new FormData();
  formData.append("Title", title);
  formData.append("Description", description);
  formData.append("Location", location);
  formData.append("EventDate", eventDate);
  formData.append("IsPublished", String(isPublished));
  if (publishAt) formData.append("PublishAt", publishAt);
  if (removeImage) formData.append("RemoveImage", "true");
  if (imageFile) formData.append("image", imageFile);
  return formData;
}

export async function getAllEvents(search = "", status = "") {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);
  const query = params.toString() ? `?${params.toString()}` : "";
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
    headers: authHeader(),
    body: toFormData(event),
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
    headers: authHeader(),
    body: toFormData(event),
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
