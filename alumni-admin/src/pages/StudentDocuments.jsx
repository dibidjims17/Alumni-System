import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getStudentDocuments,
  updateDocumentStatus,
  initializeChecklist,
  addCustomDocument,
  deleteDocument,
} from "../services/documentsApi";

const STATUS_OPTIONS = ["Pending", "Released"];

export default function StudentDocuments() {
  const { id } = useParams();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [customType, setCustomType] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  async function loadDocuments() {
    setLoading(true);
    setError("");
    try {
      const data = await getStudentDocuments(id);
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [id]);

  async function handleInitialize() {
    try {
      await initializeChecklist(id);
      loadDocuments();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(doc, newStatus) {
    setSavingId(doc.id);
    try {
      await updateDocumentStatus(doc.id, newStatus, doc.notes || "");
      loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleNotesBlur(doc, newNotes) {
    if (newNotes === doc.notes) return;
    setSavingId(doc.id);
    try {
      await updateDocumentStatus(doc.id, doc.status, newNotes);
      loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(documentId) {
    try {
      await deleteDocument(documentId);
      loadDocuments();
    } catch (err) {
      setError(err.message);
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
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <Link to="/students">← Back to Students</Link>
      <h2>Document Checklist</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={handleInitialize} style={{ marginBottom: 16 }}>
        Initialize / Refresh Standard Checklist
      </button>

      {loading ? (
        <p>Loading...</p>
      ) : documents.length === 0 ? (
        <p>No documents found for this student yet.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Document Type</th>
              <th>Status</th>
              <th>Notes</th>
              <th>Updated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id}>
                <td>{doc.customLabel || doc.documentType}</td>
                <td>
                  <select
                    value={doc.status}
                    onChange={(e) => handleStatusChange(doc, e.target.value)}
                    disabled={savingId === doc.id}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    defaultValue={doc.notes || ""}
                    onBlur={(e) => handleNotesBlur(doc, e.target.value)}
                    disabled={savingId === doc.id}
                    style={{ width: "100%" }}
                  />
                </td>
                <td>{new Date(doc.updatedAt).toLocaleString()}</td>
                <td>
                  <button onClick={() => handleDelete(doc.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ marginTop: 30 }}>Add Custom Document</h3>
      <form onSubmit={handleAddCustom}>
        <input
          type="text"
          placeholder="Document Type"
          value={customType}
          onChange={(e) => setCustomType(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Custom Label (optional)"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          style={{ marginLeft: 8 }}
        />
        <button type="submit" style={{ marginLeft: 8 }}>Add</button>
      </form>
    </div>
  );
}