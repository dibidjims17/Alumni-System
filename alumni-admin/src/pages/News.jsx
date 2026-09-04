import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Heart, MessageCircle, MessageSquare } from "lucide-react";
import { getNews, createNews, updateNews, deleteNews } from "../services/newsApi";
import ConfirmDialog from "../components/ConfirmDialog";
import { cardGrid, card, cardTitle, cardMeta, SearchBox, useDirtyGuard, iconButton, ModalShell, Field, textInput, btn, btnPrimary } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError } from "../components/toastBus";

const EditButton = iconButton("Edit", Pencil);
const DeleteButton = iconButton("Delete", Trash2);

const emptyForm = { title: "", content: "", isPublished: true, imageFile: null };

export default function News() {
  const navigate = useNavigate();
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

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
      notifyError(err.message);
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
      notifyError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      await deleteNews(confirmDeleteId);
      loadNews(searchTerm);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setConfirmDeleteId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>News</h2>
        <button onClick={openCreateModal} style={btnPrimary}>
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
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <GridSkeleton count={6} />
      ) : newsList.length === 0 ? (
        <p>No news yet.</p>
      ) : (
        <div style={cardGrid}>
          {newsList.map((item) => {
            return (
              <div
                key={item.id}
                style={{ ...card, cursor: "pointer" }}
                onClick={() => navigate(`/news/${item.id}`)}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <h3 style={cardTitle}>{item.title}</h3>
                    <p style={cardMeta}>
                      Posted by {item.postedByAdminName} • {new Date(item.postedAt).toLocaleString()}
                    </p>
                    <p style={{ ...cardMeta, display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Heart size={14} color="#d64550" />
                        {item.heartCount}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <MessageCircle size={14} color="#4574b8" />
                        {item.commentCount}
                      </span>
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: 12,
                    marginTop: 8,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
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
                    style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                  />
                  <span
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#4574b8",
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    <MessageSquare size={13} />
                    {`View post${item.commentCount ? ` (${item.commentCount} comments)` : ""}`}
                  </span>
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
              <button type="submit" disabled={saving} style={btnPrimary}>
                {saving ? "Saving..." : editingId ? "Update Post" : "Create Post"}
              </button>
              <button type="button" onClick={closeModalGuarded} style={btn}>
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
