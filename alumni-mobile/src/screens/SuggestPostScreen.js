// Suggest a Post — endorse a business, look for clients, or share a
// community announcement. Anyone signed in can submit; an admin reviews
// it before it appears in the Community feed. This screen doubles as
// "My suggestions": every submission keeps its Pending/Approved/Rejected
// status, the admin's note, and a link to the published post.
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { Megaphone, ChevronRight } from 'lucide-react-native';
import apiClient from '../api/client';
import { useTheme } from '../theme/ThemeContext';
import AppHeader from '../components/AppHeader';
import AppBackground from '../components/AppBackground';
import PrimaryButton from '../components/ui/PrimaryButton';
import UploadPickerCard from '../components/ui/UploadPickerCard';
import Skeleton from '../components/ui/Skeleton';
import { alert as appAlert } from '../components/AppAlert';

const MAX_TITLE = 120;
const MAX_CONTENT = 3000;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function SuggestPostScreen({ navigation }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      apiClient
        .get('/NewsSuggestion/my?page=1')
        .then((res) => {
          if (!cancelled) setItems(res.data?.items || []);
        })
        .catch(() => {
          // Leave the previous list in place on a transient failure.
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function pickImage() {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'image/*',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    const looksLikeImage =
      file.mimeType?.startsWith('image/') ||
      /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name || '');

    if (!looksLikeImage) {
      appAlert('Invalid file', 'Please choose an image file.');
      return;
    }
    if (file.size && file.size > MAX_SIZE_BYTES) {
      appAlert('File too large', 'Images must be 5MB or smaller.');
      return;
    }
    setImage(file);
  }

  async function submit() {
    if (!title.trim()) {
      appAlert('Missing title', 'Give your post a short title.');
      return;
    }
    if (!content.trim()) {
      appAlert('Missing content', 'Write the post you want to share.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('content', content.trim());
      if (image) {
        formData.append('image', {
          uri: image.uri,
          name: image.name || 'photo.jpg',
          type: image.mimeType || 'image/jpeg',
        });
      }

      const res = await apiClient.uploadForm('/NewsSuggestion', formData);

      setTitle('');
      setContent('');
      setImage(null);
      const list = await apiClient.get('/NewsSuggestion/my?page=1');
      setItems(list.data?.items || []);
      appAlert('Submitted', res.data?.message || 'Your post was sent for review.');
    } catch (err) {
      const message = err.response?.data?.message || 'Could not submit your post.';
      appAlert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function statusTone(status) {
    if (status === 'Approved') return { bg: c.tintSuccess || c.tintPrimary, fg: c.success || c.primary, label: 'Approved' };
    if (status === 'Rejected') return { bg: c.tintDanger, fg: c.danger, label: 'Rejected' };
    return { bg: c.tintWarning || c.tintGold || c.surfaceAlt, fg: c.gold, label: 'Pending' };
  }

  function openPost(item) {
    if (item.newsId) navigation.navigate('NewsDetail', { id: item.newsId });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'left', 'right']}>
      <AppBackground />
      <AppHeader title="Suggest a Post" navigation={navigation} showBack />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Intro — sets expectations: this is not instant posting. */}
        <View style={[styles.intro, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Megaphone size={20} color={c.gold} />
          <Text style={[styles.introText, { color: c.text }]}>
            Promote your business, offer your services, or look for clients.
            An admin reviews every post first — once approved it appears in
            the Community feed for everyone to see.
          </Text>
        </View>

        {/* Compose */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>New post</Text>

          <Text style={[styles.label, { color: c.textMuted }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Jan's Home Bakery — now accepting orders"
            placeholderTextColor={c.textMuted}
            maxLength={MAX_TITLE}
          />
          <Text style={[styles.counter, { color: c.textMuted }]}>
            {title.length}/{MAX_TITLE}
          </Text>

          <Text style={[styles.label, { color: c.textMuted }]}>Post</Text>
          <TextInput
            style={[styles.input, styles.multiline, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
            value={content}
            onChangeText={setContent}
            placeholder="What do you offer? Who are you looking for? How can people reach you?"
            placeholderTextColor={c.textMuted}
            multiline
            textAlignVertical="top"
            maxLength={MAX_CONTENT}
          />
          <Text style={[styles.counter, { color: c.textMuted }]}>
            {content.length}/{MAX_CONTENT}
          </Text>

          {/* Optional photo */}
          <UploadPickerCard
            label="Photo"
            variant="image"
            fileName={image?.name || ''}
            previewUri={image?.uri}
            selected={!!image}
            statusText={image ? 'Selected for this post' : 'Optional attachment'}
            emptyText="Add a photo (optional)"
            chooseText="Tap to choose an image"
            replaceText="Tap to replace image"
            helperText="JPG, PNG, WEBP, GIF or BMP; max 5 MB"
            busy={isSubmitting && !!image}
            disabled={isSubmitting}
            onPress={pickImage}
            onRemove={image ? () => setImage(null) : undefined}
          />

          <PrimaryButton
            title={isSubmitting ? 'Submitting…' : 'Submit for review'}
            onPress={submit}
            disabled={isSubmitting}
            style={styles.submitButton}
          />
        </View>

        {/* My suggestions */}
        <Text style={[styles.sectionTitle, { color: c.text }]}>My suggestions</Text>
        {isLoading ? (
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            {[0, 1].map((i) => (
              <Skeleton key={i} width="100%" height={54} style={{ marginBottom: 10 }} />
            ))}
          </View>
        ) : items.length === 0 ? (
          <Text style={[styles.empty, { color: c.textMuted }]}>
            Nothing yet — your submissions and their status will show up here.
          </Text>
        ) : (
          items.map((item) => {
            const tone = statusTone(item.status);
            return (
              <TouchableOpacity
                key={String(item.id)}
                style={[styles.suggestionRow, { backgroundColor: c.surface, borderColor: c.border }]}
                onPress={() => openPost(item)}
                disabled={!item.newsId}
                activeOpacity={item.newsId ? 0.7 : 1}
              >
                <View style={styles.suggestionHead}>
                  <Text style={[styles.suggestionTitle, { color: c.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={[styles.chip, { backgroundColor: tone.bg }]}>
                    <Text style={[styles.chipText, { color: tone.fg }]}>{tone.label}</Text>
                  </View>
                </View>
                <Text style={[styles.suggestionMeta, { color: c.textMuted }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                  {item.status === 'Approved' && item.newsId ? ' · Live in Community' : ''}
                </Text>
                {item.status === 'Rejected' && item.reviewNote ? (
                  <Text style={[styles.note, { color: c.danger }]}>
                    Admin note: {item.reviewNote}
                  </Text>
                ) : null}
                {item.status === 'Approved' && item.newsId ? (
                  <View style={styles.viewPost}>
                    <Text style={{ color: c.primary, fontWeight: '700', fontSize: 13 }}>View post</Text>
                    <ChevronRight size={16} color={c.primary} />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  intro: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  introText: { flex: 1, fontSize: 13.5, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 12.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 140 },
  counter: { fontSize: 11, textAlign: 'right', marginTop: 4, marginBottom: 8 },
  submitButton: { marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  empty: { fontSize: 13.5, lineHeight: 20 },
  suggestionRow: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 6 },
  suggestionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  suggestionTitle: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  suggestionMeta: { fontSize: 12 },
  note: { fontSize: 12.5, lineHeight: 18 },
  viewPost: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
});
