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
  if (Platform.OS === 'android') {
    // A channel must exist before the Android 13+ permission prompt will show.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

// Fetches this device's Expo token and stores it on the backend for the
// logged-in student. Returns null if permissions were denied.
export async function registerDevicePushToken() {
  try {
    const token = await obtainExpoPushToken();
    if (!token) return null;
    try {
      await apiClient.put('/Notification/push-token', { token, platform: Platform.OS });
      currentPushToken = token;
    } catch (err) {
      // Backend unreachable — app still works, push just won't register now.
    }
    return token;
  } catch (err) {
    return null;
  }
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
