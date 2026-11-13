// App.js
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/theme/ThemeContext';
import { AppAlertHost } from './src/components/AppAlert';
import ErrorBoundary from './src/components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import { setupNotificationHandler } from './src/notifications/push';

setupNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppAlertHost />
        <AuthProvider>
          {/* Crash guard around the whole app tree — must stay inside
              ThemeProvider so the fallback can use theme colors. */}
          <ErrorBoundary>
            <AppNavigator />
          </ErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}