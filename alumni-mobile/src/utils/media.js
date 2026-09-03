// src/utils/media.js
import { API_BASE_URL } from '../config';

const SERVER_ROOT = API_BASE_URL.replace(/\/api$/, '');

// Turns a server-relative path like "Uploads/News/x.png" into a full URL,
// or returns it untouched if it is already an absolute http(s) URL.
export function assetUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SERVER_ROOT}/${path}`;
}
