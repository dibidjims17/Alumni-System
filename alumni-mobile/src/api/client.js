// src/api/client.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

// Tiny event bus so the auth context can react to expired/invalid tokens.
const unauthorizedListeners = new Set();
export function onUnauthorized(callback) {
  unauthorizedListeners.add(callback);
  return () => unauthorizedListeners.delete(callback);
}

async function clearSession() {
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('studentData');
  unauthorizedListeners.forEach((cb) => {
    try { cb(); } catch {}
  });
}

async function request(method, path, body) {
  const token = await AsyncStorage.getItem('authToken');

  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Only treat 401 as an expired session when we actually sent a token;
  // a failed login also returns 401 and must surface the server message.
  if (res.status === 401 && token) {
    await clearSession();
    throw new Error('Your session has expired. Please log in again.');
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    // Mimic axios's error shape so existing catch blocks
    // (err.response?.data?.message, etc.) keep working unchanged
    const error = new Error(
      (data && data.message) || `Request failed with status ${res.status}`
    );
    error.response = { status: res.status, data };
    throw error;
  }

  return { data, status: res.status };
}

async function uploadFile(path, fileUri, fileName, mimeType) {
  const token = await AsyncStorage.getItem('authToken');

  const formData = new FormData();
  formData.append('file', {
    uri: fileUri,
    name: fileName,
    type: mimeType,
  });

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Deliberately NOT setting Content-Type — letting fetch set the
  // multipart boundary automatically is required for FormData uploads.

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401 && token) {
    await clearSession();
    throw new Error('Your session has expired. Please log in again.');
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const error = new Error(
      (data && data.message) || `Upload failed with status ${res.status}`
    );
    error.response = { status: res.status, data };
    throw error;
  }

  return { data, status: res.status };
}

const apiClient = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
  uploadFile: (path, fileUri, fileName, mimeType) => uploadFile(path, fileUri, fileName, mimeType),
};

export default apiClient;