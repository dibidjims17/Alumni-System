// src/screens/NewsDetailScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function CommentRow({ comment, level, onReply, onLike, onEdit, onDelete, currentStudentId }) {
  return (
    <View style={level === 0 ? styles.topCommentRow : styles.replyRow}>
      <Text style={styles.commentAuthor}>{comment.studentName}</Text>
      <Text style={styles.commentText}>{comment.comment}</Text>
      <View style={styles.commentActions}>
        <TouchableOpacity onPress={() => onLike(comment.id)}>
          <Text style={styles.actionText}>
            {comment.isLiked ? '[Liked]' : '[Like]'} {comment.likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onReply(comment, level)}>
          <Text style={styles.actionText}>Reply</Text>
        </TouchableOpacity>
        {comment.studentId === currentStudentId && (
          <>
            <TouchableOpacity onPress={() => onEdit(comment)}>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(comment.id)}>
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

export default function NewsDetailScreen({ route }) {
  const { newsId } = route.params;
  const { student } = useAuth();
  const [news, setNews] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  // replyTarget: { anchorId, mentionedStudentId, mentionedStudentName }
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchDetail() {
    try {
      const res = await apiClient.get(`/News/${newsId}`);
      setNews(res.data);
    } catch (err) {
      Alert.alert('Error', 'Could not load this post.');
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
      Alert.alert('Error', 'Could not update heart.');
    }
  }

  async function handleLikeComment(commentId) {
    try {
      await apiClient.post(`/News/${newsId}/comments/${commentId}/like`);
      fetchDetail();
    } catch (err) {
      Alert.alert('Error', 'Could not update like.');
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
    Alert.alert('Delete comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/News/comments/${commentId}`);
            fetchDetail();
          } catch (err) {
            Alert.alert('Error', 'Could not delete comment.');
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
      Alert.alert('Error', 'Could not post comment.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading || !news) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.title}>{news.title}</Text>
        <Text style={styles.meta}>
          {news.postedByAdminName} - {new Date(news.postedAt).toLocaleDateString()}
        </Text>
        <Text style={styles.content}>{news.content}</Text>

        <TouchableOpacity style={styles.heartRow} onPress={handleHeart}>
          <Text style={styles.heartText}>
            {news.isHearted ? '[Hearted]' : '[Heart]'} {news.heartCount}
          </Text>
        </TouchableOpacity>

        <Text style={styles.commentsHeader}>Comments</Text>
        {(news.comments || []).map((comment) => (
          <View key={comment.id} style={styles.threadBlock}>
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
              <View style={styles.replyGroup}>
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
                      <View style={styles.replyGroup}>
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
          <Text style={styles.emptyText}>No comments yet.</Text>
        )}
      </ScrollView>

      <View style={styles.composer}>
        {(replyTarget || editingComment) && (
          <View style={styles.composerBanner}>
            <Text style={styles.composerBannerText}>
              {editingComment
                ? 'Editing comment'
                : `Replying to ${replyTarget.mentionedStudentName}`}
            </Text>
            <TouchableOpacity onPress={cancelComposer}>
              <Text style={styles.composerBannerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.composerRow}>
          <TextInput
            style={styles.composerInput}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSubmitComment}
            disabled={isSubmitting || !commentText.trim()}
          >
            <Text style={styles.buttonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, marginBottom: 4 },
  meta: { fontSize: 12, marginBottom: 12 },
  content: { fontSize: 14, marginBottom: 16 },
  heartRow: { marginBottom: 20 },
  heartText: { fontSize: 14 },
  commentsHeader: { fontSize: 15, marginBottom: 10 },

  threadBlock: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  topCommentRow: {
    marginBottom: 4,
  },
  replyGroup: {
    marginLeft: 16,
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#ccc',
  },
  replyRow: {
    marginBottom: 10,
  },

  commentAuthor: { fontSize: 13, fontWeight: '600' },
  commentText: { fontSize: 13, marginTop: 2 },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  actionText: { fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 20 },
  composer: {
    borderTopWidth: 1,
    padding: 10,
  },
  composerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  composerBannerText: { fontSize: 12 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end' },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    padding: 10,
  },
  buttonText: { fontSize: 14 },
});