import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FileText, Trash2, RefreshCw, Plus } from "lucide-react";
import {
  getStudentDocuments,
  updateDocumentStatus,
  initializeChecklist,
  addCustomDocument,
  deleteDocument,
} from "../services/documentsApi";
import ConfirmDialog from "../components/ConfirmDialog";
import { cardGrid, card, cardTitle, cardMeta, Field, textInput } from "../components/kit";
import { notifyError } from "../components/toastBus";

const STATUS_OPTIONS = ["Pending", "Released"];

const STATUS_STYLES = {
  Pending: { background: "#eee", color: "#555" },
  Released: { background: "#e6f4ea", color: "#1e7e34" },
};

export default function StudentDocuments() {
  const { id } = useParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [customType, setCustomType] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function loadDocuments() {
    setLoading(true);
    setError("");
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
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleInitialize() {
    if (!window.confirm("Initialize / refresh the standard document checklist?")) return;
    try {
      await initializeChecklist(id);
      loadDocuments();
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function handleStatusChange(doc, newStatus) {
    if (newStatus === doc.status) return;
    if (!window.confirm(`Mark "${doc.customLabel || doc.documentType}" as "${newStatus}"?`)) return;
    setSavingId(doc.id);
    try {
      await updateDocumentStatus(doc.id, newStatus, doc.notes || "");
      loadDocuments();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleNotesBlur(doc, newNotes) {
    if (newNotes === doc.notes) return;
    if (!window.confirm("Save your notes for this document?")) return;
    setSavingId(doc.id);
    try {
      await updateDocumentStatus(doc.id, doc.status, newNotes);
      loadDocuments();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function confirmDelete() {
    try {
      await deleteDocument(confirmDeleteId);
      loadDocuments();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setConfirmDeleteId(null);
    }
  }

  async function handleAddCustom(e) {
    e.preventDefault();
    if (!customType.trim()) return;
    try {
      await addCustomDocument(id, customType.trim(), customLabel.trim());
      setCustomType("");
      setCustomLabel("");
      loadDocuments();
    } catch (err) {
      notifyError(err.message);
    }
  }

  return (
    <div>
      <Link to="/students">← Back to Students</Link>
      <h2>Document Checklist</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={handleInitialize} style={{ marginBottom: 16 }}>
        <RefreshCw size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
        Initialize / Refresh Standard Checklist
      </button>

      {loading ? (
        <p>Loading...</p>
      ) : documents.length === 0 ? (
        <p>No documents found for this student yet.</p>
      ) : (
        <div style={cardGrid}>
          {documents.map((doc) => {
            const pill = STATUS_STYLES[doc.status] || STATUS_STYLES.Pending;
            return (
              <div key={doc.id} style={card}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <FileText size={18} color="#34558b" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ ...cardTitle, margin: 0 }}>{doc.customLabel || doc.documentType}</h4>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>
                      {doc.documentType === doc.customLabel ? "" : doc.documentType}
                    </p>
                  </div>
                  <span style={{
                    marginLeft: "auto", fontSize: 12, fontWeight: 600,
                    padding: "2px 10px", borderRadius: 999, flexShrink: 0,
                    background: pill.background, color: pill.color,
                  }}>
                    {doc.status}
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <div>
                    <label style={{ fontSize: 12, color: "#555" }}>Status</label><br />
                    <select
                      value={doc.status}
                      onChange={(e) => handleStatusChange(doc, e.target.value)}
                      disabled={savingId === doc.id}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <label style={{ fontSize: 12, color: "#555" }}>Notes</label><br />
                    <input
                      type="text"
                      defaultValue={doc.notes || ""}
                      onBlur={(e) => handleNotesBlur(doc, e.target.value)}
                      disabled={savingId === doc.id}
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                <p style={{ ...cardMeta, margin: "6px 0 0" }}>
                  Updated {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : "never"}
                </p>

                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => setConfirmDeleteId(doc.id)}
                    style={{ color: "#c0392b", border: "1px solid #e0b4b4" }}
                  >
                    <Trash2 size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ maxWidth: 560, marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>
          <Plus size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Add Custom Document
        </h3>
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
          <button type="submit" style={{ padding: "9px 18px", border: "none", borderRadius: 8, background: "var(--primary)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
            Add Document
          </button>
        </form>
      </div>

      <ConfirmDialog
        message={confirmDeleteId ? "Delete this document from the checklist?" : null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
