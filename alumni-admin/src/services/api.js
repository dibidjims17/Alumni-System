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

export async function adminForgotPassword(email) {
  const response = await fetch(`${API_BASE_URL}/admin/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to send reset code");
  }

  return response.json();
}

export async function adminResetPassword(email, code, newPassword) {
  const response = await fetch(`${API_BASE_URL}/admin/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, code, newPassword }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to reset password");
  }

  return response.json();
}

export function saveSession(data) {
  localStorage.setItem("adminToken", data.token);
  localStorage.setItem("adminInfo", JSON.stringify({
    fullName: data.fullName,
    username: data.username,
    role: data.role,
    profilePicturePath: data.profilePicturePath || null,
  }));
}

// Refresh stored profile fields (name/photo) after a self-edit without
// forcing a full re-login. Listeners (Layout header) refresh via the
// "admin-session-updated" window event.
export function patchSession(patch) {
  try {
    const infoRaw = localStorage.getItem("adminInfo");
    if (!infoRaw) return;
    localStorage.setItem("adminInfo", JSON.stringify({ ...JSON.parse(infoRaw), ...patch }));
    window.dispatchEvent(new Event("admin-session-updated"));
  } catch {
    // Corrupted session — treat it as logged out.
  }
}

export function getSession() {
  const token = localStorage.getItem("adminToken");
  const infoRaw = localStorage.getItem("adminInfo");
  if (!token || !infoRaw) return null;

  // A JWT that has expired (or was signed by an old key) is useless — treat
  // it as logged out so pages never render with dead data and toast errors.
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearSession();
      return null;
    }
  } catch {
    clearSession();
    return null;
  }

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

// Central 401 safety net: if the API rejects any authenticated call (expired
// token, key rotation), drop the session and return to the login screen.
// The admin login request itself returns 401 on bad credentials and is exempt.
const originalFetch = window.fetch.bind(window);
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const url = typeof args[0] === "string" ? args[0] : "";
  const isLogin = url.toLowerCase().includes("/login");
  if (response && response.status === 401 && !isLogin) {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign("/login");
    }
  }
  return response;
};