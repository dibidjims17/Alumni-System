// src/components/DiscardDialog.js
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import PrimaryButton from './ui/PrimaryButton';

// Themed replacement for the native "discard changes" alert.
// Rendered by edit screens via useUnsavedChangesGuard's discardDialog props.
export default function DiscardDialog({ visible, onKeep, onDiscard }) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onKeep}>
      <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onKeep} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: c.surface }]}>
          <View style={styles.titleRow}>
            <TriangleAlert size={22} color={c.danger} />
            <Text style={[styles.title, { color: c.text }]}>Discard changes?</Text>
          </View>
          <Text style={[styles.message, { color: c.textMuted }]}>
            You have unsaved changes. Are you sure you want to leave without saving?
          </Text>
          <PrimaryButton title="Keep Editing" onPress={onKeep} style={{ marginTop: 16 }} />
          <TouchableOpacity
            style={[styles.discardButton, { borderColor: c.border }]}
            onPress={onDiscard}
          >
            <Text style={[styles.discardText, { color: c.danger }]}>Discard</Text>
          </TouchableOpacity>
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
  discardButton: {
    marginTop: 10,
    padding: 13,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  discardText: { fontSize: 15, fontWeight: '600' },
});
