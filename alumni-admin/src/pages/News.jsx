import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Heart, MessageCircle, MessageSquare } from "lucide-react";
import { getNews, createNews, updateNews, deleteNews, getNewsDetail, deleteCommentAsAdmin } from "../services/newsApi";
import ConfirmDialog from "../components/ConfirmDialog";
import { cardGrid, card, cardTitle, cardMeta, actionsRow, SearchBox, useDirtyGuard, iconButton, ModalShell, Field, textInput } from "../components/kit";

const EditButton = iconButton("Edit", Pencil);
const DeleteButton = iconButton("Delete", Trash2);

function CommentRow({ data, onDelete }) {
  const initial = (data.studentName || "?").charAt(0).toUpperCase();
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div
        style={{
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "#e7eefb",
          color: "#34558b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 8, alignItems: "baseline" }}>
          <strong style={{ fontSize: 13 }}>{data.studentName}</strong>
          <span style={{ fontSize: 11, color: "#888" }}>
            {new Date(data.commentedAt).toLocaleString()}
          </span>
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#333", lineHeight: 1.4, wordBreak: "break-word" }}>
          {data.comment}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "#999" }}>{data.likeCount} likes</span>
          <button
            type="button"
            onClick={() => onDelete(data.id)}
            title="Delete comment"
            aria-label="Delete comment"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              border: "1px solid #e0b4b4",
              borderRadius: 6,
              background: "#fff",
              color: "#c0392b",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

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
          {newsList.map((item) => {
            const isOpen = expandedId === item.id;
            return (
              <div
                key={item.id}
                style={{ ...card, cursor: "pointer", gap: 8 }}
                onClick={() => toggleComments(item.id)}
              >
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
                  <EditButton
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(item);
                    }}
                  />
                  <DeleteButton
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(item.id);
                    }}
                    extra={{ color: "#c0392b", borderColor: "#e0b4b4" }}
                  />
                </div>
                {isOpen && (
                  <div
                    style={{ borderTop: "1px solid #eee", marginTop: 4, paddingTop: 12 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {commentsLoading ? (
                      <p style={{ ...cardMeta, textAlign: "center", padding: "4px 0" }}>Loading comments...</p>
                    ) : comments.length === 0 ? (
                      <p style={{ ...cardMeta, textAlign: "center", padding: "4px 0" }}>No comments yet.</p>
                    ) : (
                      <div>
                        {comments.map((c) => (
                          <div key={c.id} style={{ marginBottom: 14 }}>
                            <CommentRow data={c} onDelete={(id) => handleDeleteComment(id, item.id)} />
                            {c.replies?.length > 0 && (
                              <div
                                style={{
                                  marginLeft: 20,
                                  paddingLeft: 14,
                                  borderLeft: "2px solid #eee",
                                  marginTop: 10,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 10,
                                }}
                              >
                                {c.replies.map((r) => (
                                  <CommentRow
                                    key={r.id}
                                    data={r}
                                    onDelete={(id) => handleDeleteComment(id, item.id)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginTop: 2,
                    paddingTop: 8,
                    borderTop: "1px solid #f0f0f0",
                    color: "#4574b8",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <MessageSquare size={13} />
                  {isOpen ? "Hide comments" : `View comments${item.commentCount ? ` (${item.commentCount})` : ""}`}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalShell title={editingId ? "Edit News" : "Add News"} onClose={closeModalGuarded}>
          <form onSubmit={handleSubmit}>
            <Field label="Title">
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateField({ title: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Content">
              <textarea
                value={form.content}
                onChange={(e) => updateField({ content: e.target.value })}
                required
                rows={5}
                style={{ ...textInput, minHeight: 130, resize: "vertical" }}
              />
            </Field>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#333", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={(e) => updateField({ isPublished: e.target.checked })}
                />
                Published
              </label>
            </div>

            <Field label={`Image ${editingId ? "(leave blank to keep current)" : "(optional)"}`}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => updateField({ imageFile: e.target.files[0] || null })}
              />
            </Field>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Post" : "Create Post"}
              </button>
              <button type="button" onClick={closeModalGuarded}>
                Cancel
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      <ConfirmDialog
        message={confirmDeleteId ? "Move this news post to trash?" : null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
