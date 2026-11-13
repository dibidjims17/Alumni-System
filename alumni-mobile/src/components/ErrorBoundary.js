// src/components/ErrorBoundary.js
// Crash guard: catches render-time errors so a broken screen shows a
// friendly themed fallback with a Retry instead of a red/blank screen.
//
// Structure: the catching part must be a class (getDerivedStateFromError /
// componentDidCatch have no hook equivalent), while a functional wrapper
// supplies the themed fallback — a class can't call useTheme itself.
// Mounted inside ThemeProvider in App.js so the fallback matches light/dark.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

class ErrorBoundaryCore extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep a console trace for debugging; the fallback stays generic and
    // never renders raw error details to the user.
    console.warn('UI error:', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return this.props.renderError(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

export default function ErrorBoundary({ children }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <ErrorBoundaryCore
      renderError={(_error, reset) => (
        <View style={[styles.wrap, { backgroundColor: c.background }]}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.title, { color: c.text }]}>Something went wrong</Text>
            <Text style={[styles.message, { color: c.textMuted }]}>
              This screen hit an unexpected error. Try again, or restart the
              app if it keeps happening.
            </Text>
            <TouchableOpacity
              style={[styles.retry, { backgroundColor: c.primary }]}
              onPress={reset}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Try again"
            >
              <Text style={[styles.retryText, { color: c.onPrimary }]}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    >
      {children}
    </ErrorBoundaryCore>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 14, // portal card radius
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 16.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  retry: {
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 10, // portal button radius
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
