const LOCAL_IP = '192.168.254.128';
const PORT = '5207';

export const API_BASE_URL = `http://${LOCAL_IP}:${PORT}/api`;

// Google Sign-In (mobile + Expo web share the same Web client id).
// 1. Create OAuth clients in Google Cloud Console (or Firebase):
//    - Web application client  -> paste its ID here AND into backend appsettings "Google:ClientId"
//    - Android client (package com.dibidjims17.alumnimobile + SHA-1 from EAS/Play Console)
// 2. Rebuild the dev client / APK after adding the plugin in app.json:
//      npx expo prebuild --clean ; npx eas build -p android --profile preview
export const GOOGLE_WEB_CLIENT_ID =
  '107288328013-dpl55ntjp3almhl1rb65nflg59mtjfac.apps.googleusercontent.com';

export const isGoogleConfigured = () =>
  GOOGLE_WEB_CLIENT_ID &&
  !GOOGLE_WEB_CLIENT_ID.startsWith('PASTE_YOUR_');