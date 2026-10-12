// src/auth/google.js
// Isolated Google Sign-In wrapper so LoginScreen stays clean and the app
// shows a helpful message when the native module / client id isn't ready
// (Expo Go, missing placeholder, cancelled flow).
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GOOGLE_WEB_CLIENT_ID, isGoogleConfigured } from '../config';

let GoogleSignin = null;
let statusCodes = null;
let loadError = null;
try {
  // eslint-disable-next-line global-require
  const lib = require('@react-native-google-signin/google-signin');
  GoogleSignin = lib.GoogleSignin;
  statusCodes = lib.statusCodes;
} catch (e) {
  GoogleSignin = null;
  loadError = e;
}

export function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

let configured = false;
function ensureConfigured() {
  // Check the client ID first so a fresh clone gets the actionable
  // "paste your ID" message instead of a misleading native-module error.
  if (!isGoogleConfigured()) {
    throw new Error(
      'Google Sign-In is not configured yet. Paste your Web client ID into mobile src/config.js GOOGLE_WEB_CLIENT_ID (and backend appsettings Google:ClientId).'
    );
  }
  if (!GoogleSignin) {
    if (isExpoGo()) {
      throw new Error(
        'You are running in Expo Go, which cannot load the native Google module. Rebuild + run the dev client: npx expo run:android (or EAS dev build), then npx expo start --dev-client.'
      );
    }
    throw new Error(
      'Native Google module failed to load. Rebuild the dev client (npx expo prebuild --clean, then npx expo run:android) and start with npx expo start --dev-client.'
    );
  }
  if (!configured) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
    configured = true;
  }
}

export async function signInWithGoogle() {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const userInfo = await GoogleSignin.signIn();
  // v12+: idToken lives on userInfo.data.idToken (older: userInfo.idToken)
  const idToken =
    userInfo?.data?.idToken || userInfo?.idToken || userInfo?.data?.idToken;
  if (!idToken) {
    throw new Error('Google did not return an ID token. Please try again.');
  }
  return idToken;
}

export function isGoogleCancelled(err) {
  if (!err || !statusCodes) return false;
  return (
    err.code === statusCodes.SIGN_IN_CANCELLED ||
    err.code === statusCodes.IN_PROGRESS
  );
}

export function isGoogleAvailable() {
  // Web (expo web) uses the same JS lib via GIS; native needs the module.
  if (Platform.OS === 'web') return isGoogleConfigured();
  return GoogleSignin != null && isGoogleConfigured();
}

export function googleSetupMessage() {
  if (!isGoogleConfigured())
    return 'Add your Google Web client ID in mobile src/config.js to enable this button.';
  if (!GoogleSignin && Platform.OS !== 'web')
    return isExpoGo()
      ? 'Expo Go cannot do Google sign-in — run the dev client instead (npx expo start --dev-client).'
      : 'Google native module missing — rebuild the dev client (npx expo run:android).';
  return null;
}
