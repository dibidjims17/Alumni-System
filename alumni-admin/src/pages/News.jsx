import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Heart, MessageCircle, MessageSquare, Newspaper } from "lucide-react";
import { getNews, createNews, updateNews, deleteNews, newsImageUrl } from "../services/newsApi";
import { cardGrid, card, cardTitle, cardMeta, pill, statusTone, SearchBox, useDirtyGuard, ModalShell, Field, textInput, btn, btnPrimary, toolbar, filterRow, EmptyState, pageWrap } from "../components/kit";
import ImageDropZone from "../components/ImageDropZone";
import KebabMenu from "../components/KebabMenu";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";

// mode: "now" publishes on submit, "schedule" defers to publishAt.
const emptyForm = { title: "", content: "", mode: "now", publishAt: "", imageFile: null, removeImage: false };

// <input type="datetime-local"> speaks local wall time as "yyyy-MM-ddTHH:mm";
// the API speaks ISO-8601 UTC. These are the two directions.
function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local) {
  const parsed = new Date(local);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stamp(iso) {
  return new Date(iso).toLocaleString();
}

// Segmented "Publish now / Schedule" control — reads as one choice, not two
// unrelated checkboxes, and lights up with the primary colour when picked.
const modeChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 13px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-alt)",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

// `border` is a whole shorthand because modeChip already sets it — React
// discards a lone borderColor when a shorthand is also present.
const modeChipOn = {
  border: "1px solid var(--primary)",
  background: "var(--success-tint)",
  color: "var(--primary-strong)",
};

export default function News() {
  const navigate = useNavigate();
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // Image state lives outside `form`: object URLs are unstable strings that
  // would defeat the dirty-guard's pristine comparison, and we must revoke
  // the blob URL ourselves when the modal closes.
  const [existingImage, setExistingImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const objectUrlRef = useRef(null);

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
    setExistingImage(null);
    setPreviewUrl(null);
    pristineRef.current = JSON.stringify(emptyForm);
    setDirty(false);
    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingId(item.id);
    const next = {
      title: item.title,
      content: item.content,
      // A non-null publishAt always means "still waiting" (due schedules are
      // collapsed to null on save), so it maps straight back to schedule mode.
      mode: item.publishAt ? "schedule" : "now",
      publishAt: item.publishAt ? toLocalInput(item.publishAt) : "",
      imageFile: null,
      removeImage: false,
    };
    const stored = newsImageUrl(item.imagePath);
    setForm(next);
    setExistingImage(stored);
    setPreviewUrl(stored);
    pristineRef.current = JSON.stringify(next);
    setDirty(false);
    setShowModal(true);
  }

  function pickImage(file) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    updateField({ imageFile: file, removeImage: false });
  }

  function clearImage() {
    if (objectUrlRef.current) {
      // Dropping a freshly picked file falls back to the stored image.
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      setPreviewUrl(existingImage);
      updateField({ imageFile: null });
      return;
    }
    setPreviewUrl(null);
    updateField({ imageFile: null, removeImage: true });
  }

  const closeModalGuarded = () => withGuard(closeModal);

  function closeModal() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setExistingImage(null);
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  // intent: "publish" (now), "schedule" (at form.publishAt), or "draft".
  async function save(intent) {
    const publishAt = intent === "schedule" ? toIso(form.publishAt) : null;
    if (intent === "schedule" && !publishAt) {
      notifyError("Pick the date and time to publish this post.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        isPublished: intent !== "draft",
        publishAt,
      };
      if (editingId) {
        await updateNews(editingId, payload);
      } else {
        await createNews(payload);
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

  function handleSubmit(e) {
    e.preventDefault();
    save(form.mode === "schedule" ? "schedule" : "publish");
  }

  function handleSaveDraft() {
    save("draft");
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
                  {newsImageUrl(item.imagePath) && (
                    <img
                      src={newsImageUrl(item.imagePath)}
                      alt=""
                      style={{ width: 58, height: 58, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <h3 style={cardTitle}>{item.title}</h3>
                    <p style={{ ...cardMeta, margin: 0, fontWeight: 700, color: "var(--text)", fontSize: 13 }}>
                      {item.publishAt
                        ? `Schedules for ${stamp(item.publishAt)} · by ${item.postedByAdminName}`
                        : `Posted by ${item.postedByAdminName} · ${stamp(item.postedAt)}`}
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
                  <span
                    style={{
                      ...pill,
                      marginLeft: "auto",
                      flexShrink: 0,
                      ...(item.isPublished
                        ? item.publishAt
                          ? statusTone("info")
                          : statusTone("success")
                        : statusTone("warning")),
                    }}
                  >
                    {!item.isPublished ? "Draft" : item.publishAt ? "Scheduled" : "Published"}
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
                  <Link
                    to={`/news/${item.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
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
                  <div style={{ marginLeft: "auto" }}>
                    <KebabMenu
                      label={`More actions for ${item.title}`}
                      items={[
                        { key: "edit", label: "Edit post", icon: Pencil, onClick: () => openEditModal(item) },
                        { key: "delete", label: "Delete post", icon: Trash2, danger: true, dividerBefore: true, onClick: () => handleDelete(item) },
                      ]}
                    />
                  </div>
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
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
                Publishing
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label style={{ ...modeChip, ...(form.mode === "now" ? modeChipOn : null) }}>
                  <input
                    type="radio"
                    name="news-publish-mode"
                    checked={form.mode === "now"}
                    onChange={() => updateField({ mode: "now" })}
                  />
                  Publish now
                </label>
                <label style={{ ...modeChip, ...(form.mode === "schedule" ? modeChipOn : null) }}>
                  <input
                    type="radio"
                    name="news-publish-mode"
                    checked={form.mode === "schedule"}
                    onChange={() => updateField({ mode: "schedule" })}
                  />
                  Schedule
                </label>
              </div>

              {form.mode === "schedule" && (
                <>
                  <input
                    type="datetime-local"
                    value={form.publishAt}
                    onChange={(e) => updateField({ publishAt: e.target.value })}
                    required
                    style={{ ...textInput, marginTop: 8 }}
                  />
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    Students won&apos;t see this post until then — a past time publishes immediately.
                  </div>
                </>
              )}
            </div>

            <Field label={`Image ${editingId ? "(drop to replace)" : "(optional)"}`}>
              <ImageDropZone
                previewUrl={previewUrl}
                fileName={form.imageFile ? form.imageFile.name : null}
                onPick={pickImage}
                onRemove={previewUrl ? clearImage : null}
                hint="JPG, PNG, GIF, WebP or BMP · up to 5 MB"
              />
            </Field>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" onClick={closeModalGuarded} disabled={saving} style={btn}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveDraft} disabled={saving} style={btn}>
                Save Draft
              </button>
              <button type="submit" disabled={saving} style={btnPrimary}>
                {saving
                  ? "Saving..."
                  : form.mode === "schedule"
                    ? "Schedule Post"
                    : editingId
                      ? "Update Post"
                      : "Publish"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
