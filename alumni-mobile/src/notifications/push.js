// src/notifications/push.js
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiClient from '../api/client';

let currentPushToken = null;

// Called once at app start so notifications appear while the app is foregrounded.
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function obtainExpoPushToken() {
  try {
    if (Platform.OS === 'android') {
      // A channel must exist before the Android 13+ permission prompt will show.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[push] existing permission status:', existingStatus);
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[push] requested permission status:', finalStatus);
    }
    if (finalStatus !== 'granted') {
      console.log('[push] permission not granted, skipping registration');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    console.log('[push] projectId found:', !!projectId);
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[push] expo push token obtained:', token ? `${token.slice(0, 24)}...` : null);
    return token;
  } catch (err) {
    console.log('[push] token fetch failed:', err?.message || err);
    return null;
  }
}

// Fetches this device's Expo token and stores it on the backend for the
// logged-in student. Returns null if permissions were denied.
export async function registerDevicePushToken() {
  const token = await obtainExpoPushToken();
  if (!token) return null;
  try {
    await apiClient.put('/Notification/push-token', { token, platform: Platform.OS });
    console.log('[push] token registered on backend');
    currentPushToken = token;
  } catch (err) {
    console.log('[push] backend registration failed:', err?.response?.status, err?.message);
  }
  return token;
}

export async function unregisterDevicePushToken() {
  const token = currentPushToken;
  currentPushToken = null;
  if (!token) return;
  try {
    await apiClient.post('/Notification/push-token/unregister', { token });
  } catch (err) {
    // ignore — clearing a token that no longer exists is fine
  }
}
