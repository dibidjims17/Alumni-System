// src/components/AppAlert.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Info, TriangleAlert, CircleCheck } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from './ui/PrimaryButton';

// Drop-in themed replacement for React Native's Alert.alert.
// Same call signature: alert(title, message, buttons?)
// buttons: [{ text, style: 'default' | 'cancel' | 'destructive', onPress }]
const listeners = new Set();

function normalizeButtons(buttons) {
  if (!buttons || buttons.length === 0) return [{ text: 'OK', style: 'default' }];
  return buttons.map((b) => ({
    text: b.text,
    style: b.style || 'default',
    onPress: b.onPress,
  }));
}

export function alert(title, message, buttons) {
  const request = { title, message, buttons: normalizeButtons(buttons) };
  listeners.forEach((cb) => cb(request));
}

function kindOf(title, buttons) {
  if (buttons.some((b) => b.style === 'destructive')) return 'danger';
  if (/^(success|saved|uploaded)$/i.test((title || '').trim())) return 'success';
  return 'info';
}

export function AppAlertHost() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    const cb = (req) => setQueue((q) => [...q, req]);
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const current = queue[0];

  function dismissWith(button) {
    setQueue((q) => q.slice(1));
    if (button && button.onPress) button.onPress();
  }

  function dismissSilent() {
    setQueue((q) => q.slice(1));
  }

  if (!current) return null;

  const kind = kindOf(current.title, current.buttons);
  const Icon = kind === 'danger' ? TriangleAlert : kind === 'success' ? CircleCheck : Info;
  const iconColor = kind === 'danger' ? c.danger : kind === 'success' ? c.success : c.primary;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={dismissSilent}>
      <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <TouchableOpacity style={styles.backdropTouch} onPress={dismissSilent} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: c.surface }]}>
          <View style={styles.titleRow}>
            <Icon size={22} color={iconColor} />
            <Text style={[styles.title, { color: c.text }]}>{current.title}</Text>
          </View>
          {!!current.message && (
            <Text style={[styles.message, { color: c.textMuted }]}>{current.message}</Text>
          )}
          <View style={styles.buttons}>
            {current.buttons.map((button, index) => {
              if (button.style === 'cancel') {
                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.cancelButton}
                    onPress={() => dismissWith(button)}
                  >
                    <Text style={[styles.cancelText, { color: c.textMuted }]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              }
              if (button.style === 'destructive') {
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.dangerButton, { borderColor: c.border }]}
                    onPress={() => dismissWith(button)}
                  >
                    <Text style={[styles.dangerText, { color: c.danger }]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              }
              return (
                <PrimaryButton
                  key={index}
                  title={button.text}
                  onPress={() => dismissWith(button)}
                />
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 20 },
  buttons: { marginTop: 16, gap: 10 },
  cancelButton: {
    padding: 13,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
  dangerButton: {
    padding: 13,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dangerText: { fontSize: 15, fontWeight: '600' },
});
