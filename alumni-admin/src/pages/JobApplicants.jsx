import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { FileText, History, Download, Users } from "lucide-react";
import { getJobApplicants, updateApplicationStatus, downloadResume, getJobById, exportApplicants, getApplicationHistory } from "../services/jobsApi";
import { cardGrid, card, cardTitle, cardMeta, pill, statusTone, ModalShell, btn, btnPrimary, textInput, selectStyle, EmptyState, pageWrap } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";
import KebabMenu from "../components/KebabMenu";
import { getSession } from "../services/api";

const STATUS_OPTIONS = ["Pending", "Reviewed", "Shortlisted", "Rejected"];

const STATUS_TONES = {
  Pending: "warning",
  Reviewed: "info",
  Shortlisted: "success",
  Rejected: "danger",
};

export default function JobApplicants() {
  const { id } = useParams();
  // Resumes and exports are the registrar's (SuperAdmin) alone — Staff
  // coordinate day-to-day but must never peek inside a resume.
  const isSuperAdmin = getSession()?.role === "SuperAdmin";
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [job, setJob] = useState(null);
  const [exportStatuses, setExportStatuses] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadApplicants() {
    setLoading(true);
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
      // Precompute deadline state at load time — Date.now() is banned during
      // render (react-hooks/purity), and the Jobs list derives it the same way.
      const closed = data.deadline ? new Date(data.deadline).getTime() < Date.now() : false;
      setJob({ ...data, isClosed: closed });
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
    <div style={pageWrap}>
      <Link to="/jobs">← Back to Jobs</Link>

      {job && (() => {
        // Same presentation rules as the Jobs list card so the job looks
        // identical in both places: closed-by-deadline counts as Closed,
        // empty salary/deadline fields are omitted instead of "— — —".
        const hasMin = job.salaryMin != null;
        const hasMax = job.salaryMax != null;
        const salaryLine = hasMin || hasMax
          ? `${hasMin ? `₱${Number(job.salaryMin).toLocaleString()}` : "—"} – ${hasMax ? `₱${Number(job.salaryMax).toLocaleString()}` : "—"}`
          : "";
        const isClosed = !!job.isClosed;
        const isJobActive = job.isActive !== false && !isClosed;
        return (
          <div style={{ ...card, height: "auto", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 style={cardTitle}>{job.jobTitle}</h3>
              <span style={{ ...pill, ...(isJobActive ? statusTone("success") : statusTone("danger")) }}>
                {isJobActive ? "Active" : "Closed"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ ...cardMeta, fontWeight: 700, color: "var(--text)", fontSize: 13.5 }}>
                {job.company || "—"} • {job.location || "—"}
              </p>
              <p style={cardMeta}>
                {job.employmentType || "—"} • {job.industry || "—"}
              </p>
              {salaryLine && <p style={cardMeta}>Salary: {salaryLine}</p>}
              <p style={cardMeta}>
                Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : "—"}
                {isClosed ? " (Closed)" : ""}
              </p>
            </div>

            {job.description && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <p style={{ ...cardMeta, whiteSpace: "pre-line", lineHeight: 1.55 }}>{job.description}</p>
              </div>
            )}
          </div>
        );
      })()}

      {isSuperAdmin && (
        <div style={{ ...card, height: "auto", marginBottom: 20 }}>
          <div>
            <p style={{ ...cardTitle, fontSize: 14 }}>Export Applicants</p>
            <p style={{ ...cardMeta, marginTop: 4 }}>
              Select which statuses to include (leave all unchecked to export everyone):
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {STATUS_OPTIONS.map((status) => (
              <label
                key={status}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text)", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={exportStatuses.includes(status)}
                  onChange={() => toggleExportStatus(status)}
                />
                {status}
              </label>
            ))}
          </div>
          <div>
            <button onClick={handleExport} disabled={exporting} style={btnPrimary}>
              <Download size={15} />
              {exporting ? "Preparing export..." : "Export to ZIP (CSV + Resumes)"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <GridSkeleton count={6} />
      ) : applicants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          hint="Applications from the mobile app will show up here."
        />
      ) : (
        <div style={cardGrid}>
          {applicants.map((a) => {
            const tone = STATUS_TONES[a.status] || "warning";
            return (
              <div key={a.applicationId} style={card}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", background: "var(--surface-alt)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, color: "var(--primary)", flexShrink: 0,
                  }}>
                    {(a.fullName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ ...cardTitle, margin: 0 }}>{a.fullName}</h4>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>{a.studentNumber}</p>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>{a.email}</p>
                    <p style={{ ...cardMeta, margin: "2px 0 0", fontWeight: 700, color: "var(--text)", fontSize: 13.5 }}>
                      {a.program} • Applied {new Date(a.appliedAt).toLocaleString()}
                    </p>
                  </div>
                  <span style={{
                    ...pill,
                    marginLeft: "auto",
                    ...statusTone(tone),
                  }}>
                    {a.status}
                  </span>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <label style={{ fontSize: 12, color: "var(--muted)" }}>Status</label><br />
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
                      <label style={{ fontSize: 12, color: "var(--muted)" }}>Admin Notes</label><br />
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
                      isSuperAdmin ? (
                        <button onClick={() => handleViewResume(a.resumeId)} style={btn}>
                          <FileText size={15} />
                          {a.resumeFileName || "View Resume"}
                        </button>
                      ) : (
                        <span
                          style={{ ...cardMeta, margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
                          title="Resumes are visible to the SuperAdmin (registrar) only"
                        >
                          <FileText size={14} />
                          {a.resumeFileName || "Resume attached"} — SuperAdmin only
                        </span>
                      )
                    ) : (
                      <span style={{ ...cardMeta, margin: 0 }}>No resume</span>
                    )}
                    <div style={{ marginLeft: "auto" }}>
                      <KebabMenu
                        label={`More actions for ${a.fullName}`}
                        items={[
                          { key: "history", label: "Status history", icon: History, onClick: () => openHistory(a) },
                        ]}
                      />
                    </div>
                  </div>                </div>
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
                  style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                    {new Date(h.createdAt).toLocaleString()} • {h.updatedByAdminName || "System"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 14 }}>
                    <strong>{h.fromStatus} → {h.toStatus}</strong>
                  </p>
                  {h.adminNotes && (
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>{h.adminNotes}</p>
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