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
import { cardGrid, card, cardTitle, cardMeta, Field, textInput, selectStyle, btnPrimary, btnDanger, btn, ModalShell } from "../components/kit";
import { notifyError, notifySuccess } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";

const STATUS_OPTIONS = ["Pending", "Released"];

const STATUS_STYLES = {
  Pending: { background: "var(--surface-alt)", color: "var(--muted)" },
  Released: { background: "var(--surface-alt)", color: "var(--success)" },
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0 }}>Document Checklist</h2>
        <div style={{ display: "flex", gap: 8 }}>
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
        <p>Loading...</p>
      ) : documents.length === 0 ? (
        <p>No documents found for this student yet.</p>
      ) : (
        <div style={cardGrid}>
          {documents.map((doc) => {
            const pill = STATUS_STYLES[doc.status] || STATUS_STYLES.Pending;
            const currentStatus = valueOf(doc, "status");
            const edited = !!pending[doc.id];
            return (
              <div key={doc.id} style={{ ...card, ...(edited ? { outline: "1px solid var(--primary)" } : {}) }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <FileText size={18} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <h4 style={{ ...cardTitle, margin: 0, flex: 1 }}>{doc.customLabel || doc.documentType}</h4>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999, background: pill.background, color: currentStatus === "Released" ? "var(--success)" : "var(--muted)" }}>
                    {currentStatus}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Status</label><br />
                    <select
                      value={currentStatus}
                      onChange={(e) => stage(doc.id, "status", e.target.value)}
                      style={{ ...selectStyle, width: "auto", marginTop: 4 }}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Notes</label><br />
                    <textarea
                      value={valueOf(doc, "notes") || ""}
                      onChange={(e) => stage(doc.id, "notes", e.target.value)}
                      rows={3}
                      style={{ ...textInput, marginTop: 4, resize: "vertical" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                  <p style={{ ...cardMeta, margin: 0 }}>
                    Updated {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "never"}
                    {edited ? " • unsaved" : ""}
                  </p>
                  <button
                    onClick={() => setConfirmDeleteId(doc.id)}
                    style={{ ...btnDanger, padding: "5px 9px" }}
                  >
                    <Trash2 size={15} />
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
