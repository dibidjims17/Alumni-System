// src/components/KebabMenu.js
//
// Mobile counterpart of the admin's KebabMenu: one obvious primary action
// stays visible on a card/row, everything secondary (or destructive)
// collapses behind a ⋮ button.
//
// There is no gesture/bottom-sheet library in this app, so this mirrors the
// AppAlert sheet (Modal + slide-up) that the rest of the screens already use.
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { MoreVertical } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';

export default function KebabMenu({ label = 'More actions', items = [], size = 18 }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  // Filter out hidden items so a single conditional item never leaves an
  // empty menu behind (mirrors the admin component's behaviour).
  const visible = items.filter((item) => item && !item.hidden);
  if (visible.length === 0) return null;

  function run(item) {
    close();
    // Let the sheet unmount before the action runs, so handlers that open
    // another dialog (confirm/edit) are not stacked behind this Modal.
    setTimeout(() => item.onPress && item.onPress(), 0);
  }

  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens a menu of additional actions"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: c.surfaceAlt }]}
      >
        <MoreVertical size={size} color={c.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={[styles.backdrop, { backgroundColor: c.overlay }]}>
          <TouchableOpacity
            style={styles.backdropTouch}
            onPress={close}
            activeOpacity={1}
            accessibilityLabel="Dismiss menu"
          />
          <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.handle, { backgroundColor: c.border }]} />
            <Text style={[styles.title, { color: c.textMuted }]} numberOfLines={1}>
              {label}
            </Text>
            {visible.map((item, index) => (
              <TouchableOpacity
                key={item.key || item.label || index}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                activeOpacity={0.7}
                onPress={() => run(item)}
                style={[
                  styles.item,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                ]}
              >
                <View style={styles.itemInner}>
                  {item.icon ? (
                    <item.icon size={17} color={item.danger ? c.danger : c.primary} />
                  ) : null}
                  <Text
                    style={[styles.itemText, { color: item.danger ? c.danger : c.text }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              activeOpacity={0.7}
              onPress={close}
              style={[styles.cancel, { backgroundColor: c.surfaceAlt }]}
            >
              <Text style={[styles.cancelText, { color: c.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  item: {
    paddingVertical: 15,
    paddingHorizontal: 12,
  },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  cancel: {
    marginTop: 10,
    marginHorizontal: 4,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
