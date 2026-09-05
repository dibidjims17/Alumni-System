// src/screens/NewsDetailScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Heart, Send, ChevronDown, ChevronUp } from 'lucide-react-native';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { assetUrl } from '../utils/media';
import Skeleton from '../components/ui/Skeleton';
import ImageViewer from '../components/ImageViewer';
import { useTheme } from '../theme/ThemeContext';
import { alert as appAlert } from '../components/AppAlert';

function CommentRow({ comment, level, onReply, onLike, onEdit, onDelete, currentStudentId }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[level === 0 ? styles.topCommentRow : styles.replyRow, level !== 0 && { backgroundColor: c.background }]}>
      <View style={styles.commentAuthorRow}>
        {assetUrl(comment.studentPicturePath) ? (
          <Image
            source={{ uri: assetUrl(comment.studentPicturePath) }}
            style={styles.commentAvatar}
          />
        ) : (
          <View style={[styles.commentFallback, { backgroundColor: c.surfaceAlt }]}>
            <Text style={[styles.commentFallbackText, { color: c.primary }]}>
              {(comment.studentName || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.commentAuthor, { color: c.text }]}>{comment.studentName}</Text>
      </View>
      <Text style={[styles.commentText, { color: c.text }]}>{comment.comment}</Text>
      <View style={styles.commentActions}>
        <TouchableOpacity onPress={() => onLike(comment.id)} style={styles.commentLikeBtn}>
          <Heart
            size={13}
            color={comment.isLiked ? c.heart : c.textMuted}
            fill={comment.isLiked ? c.heart : 'none'}
          />
          <Text style={[styles.actionText, { color: comment.isLiked ? c.heart : c.textMuted }]}>
            {comment.likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onReply(comment, level)}>
          <Text style={[styles.actionText, { color: c.textMuted }]}>Reply</Text>
        </TouchableOpacity>
        {comment.studentId === currentStudentId && (
          <>
            <TouchableOpacity onPress={() => onEdit(comment)}>
              <Text style={[styles.actionText, { color: c.textMuted }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(comment.id)}>
              <Text style={[styles.actionText, { color: c.textMuted }]}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

export default function NewsDetailScreen({ route, navigation }) {
  const { newsId } = route.params;
  const { student } = useAuth();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const c = theme.colors;
  const [news, setNews] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  // replyTarget: { anchorId, mentionedStudentId, mentionedStudentName }
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState({});
  const [notFound, setNotFound] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewerImage, setViewerImage] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const baseWindowHeight = useRef(Dimensions.get('window').height);

  // Android: KeyboardAvoidingView is unreliable here, so track the keyboard
  // height directly and pad the root view. Hide always resets to 0.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const winH = Dimensions.get('window').height;
      const scrH = Dimensions.get('screen').height;
      const kbH = e.endCoordinates.height;
      const kbTop = e.endCoordinates.screenY;
      console.log(`[kb] win=${winH} screen=${scrH} kbTop=${kbTop} kbH=${kbH}`);
      // If the OS already shrank the window, don't double-count it.
      const resizedBy = Math.max(0, baseWindowHeight.current - winH);
      setKeyboardHeight(Math.max(0, kbH - resizedBy));
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      baseWindowHeight.current = Dimensions.get('window').height;
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function toggleThread(commentId) {
    setExpandedThreads((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchDetail();
    setIsRefreshing(false);
  }

  async function fetchDetail() {
    try {
      setNotFound(false);
      const res = await apiClient.get(`/News/${newsId}`);
      setNews(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        appAlert('Error', 'Could not load this post.');
      }
    }
  }

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      fetchDetail().finally(() => setIsLoading(false));
    }, [newsId])
  );

  async function handleHeart() {
    try {
      await apiClient.post(`/News/${newsId}/heart`);
      fetchDetail();
    } catch (err) {
      appAlert('Error', 'Could not update heart.');
    }
  }

  async function handleLikeComment(commentId) {
    try {
      await apiClient.post(`/News/${newsId}/comments/${commentId}/like`);
      fetchDetail();
    } catch (err) {
      appAlert('Error', 'Could not update like.');
    }
  }

  // level 0 (top comment) or level 1 (first reply) -> anchor to the comment's
  // own id (creates a new child under it).
  // level 2 (second-tier reply, e.g. C or D) -> anchor to ITS parent instead,
  // so replying to C or D never creates a 3rd visual branch — it just adds
  // another same-tier reply under B, matching the Facebook-style reference.
  function handleReply(comment, level) {
    setEditingComment(null);
    const anchorId = level === 2 ? comment.parentCommentId : comment.id;
    setReplyTarget({
      anchorId,
      mentionedStudentId: comment.studentId,
      mentionedStudentName: comment.studentName,
    });
    setCommentText(`@${comment.studentName} `);
  }

  function handleEdit(comment) {
    setReplyTarget(null);
    setEditingComment({ id: comment.id });
    setCommentText(comment.comment);
  }

  function cancelComposer() {
    setReplyTarget(null);
    setEditingComment(null);
    setCommentText('');
  }

  async function handleDelete(commentId) {
    appAlert('Delete comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/News/comments/${commentId}`);
            fetchDetail();
          } catch (err) {
            appAlert('Error', 'Could not delete comment.');
          }
        },
      },
    ]);
  }

  async function handleSubmitComment() {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingComment) {
        await apiClient.put(`/News/comments/${editingComment.id}`, {
          comment: commentText.trim(),
        });
      } else {
        await apiClient.post(`/News/${newsId}/comments`, {
          comment: commentText.trim(),
          parentCommentId: replyTarget ? replyTarget.anchorId : null,
          mentionedStudentId: replyTarget ? replyTarget.mentionedStudentId : null,
        });
      }
      cancelComposer();
      fetchDetail();
    } catch (err) {
      appAlert('Error', 'Could not post comment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[c.primary]}
            tintColor={c.primary}
          />
        }
      >
        <View style={[styles.postCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Skeleton width="80%" height={20} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={180} borderRadius={8} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
          <Skeleton width="60%" height={13} />
        </View>
        {[0, 1].map((i) => (
          <View
            key={i}
            style={[styles.threadBlock, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Skeleton width="45%" height={13} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={13} style={{ marginBottom: 6 }} />
            <Skeleton width="75%" height={13} />
          </View>
        ))}
      </ScrollView>
    );
  }

  if (!news) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Text style={[styles.notFoundTitle, { color: c.text }]}>No longer available</Text>
        <Text style={[styles.notFoundText, { color: c.textMuted }]}>
          This post may have been removed by an admin.
        </Text>
        <TouchableOpacity
          style={[styles.goBackButton, { borderColor: c.border }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.goBackText, { color: c.primary }]}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderContent() {
    return (
      <>
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.postCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.title, { color: c.text }]}>{news.title}</Text>
          <View style={styles.byline}>
            {assetUrl(news.postedByAdminPicture) ? (
              <Image
                source={{ uri: assetUrl(news.postedByAdminPicture) }}
                style={styles.bylineAvatar}
              />
            ) : (
              <View style={[styles.bylineFallback, { backgroundColor: c.surfaceAlt }]}>
                <Text style={[styles.bylineFallbackText, { color: c.primary }]}>
                  {(news.postedByAdminName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.meta, { color: c.textMuted }]}>
              {news.postedByAdminName} - {new Date(news.postedAt).toLocaleDateString()}
            </Text>
          </View>
          {assetUrl(news.imagePath) && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setViewerImage(assetUrl(news.imagePath))}
            >
              <Image
                source={{ uri: assetUrl(news.imagePath) }}
                style={[styles.image, { backgroundColor: c.surfaceAlt }]}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          <Text style={[styles.content, { color: c.text }]}>{news.content}</Text>

          <TouchableOpacity
            style={[styles.heartRow, { backgroundColor: c.background }]}
            onPress={handleHeart}
          >
            <Heart
              size={20}
              color={news.isHearted ? c.heart : c.textMuted}
              fill={news.isHearted ? c.heart : 'none'}
            />
            <Text style={[styles.heartText, { color: news.isHearted ? c.heart : c.textMuted }]}>
              {news.heartCount}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.commentsHeader, { color: c.text }]}>Comments</Text>
        {(news.comments || []).map((comment) => (
          <View
            key={comment.id}
            style={[styles.threadBlock, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <CommentRow
              comment={comment}
              level={0}
              onReply={handleReply}
              onLike={handleLikeComment}
              onEdit={handleEdit}
              onDelete={handleDelete}
              currentStudentId={student?.id}
            />
            {(comment.replies || []).length > 0 && (
              <TouchableOpacity
                style={styles.repliesToggle}
                onPress={() => toggleThread(comment.id)}
              >
                {expandedThreads[comment.id] ? (
                  <ChevronUp size={14} color={c.primary} />
                ) : (
                  <ChevronDown size={14} color={c.primary} />
                )}
                <Text style={[styles.repliesToggleText, { color: c.primary }]}>
                  {expandedThreads[comment.id]
                    ? 'Hide replies'
                    : `View ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
                </Text>
              </TouchableOpacity>
            )}
            {expandedThreads[comment.id] && (comment.replies || []).length > 0 && (
              <View style={[styles.replyGroup, { borderLeftColor: c.border }]}>
                {comment.replies.map((reply) => (
                  <View key={reply.id}>
                    <CommentRow
                      comment={reply}
                      level={1}
                      onReply={handleReply}
                      onLike={handleLikeComment}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      currentStudentId={student?.id}
                    />
                    {(reply.replies || []).length > 0 && (
                      <View style={[styles.replyGroup, { borderLeftColor: c.border }]}>
                        {reply.replies.map((subReply) => (
                          <CommentRow
                            key={subReply.id}
                            comment={subReply}
                            level={2}
                            onReply={handleReply}
                            onLike={handleLikeComment}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            currentStudentId={student?.id}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        {(!news.comments || news.comments.length === 0) && (
          <Text style={[styles.emptyText, { color: c.textMuted }]}>No comments yet.</Text>
        )}
      </ScrollView>

      <View style={[styles.composer, { backgroundColor: c.surface, borderColor: c.border }]}>
        {(replyTarget || editingComment) && (
          <View style={[styles.composerBanner, { backgroundColor: c.primaryTint }]}>
            <Text style={[styles.composerBannerText, { color: c.primary }]}>
              {editingComment
                ? 'Editing comment'
                : `Replying to ${replyTarget.mentionedStudentName}`}
            </Text>
            <TouchableOpacity onPress={cancelComposer}>
              <Text style={[styles.composerBannerCancel, { color: c.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerRow}>
          <TextInput
            style={[
              styles.composerInput,
              { borderColor: c.border, backgroundColor: c.background, color: c.text },
            ]}
            placeholder="Write a comment..."
            placeholderTextColor={c.placeholder}
            value={commentText}
            onChangeText={setCommentText}
            onSubmitEditing={handleSubmitComment}
            returnKeyType="send"
            blurOnSubmit={false}
            editable={!isSubmitting}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: c.primary },
              (!commentText.trim() || isSubmitting) && {
                backgroundColor: c.primaryTint,
              },
            ]}
            onPress={handleSubmitComment}
            disabled={isSubmitting || !commentText.trim()}
            accessibilityLabel="Send comment"
          >
            <Send size={18} color={c.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>
      <ImageViewer imageUrl={viewerImage} onClose={() => setViewerImage(null)} />
      </>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        {renderContent()}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notFoundTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  notFoundText: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  goBackButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
  },
  goBackText: { fontSize: 14, fontWeight: '600' },
  postCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  meta: { fontSize: 12 },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  bylineAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  bylineFallback: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bylineFallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  image: {
    width: '100%',
    height: 200,
    marginBottom: 12,
    borderRadius: 8,
  },
  content: { fontSize: 14, lineHeight: 21 },
  heartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  heartText: { fontSize: 13, marginLeft: 6 },
  commentsHeader: { fontSize: 15, fontWeight: '600', marginBottom: 10 },

  threadBlock: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
  },
  topCommentRow: {
    marginBottom: 4,
  },
  replyGroup: {
    marginLeft: 4,
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
  },
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
    paddingRight: 8,
  },
  repliesToggleText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  replyRow: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },

  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  commentFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentFallbackText: {
    fontSize: 11,
    fontWeight: '700',
  },
  commentAuthor: { fontSize: 13, fontWeight: '600' },
  commentText: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  actionText: { fontSize: 12, marginLeft: 3 },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 20 },
  composer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  composerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  composerBannerText: { fontSize: 12 },
  composerBannerCancel: { fontSize: 12, fontWeight: '600' },
  composerRow: { flexDirection: 'row', alignItems: 'center' },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});