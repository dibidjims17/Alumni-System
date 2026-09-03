import { API_BASE_URL } from "../config";

function authHeader() {
  const token = localStorage.getItem("adminToken");
  return { Authorization: `Bearer ${token}` };
}

export async function getNews(search = "") {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
  const response = await fetch(`${API_BASE_URL}/News${query}`, {
    headers: authHeader(),
  });
  if (!response.ok) throw new Error("Failed to fetch news");
  const data = await response.json();
  // In case this endpoint is also paginated like News (items/total/page)
  return Array.isArray(data) ? data : data.items || [];
}

export async function getNewsById(id) {
  const response = await fetch(`${API_BASE_URL}/News/${id}`, {
    headers: authHeader(),
  });
  if (!response.ok) throw new Error("Failed to fetch news item");
  return response.json();
}

// title, content, isPublished, imageFile (File object or null)
export async function createNews({ title, content, isPublished, imageFile }) {
  const formData = new FormData();
  formData.append("Title", title);
  formData.append("Content", content);
  formData.append("IsPublished", isPublished);
  if (imageFile) formData.append("image", imageFile);

  const response = await fetch(`${API_BASE_URL}/News`, {
    method: "POST",
    headers: authHeader(), // don't set Content-Type manually for FormData — browser sets the boundary
    body: formData,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to create news");
  }
  return response.json();
}

export async function updateNews(id, { title, content, isPublished, imageFile }) {
  const formData = new FormData();
  formData.append("Title", title);
  formData.append("Content", content);
  formData.append("IsPublished", isPublished);
  if (imageFile) formData.append("image", imageFile);

  const response = await fetch(`${API_BASE_URL}/News/${id}`, {
    method: "PUT",
    headers: authHeader(),
    body: formData,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || "Failed to update news");
  }
  return response.json();
}

export async function deleteNews(id) {
  const response = await fetch(`${API_BASE_URL}/News/${id}`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!response.ok) throw new Error("Failed to delete news");
  return true;
}

export async function getNewsDetail(id) {
  const response = await fetch(`${API_BASE_URL}/News/${id}`, {
    headers: authHeader(),
  });
  if (!response.ok) throw new Error("Failed to fetch news detail");
  return response.json();
}

export async function deleteCommentAsAdmin(commentId) {
  const response = await fetch(`${API_BASE_URL}/News/comments/${commentId}/admin`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!response.ok) throw new Error("Failed to delete comment");
  return true;
}

export async function getDeletedNews() {
  const response = await fetch(`${API_BASE_URL}/News/trash`, {
    headers: authHeader(),
  });
  if (!response.ok) throw new Error("Failed to fetch news trash");
  return response.json();
}

export async function restoreNews(id) {
  const response = await fetch(`${API_BASE_URL}/News/${id}/restore`, {
    method: "PUT",
    headers: authHeader(),
  });
  if (!response.ok) throw new Error("Failed to restore news");
  return response.json();
}

export async function permanentlyDeleteNews(id) {
  const response = await fetch(`${API_BASE_URL}/News/${id}/permanent`, {
    method: "DELETE",
    headers: authHeader(),
  });
  if (!response.ok) throw new Error("Failed to permanently delete news");
  return response.json();
}