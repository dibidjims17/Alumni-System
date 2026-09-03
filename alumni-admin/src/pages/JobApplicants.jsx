import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJobApplicants, updateApplicationStatus, downloadResume, getJobById, exportApplicants, getApplicationHistory } from "../services/jobsApi";

const STATUS_OPTIONS = ["Pending", "Reviewed", "Shortlisted", "Rejected"];

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadJob() {
    try {
      const data = await getJobById(id);
      setJob(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadJob();
    loadApplicants();
  }, [id]);

  async function handleStatusChange(applicationId, newStatus, currentNotes) {
    setSavingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, newStatus, currentNotes || "");
      loadApplicants();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleNotesBlur(applicationId, status, newNotes, oldNotes) {
    if (newNotes === oldNotes) return;
    setSavingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, status, newNotes);
      loadApplicants();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleViewResume(resumeId) {
    try {
      await downloadResume(resumeId);
    } catch (err) {
      setError(err.message);
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
      setError(err.message);
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
      setError(err.message);
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
          <button onClick={handleExport} disabled={exporting}>
            {exporting ? "Preparing export..." : "Export to ZIP (CSV + Resumes)"}
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading applicants...</p>
      ) : applicants.length === 0 ? (
        <p>No applicants yet.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Student Number</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Program</th>
              <th>Applied At</th>
              <th>Resume</th>
              <th>Status</th>
              <th>Admin Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a) => (
              <tr key={a.applicationId}>
                <td>{a.studentNumber}</td>
                <td>{a.fullName}</td>
                <td>{a.email}</td>
                <td>{a.program}</td>
                <td>{new Date(a.appliedAt).toLocaleString()}</td>
                <td>
                  {a.attachResume && a.resumeId ? (
                    <button onClick={() => handleViewResume(a.resumeId)}>
                      {a.resumeFileName || "View Resume"}
                    </button>
                  ) : (
                    "No"
                  )}
                </td>
                <td>
                  <select
                    value={a.status}
                    onChange={(e) => handleStatusChange(a.applicationId, e.target.value, a.adminNotes)}
                    disabled={savingId === a.applicationId}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    defaultValue={a.adminNotes || ""}
                    onBlur={(e) => handleNotesBlur(a.applicationId, a.status, e.target.value, a.adminNotes)}
                    disabled={savingId === a.applicationId}
                    style={{ width: "100%" }}
                  />
                </td>
                <td>
                  <button onClick={() => openHistory(a)}>History</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {historyFor && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setHistoryFor(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              maxWidth: 560,
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>History — {historyFor.fullName}</h3>
              <button onClick={() => setHistoryFor(null)}>✕</button>
            </div>

            {loadingHistory ? (
              <p>Loading history...</p>
            ) : history.length === 0 ? (
              <p>No updates recorded yet.</p>
            ) : (
              <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Change</th>
                    <th>By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.createdAt).toLocaleString()}</td>
                      <td>
                        {h.fromStatus} → {h.toStatus}
                      </td>
                      <td>{h.updatedByAdminName || "System"}</td>
                      <td>{h.adminNotes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}