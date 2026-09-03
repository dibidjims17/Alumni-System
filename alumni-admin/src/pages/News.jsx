import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Heart, MessageCircle, MessageSquare } from "lucide-react";
import { getNews, createNews, updateNews, deleteNews, getNewsDetail, deleteCommentAsAdmin } from "../services/newsApi";
import ConfirmDialog from "../components/ConfirmDialog";
import { cardGrid, card, cardTitle, cardMeta, actionsRow, SearchBox, useDirtyGuard, iconButton } from "../components/kit";

const EditButton = iconButton("Edit", Pencil);
const DeleteButton = iconButton("Delete", Trash2);

const emptyForm = { title: "", content: "", isPublished: true, imageFile: null };

export default function News() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [expandedId, setExpandedId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const { setDirty, withGuard } = useDirtyGuard();
  const pristineRef = useRef("");

  async function loadNews(activeSearch = "") {
    setLoading(true);
    setError("");
    try {
      const data = await getNews(activeSearch);
      setNewsList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
  }, []);

  function submitSearch(e) {
    e?.preventDefault?.();
    loadNews(searchTerm);
  }

  function resetSearch() {
    setSearchTerm("");
    loadNews("");
  }

  function updateField(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    setDirty(JSON.stringify(next) !== pristineRef.current);
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    pristineRef.current = JSON.stringify(emptyForm);
    setDirty(false);
    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    const next = {
      title: item.title,
      content: item.content,
      isPublished: item.isPublished,
      imageFile: null,
    };
    setForm(next);
    pristineRef.current = JSON.stringify(next);
    setDirty(false);
    setShowModal(true);
  }

  const closeModalGuarded = () => withGuard(closeModal);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateNews(editingId, form);
      } else {
        await createNews(form);
      }
      setDirty(false);
      closeModal();
      loadNews(searchTerm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      await deleteNews(confirmDeleteId);
      loadNews(searchTerm);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function toggleComments(newsId) {
    if (expandedId === newsId) {
      setExpandedId(null);
      setComments([]);
      return;
    }
    setExpandedId(newsId);
    setCommentsLoading(true);
    try {
      const detail = await getNewsDetail(newsId);
      setComments(detail.comments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handleDeleteComment(commentId, newsId) {
    try {
      await deleteCommentAsAdmin(commentId);
      const detail = await getNewsDetail(newsId);
      setComments(detail.comments || []);
      loadNews(searchTerm);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>News</h2>
        <button onClick={openCreateModal} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={15} />
          Add News
        </button>
      </div>

      <form onSubmit={submitSearch} style={{ margin: "16px 0", display: "flex", gap: 8, alignItems: "center" }}>
        <SearchBox
          placeholder="Search title or content"
          value={searchTerm}
          onChange={setSearchTerm}
          onSubmit={submitSearch}
          onReset={resetSearch}
        />
        <button type="submit">Search</button>
        {searchTerm.trim() !== "" && (
          <button type="button" onClick={resetSearch}>Reset</button>
        )}
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading news...</p>
      ) : newsList.length === 0 ? (
        <p>No news yet.</p>
      ) : (
        <div style={cardGrid}>
          {newsList.map((item) => (
            <div key={item.id} style={card}>
              <h3 style={cardTitle}>{item.title}</h3>
              <p style={cardMeta}>
                Posted by {item.postedByAdminName} • {new Date(item.postedAt).toLocaleString()}
              </p>
              <p style={{ ...cardMeta, display: "flex", alignItems: "center", gap: 16, marginTop: 2 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <Heart size={14} color="#d64550" />
                  {item.heartCount}
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <MessageCircle size={14} color="#4574b8" />
                  {item.commentCount}
                </span>
              </p>
              <div style={actionsRow}>
                <EditButton onClick={() => openEditModal(item)} />
                <DeleteButton
                  onClick={() => setConfirmDeleteId(item.id)}
                  extra={{ color: "#c0392b", borderColor: "#e0b4b4" }}
                />
                <button
                  type="button"
                  onClick={() => toggleComments(item.id)}
                  title={expandedId === item.id ? "Hide Comments" : "View Comments"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    background: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <MessageSquare size={15} />
                  {expandedId === item.id ? "Hide Comments" : "View Comments"}
                </button>
              </div>
              {expandedId === item.id && (
                <div style={{ borderTop: "1px solid #eee", marginTop: 6, paddingTop: 10 }}>
                  {commentsLoading ? (
                    <p>Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <p>No comments yet.</p>
                  ) : (
                    <ul style={{ paddingLeft: 16 }}>
                      {comments.map((c) => (
                        <li key={c.id} style={{ marginBottom: 10 }}>
                          <strong>{c.studentName}</strong>: {c.comment}{" "}
                          <span style={{ fontSize: 12, color: "#666" }}>
                            ({new Date(c.commentedAt).toLocaleString()}, {c.likeCount} likes)
                          </span>{" "}
                          <button onClick={() => handleDeleteComment(c.id, item.id)}>Delete</button>
                          {c.replies?.length > 0 && (
                            <ul style={{ paddingLeft: 20, marginTop: 6 }}>
                              {c.replies.map((r) => (
                                <li key={r.id} style={{ marginBottom: 6 }}>
                                  <strong>{r.studentName}</strong>: {r.comment}{" "}
                                  <span style={{ fontSize: 12, color: "#666" }}>
                                    ({new Date(r.commentedAt).toLocaleString()}, {r.likeCount} likes)
                                  </span>{" "}
                                  <button onClick={() => handleDeleteComment(r.id, item.id)}>Delete</button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={closeModalGuarded}
        >
          <div
            style={{
              background: "#fff", padding: 24, borderRadius: 8,
              maxWidth: 500, width: "90%", maxHeight: "85vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Post" : "Create New Post"}</h3>
              <button onClick={closeModalGuarded}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
              <div>
                <label>Title</label><br />
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField({ title: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Content</label><br />
                <textarea
                  value={form.content}
                  onChange={(e) => updateField({ content: e.target.value })}
                  required
                  rows={5}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => updateField({ isPublished: e.target.checked })}
                  />{" "}
                  Published
                </label>
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Image {editingId ? "(leave blank to keep current)" : "(optional)"}</label><br />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => updateField({ imageFile: e.target.files[0] || null })}
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Post" : "Create Post"}
                </button>
                <button type="button" onClick={closeModalGuarded} style={{ marginLeft: 8 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        message={confirmDeleteId ? "Move this news post to trash?" : null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
