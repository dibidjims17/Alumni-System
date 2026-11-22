// The desktop admin and API run on the same machine.
const LOCAL_IP = '10.14.135.128';
const PORT = '5207';

// Cloudflare Pages supplies VITE_API_BASE_URL at build time. Local Electron
// and Vite development continue to use the current LAN address as fallback.
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || `http://${LOCAL_IP}:${PORT}/api`
).replace(/\/+$/, '');

// Google Sign-In for the admin console (Google Identity Services).
// Set via .env file:  VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
// and register http://localhost:5173 in the OAuth client's authorized origins.
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  'PASTE_YOUR_GOOGLE_WEB_CLIENT_ID_HERE.apps.googleusercontent.com';

export const isGoogleConfigured = () =>
  GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.startsWith('PASTE_YOUR_');
