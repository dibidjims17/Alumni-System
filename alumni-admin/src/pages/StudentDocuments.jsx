import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Trash2, RefreshCw, Plus } from "lucide-react";
import {
  getStudentDocuments,
  updateDocumentStatus,
  initializeChecklist,
  addCustomDocument,
  deleteDocument,
} from "../services/documentsApi";
import ConfirmDialog from "../components/ConfirmDialog";
import { pageWrap, pageHeader, cardGrid, card, cardFlush, cardHead, cardBody, cardFooter, cardTitle, cardMeta, pill, iconTile, fieldLabel, Field, textInput, selectStyle, btnPrimary, btnDanger, btn, ModalShell } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError, notifySuccess } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";

const STATUS_OPTIONS = ["Pending", "Released"];

const STATUS_STYLES = {
  Pending: { background: "rgba(239,108,0,0.14)", color: "#B45309" },
  Released: { background: "rgba(46,125,50,0.13)", color: "var(--success)" },
};

export default function StudentDocuments() {
  const { id } = useParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // staged edits: { [docId]: { status?, notes? } }
  const [pending, setPending] = useState({});

  const [showCustom, setShowCustom] = useState(false);
  const [customType, setCustomType] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function loadDocuments() {
    setLoading(true);
    try {
      const data = await getStudentDocuments(id);
      setDocuments(data);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPending({});
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const pendingCount = Object.keys(pending).length;

  function stage(docId, key, value) {
    setPending((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], [key]: value },
    }));
  }

  function valueOf(doc, key) {
    return pending[doc.id]?.[key] ?? doc[key];
  }

  async function handleInitialize() {
    if (!(await askConfirm("Initialize / refresh the standard document checklist?"))) return;
    try {
      await initializeChecklist(id);
      notifySuccess("Checklist initialized.");
      await loadDocuments();
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function handleSave() {
    if (pendingCount === 0) return;
    setSaving(true);
    try {
      for (const docId of Object.keys(pending)) {
        const edit = pending[docId];
        const doc = documents.find((d) => d.id === Number(docId));
        const status = edit.status ?? doc?.status ?? "Pending";
        const notes = edit.notes ?? doc?.notes ?? "";
        await updateDocumentStatus(Number(docId), status, notes);
      }
      notifySuccess(`${pendingCount} change${pendingCount === 1 ? "" : "s"} saved.`);
      setPending({});
      await loadDocuments();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      await deleteDocument(confirmDeleteId);
      await loadDocuments();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setConfirmDeleteId(null);
    }
  }

  function openCustomModal() {
    setCustomType("");
    setCustomLabel("");
    setShowCustom(true);
  }

  async function handleAddCustom(e) {
    e.preventDefault();
    if (!customType.trim()) return;
    try {
      await addCustomDocument(id, customType.trim(), customLabel.trim());
      notifySuccess("Custom document added.");
      setShowCustom(false);
      await loadDocuments();
    } catch (err) {
      notifyError(err.message);
    }
  }

  return (
    <div style={pageWrap}>
      <div style={pageHeader}>
        <div style={{ minWidth: 0 }}>
          <p style={{ ...cardMeta, margin: 0 }}>
            {documents.length > 0
              ? `${documents.length} document${documents.length === 1 ? "" : "s"}${pendingCount ? ` • ${pendingCount} unsaved` : ""}`
              : "Review and release student documents"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btn} onClick={openCustomModal}>
            <Plus size={15} />
            Add Custom Document
          </button>
          <button style={btn} onClick={handleInitialize}>
            <RefreshCw size={15} />
            Initialize
          </button>
          <button style={btnPrimary} onClick={handleSave} disabled={pendingCount === 0 || saving}>
            {saving ? "Saving..." : `Save changes${pendingCount ? ` (${pendingCount})` : ""}`}
          </button>
        </div>
      </div>

      {pendingCount > 0 && (
        <button
          style={{ ...btn, marginTop: 8 }}
          onClick={() => setPending({})}
        >
          Revert pending edits
        </button>
      )}

      {loading ? (
        <GridSkeleton count={6} />
      ) : documents.length === 0 ? (
        <p>No documents found for this student yet.</p>
      ) : (
        <div style={cardGrid}>
          {documents.map((doc) => {
            const pillStyle = STATUS_STYLES[doc.status] || STATUS_STYLES.Pending;
            const currentStatus = valueOf(doc, "status");
            const edited = !!pending[doc.id];
            const released = currentStatus === "Released";
            return (
              <div key={doc.id} style={{ ...card, ...cardFlush, ...(edited ? { outline: "2px solid var(--primary)", outlineOffset: -2 } : {}) }}>
                <div style={cardHead}>
                  <div style={iconTile}>
                    <FileText size={18} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={cardTitle}>{doc.customLabel || doc.documentType}</h4>
                    <p style={{ ...cardMeta, marginTop: 3 }}>
                      Updated {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "never"}
                    </p>
                  </div>
                  <span style={{ ...pill, background: pillStyle.background, color: released ? "var(--success)" : "#B45309" }}>
                    {currentStatus}
                  </span>
                </div>

                <div style={cardBody}>
                  <div style={{ display: "grid", gridTemplateColumns: "132px minmax(0, 1fr)", gap: 12, alignItems: "start", width: "100%" }}>
                    <div style={{ minWidth: 0 }}>
                      <label style={fieldLabel}>Status</label>
                      <select
                        value={currentStatus}
                        onChange={(e) => stage(doc.id, "status", e.target.value)}
                        style={{ ...selectStyle, width: "100%", margin: 0 }}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <label style={fieldLabel}>Notes</label>
                      <textarea
                        value={valueOf(doc, "notes") || ""}
                        onChange={(e) => stage(doc.id, "notes", e.target.value)}
                        rows={3}
                        placeholder="Add a note…"
                        style={{ ...textInput, margin: 0, minHeight: 76, resize: "vertical" }}
                      />
                    </div>
                  </div>
                </div>

                <div style={cardFooter}>
                  <span style={{ marginRight: "auto", fontSize: 12.5, fontWeight: 800, color: edited ? "var(--primary)" : "transparent", userSelect: "none" }}>
                    {edited ? "● Unsaved" : "●"}
                  </span>
                  <button
                    onClick={() => setConfirmDeleteId(doc.id)}
                    style={btnDanger}
                    title="Remove document"
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCustom && (
        <ModalShell title="Add Custom Document" onClose={() => setShowCustom(false)} width={440}>
          <form onSubmit={handleAddCustom}>
            <Field label="Document Type">
              <input
                type="text"
                placeholder="e.g. Certificate of Enrollment"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                required
                style={textInput}
              />
            </Field>
            <Field label="Custom Label (optional)">
              <input
                type="text"
                placeholder="e.g. 2nd Sem Certification"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                style={textInput}
              />
            </Field>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btn} type="button" onClick={() => setShowCustom(false)}>Cancel</button>
              <button style={btnPrimary} type="submit">Add Document</button>
            </div>
          </form>
        </ModalShell>
      )}

      <ConfirmDialog
        message={confirmDeleteId ? "Delete this document from the checklist?" : null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
