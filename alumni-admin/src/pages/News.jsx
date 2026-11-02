import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Heart, MessageCircle, MessageSquare, Newspaper } from "lucide-react";
import { getNews, createNews, updateNews, deleteNews } from "../services/newsApi";
import { cardGrid, card, cardTitle, cardMeta, pill, statusTone, SearchBox, useDirtyGuard, iconButton, ModalShell, Field, textInput, btn, btnPrimary, toolbar, filterRow, EmptyState, pageWrap } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";

const EditButton = iconButton("Edit", Pencil);
const DeleteButton = iconButton("Delete", Trash2);

const emptyForm = { title: "", content: "", isPublished: true, imageFile: null };

export default function News() {
  const navigate = useNavigate();
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const { setDirty, withGuard } = useDirtyGuard();
  const pristineRef = useRef("");

  async function loadNews(activeSearch = "") {
    setLoading(true);
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

  async function handleDelete(item) {
    const ok = await askConfirm(`Move "${item.title}" to trash?`, {
      confirmLabel: "Move to trash",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteNews(item.id);
      loadNews(searchTerm);
    } catch (err) {
      notifyError(err.message);
    }
  }

  return (
    <div style={pageWrap}>
      <div style={{ ...toolbar, justifyContent: "flex-end" }}>
        <button onClick={openCreateModal} style={btnPrimary}>
          <Plus size={15} />
          Add News
        </button>
      </div>

      <form onSubmit={submitSearch} style={filterRow}>
        <SearchBox
          placeholder="Search title or content"
          value={searchTerm}
          onChange={setSearchTerm}
          onSubmit={submitSearch}
          onReset={resetSearch}
        />
      </form>

      {loading ? (
        <GridSkeleton count={6} />
      ) : newsList.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No news yet"
          hint={searchTerm ? "Try a different search." : "Publish the first announcement to see it here."}
        />
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
                    <p style={{ ...cardMeta, margin: 0, fontWeight: 700, color: "var(--text)", fontSize: 13 }}>
                      Posted by {item.postedByAdminName} • {new Date(item.postedAt).toLocaleString()}
                    </p>
                    <p style={{ ...cardMeta, display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Heart size={14} color="var(--danger)" />
                        {item.heartCount}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <MessageCircle size={14} color="var(--info)" />
                        {item.commentCount}
                      </span>
                    </p>
                  </div>
                  <span style={{ ...pill, marginLeft: "auto", ...(item.isPublished ? statusTone("success") : statusTone("warning")) }}>
                    {item.isPublished ? "Published" : "Draft"}
                  </span>
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
                      handleDelete(item);
                    }}
                    style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                  />
                  <Link
                    to={`/news/${item.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      marginLeft: "auto",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--info)",
                      fontSize: 12,
                      fontWeight: 500,
                      textDecoration: "none",
                    }}
                  >
                    <MessageSquare size={13} />
                    {`View post${item.commentCount ? ` (${item.commentCount} comments)` : ""}`}
                  </Link>
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
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text)", cursor: "pointer" }}>
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

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={closeModalGuarded} style={btn}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={btnPrimary}>
                {saving ? "Saving..." : editingId ? "Update Post" : "Create Post"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
