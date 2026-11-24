import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FileImage, FileText, Upload, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

// Native counterpart to the admin drag-and-drop target. Phones do not expose
// desktop drag/drop, so the whole card is a large tap target that opens the
// system picker. It also presents the selected/current file consistently.
export default function UploadPickerCard({
  label,
  required = false,
  variant = 'document',
  fileName = '',
  previewUri,
  selected = false,
  hasExisting = false,
  statusText,
  emptyText = 'Choose a file',
  chooseText = 'Tap to choose a file',
  replaceText = 'Tap to replace',
  helperText,
  busy = false,
  disabled = false,
  onPress,
  onRemove,
  style,
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const hasFile = selected || hasExisting || !!fileName || !!previewUri;
  const isDisabled = disabled || busy;
  const FileIcon = variant === 'image' ? FileImage : FileText;
  const stateText = busy
    ? 'Uploading...'
    : statusText || (selected ? 'Selected and ready' : hasExisting ? 'Already uploaded' : helperText);

  return (
    <View style={[styles.wrapper, style]}>
      {label ? (
        <Text style={[styles.label, { color: c.text }]}>
          {label}{required ? ' *' : ''}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: selected ? c.tintSuccess : c.surfaceAlt,
            borderColor: selected ? c.success : c.border,
          },
          !hasFile && styles.emptyCard,
          isDisabled && styles.disabled,
        ]}
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.78}
        accessibilityRole="button"
        accessibilityLabel={
          busy
            ? `Uploading ${label || 'file'}`
            : hasFile
              ? `Replace ${label || 'file'}`
              : `Choose ${label || 'file'}`
        }
      >
        {busy ? (
          <View style={[styles.iconBox, { backgroundColor: c.primaryTint }]}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : previewUri ? (
          <Image
            source={{ uri: previewUri }}
            style={[styles.preview, { backgroundColor: c.surface }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.iconBox, { backgroundColor: selected ? c.tintSuccess : c.primaryTint }]}>
            <FileIcon size={25} color={selected ? c.success : c.primary} />
          </View>
        )}

        <View style={styles.details}>
          <Text
            style={[styles.fileName, { color: c.text }]}
            numberOfLines={2}
          >
            {fileName || emptyText}
          </Text>
          {stateText ? (
            <Text
              style={[
                styles.state,
                { color: selected ? c.success : c.textMuted },
              ]}
              numberOfLines={2}
            >
              {stateText}
            </Text>
          ) : null}
          {!busy ? (
            <View style={styles.actionHint}>
              <Upload size={14} color={c.primary} />
              <Text style={[styles.actionText, { color: c.primary }]}>
                {hasFile ? replaceText : chooseText}
              </Text>
            </View>
          ) : null}
        </View>

        {selected && onRemove && !busy ? (
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Remove selected ${label || 'file'}`}
          >
            <X size={16} color={c.danger} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      {helperText ? (
        <Text style={[styles.helper, { color: c.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  card: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  emptyCard: { borderStyle: 'dashed' },
  disabled: { opacity: 0.62 },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: 58, height: 58, borderRadius: 10 },
  details: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  state: { fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  actionHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  actionText: { fontSize: 12.5, fontWeight: '700' },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  helper: { fontSize: 11.5, lineHeight: 16, marginTop: 6 },
});
