import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FileText, History, Download } from "lucide-react";
import { getJobApplicants, updateApplicationStatus, downloadResume, getJobById, exportApplicants, getApplicationHistory } from "../services/jobsApi";
import { cardGrid, card, cardTitle, cardMeta, ModalShell, btn, btnPrimary, textInput, selectStyle } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";

const STATUS_OPTIONS = ["Pending", "Reviewed", "Shortlisted", "Rejected"];

const STATUS_STYLES = {
  Pending: { background: "#eee", color: "#555" },
  Reviewed: { background: "#e8eefc", color: "#1a4fd8" },
  Shortlisted: { background: "#e6f4ea", color: "#1e7e34" },
  Rejected: { background: "#fdecea", color: "#cc0000" },
};

export default function JobApplicants() {
  const { id } = useParams();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [job, setJob] = useState(null);
  const [exportStatuses, setExportStatuses] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadApplicants() {
    setLoading(true);
    setError("");
    try {
      const data = await getJobApplicants(id);
      setApplicants(data);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadJob() {
    try {
      const data = await getJobById(id);
      setJob(data);
    } catch (err) {
      notifyError(err.message);
    }
  }

  useEffect(() => {
    loadJob();
    loadApplicants();
  }, [id]);

  async function handleStatusChange(applicationId, newStatus, currentNotes, applicantName, currentStatus) {
    if (!(await askConfirm(
      `Change ${applicantName}'s status from "${currentStatus}" to "${newStatus}"?`
    ))) return;
    setSavingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, newStatus, currentNotes || "");
      loadApplicants();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleNotesBlur(applicationId, status, newNotes, oldNotes) {
    if (newNotes === oldNotes) return;
    if (!(await askConfirm("Save your admin notes for this applicant?"))) return;
    setSavingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, status, newNotes);
      loadApplicants();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleViewResume(resumeId) {
    try {
      await downloadResume(resumeId);
    } catch (err) {
      notifyError(err.message);
    }
  }

  function toggleExportStatus(status) {
    setExportStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  async function handleExport() {
    setExporting(true);
    setError("");
    try {
      await exportApplicants(id, exportStatuses);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setExporting(false);
    }
  }

  async function openHistory(a) {
    setHistoryFor(a);
    setHistory([]);
    setLoadingHistory(true);
    try {
      const data = await getApplicationHistory(a.applicationId);
      setHistory(data);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <div>
      <Link to="/jobs">← Back to Jobs</Link>
      <h2>Applicants</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {job && (
        <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>{job.jobTitle} — {job.company}</h3>
          <p>
            <strong>Location:</strong> {job.location || "—"} |{" "}
            <strong>Industry:</strong> {job.industry || "—"} |{" "}
            <strong>Type:</strong> {job.employmentType || "—"}
          </p>
          <p>
            <strong>Salary:</strong> {job.salaryMin ? `₱${job.salaryMin}` : "—"} – {job.salaryMax ? `₱${job.salaryMax}` : "—"}
          </p>
          <p>
            <strong>Deadline:</strong> {job.deadline ? new Date(job.deadline).toLocaleDateString() : "—"} |{" "}
            <strong>Status:</strong> {job.isActive ? "Active" : "Inactive"}
          </p>
          <p>{job.description}</p>
        </div>
      )}

      <div style={{ marginBottom: 20, padding: 12, border: "1px solid #ccc", borderRadius: 8 }}>
        <p style={{ marginTop: 0 }}><strong>Export Applicants</strong></p>
        <p style={{ fontSize: 13, color: "#555" }}>
          Select which statuses to include (leave all unchecked to export everyone):
        </p>
        {STATUS_OPTIONS.map((status) => (
          <label key={status} style={{ marginRight: 12 }}>
            <input
              type="checkbox"
              checked={exportStatuses.includes(status)}
              onChange={() => toggleExportStatus(status)}
            />{" "}
            {status}
          </label>
        ))}
        <div style={{ marginTop: 10 }}>
          <button onClick={handleExport} disabled={exporting} style={btnPrimary}>
            <Download size={15} />
            {exporting ? "Preparing export..." : "Export to ZIP (CSV + Resumes)"}
          </button>
        </div>
      </div>

      {loading ? (
        <GridSkeleton count={6} />
      ) : applicants.length === 0 ? (
        <p>No applicants yet.</p>
      ) : (
        <div style={cardGrid}>
          {applicants.map((a) => {
            const pill = STATUS_STYLES[a.status] || STATUS_STYLES.Pending;
            return (
              <div key={a.applicationId} style={card}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", background: "#eef3ec",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, color: "var(--primary)", flexShrink: 0,
                  }}>
                    {(a.fullName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ ...cardTitle, margin: 0 }}>{a.fullName}</h4>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>{a.studentNumber}</p>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>{a.email}</p>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>
                      {a.program} • Applied {new Date(a.appliedAt).toLocaleString()}
                    </p>
                  </div>
                  <span style={{
                    marginLeft: "auto", flexShrink: 0, fontSize: 12, fontWeight: 600,
                    padding: "2px 10px", borderRadius: 999,
                    background: pill.background, color: pill.color,
                  }}>
                    {a.status}
                  </span>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <label style={{ fontSize: 12, color: "#555" }}>Status</label><br />
                      <select
                        value={a.status}
                        onChange={(e) => handleStatusChange(a.applicationId, e.target.value, a.adminNotes, a.fullName, a.status)}
                        disabled={savingId === a.applicationId}
                        style={{ ...selectStyle, width: "auto" }}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <label style={{ fontSize: 12, color: "#555" }}>Admin Notes</label><br />
                      <input
                        type="text"
                        defaultValue={a.adminNotes || ""}
                        onBlur={(e) => handleNotesBlur(a.applicationId, a.status, e.target.value, a.adminNotes)}
                        disabled={savingId === a.applicationId}
                        style={textInput}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {a.attachResume && a.resumeId ? (
                      <button onClick={() => handleViewResume(a.resumeId)} style={btn}>
                        <FileText size={15} />
                        {a.resumeFileName || "View Resume"}
                      </button>
                    ) : (
                      <span style={{ ...cardMeta, margin: 0 }}>No resume</span>
                    )}
                    <button onClick={() => openHistory(a)} style={btn}>
                      <History size={15} />
                      History
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {historyFor && (
        <ModalShell title={`History — ${historyFor.fullName}`} onClose={() => setHistoryFor(null)} width={600}>
          {loadingHistory ? (
            <p>Loading history...</p>
          ) : history.length === 0 ? (
            <p>No updates recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              {history.map((h) => (
                <div
                  key={h.id}
                  style={{ border: "1px solid #eee", borderRadius: 8, padding: "10px 12px" }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
                    {new Date(h.createdAt).toLocaleString()} • {h.updatedByAdminName || "System"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 14 }}>
                    <strong>{h.fromStatus} → {h.toStatus}</strong>
                  </p>
                  {h.adminNotes && (
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>{h.adminNotes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalShell>
      )}
    </div>
  );
}