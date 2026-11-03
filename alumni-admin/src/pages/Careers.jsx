import { useEffect, useState, useMemo } from "react";
import {
  Briefcase, Users, Clock3, BadgeCheck, XCircle, RotateCcw,
  Eye, Check, ExternalLink, Search as SearchIcon,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { getCareers, getCareerStats, reviewCareer } from "../services/careersApi";
import { notifyError, notifySuccess } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";
import {
  SearchBox, cardGrid, card, cardTitle, cardMeta, pill, statusTone,
  ModalShell, Field, textInput, btn, btnPrimary, btnDanger,
  toolbar, filterRow, EmptyState, pageWrap,
} from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";

const FILE_ROOT = API_BASE_URL.replace("/api", "");

const STATUS_FILTERS = ["", "Pending", "Approved", "Rejected"];

function fileUrl(path) {
  if (!path) return null;
  return `${FILE_ROOT}/${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

function statusToneFor(status) {
  if (status === "Approved") return statusTone("success");
  if (status === "Rejected") return statusTone("danger");
  return statusTone("warning");
}

// Small metric tile used across the stats strip.
function StatTile({ icon: Icon, label, value, tone }) {
  return (
    <div
      style={{
        ...card,
        gap: 6,
        padding: "14px 16px",
        borderLeft: `4px solid var(--${tone || "border"})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon size={15} color={`var(--${tone || "muted"})`} />
        <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

// Proof document preview — thumbnail that opens the full-size image.
function ProofImage({ path, label }) {
  const url = fileUrl(path);
  if (!url) {
    return <p style={{ ...cardMeta, margin: 0 }}>No {label} on file.</p>;
  }
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <a href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
        <img
          src={url}
          alt={label}
          style={{
            width: 96, height: 96, objectFit: "cover",
            border: "1px solid var(--border)", borderRadius: 8,
            background: "var(--surface-alt)",
          }}
        />
      </a>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{label}</div>
        <div style={{ ...cardMeta, marginTop: 2, overflowWrap: "break-word" }}>
          {path.split("/").pop()}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 12.5, color: "var(--primary)", marginTop: 6, fontWeight: 600,
          }}
        >
          <ExternalLink size={13} /> Open full size
        </a>
      </div>
    </div>
  );
}

export default function Careers() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadRecords() {
    setLoading(true);
    try {
      setRecords(await getCareers(statusFilter));
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      setStats(await getCareerStats());
    } catch {
      // Stats are supplementary — never block the queue on them.
    }
  }

  async function loadAll() {
    await Promise.all([loadRecords(), loadStats()]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRecords();
    loadStats();
    // Loaders are stable for the lifetime of this screen; only the status
    // filter should trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function openReview(record) {
    setSelected(record);
    setNote("");
  }

  async function handleReview(status) {
    if (!selected) return;

    if (status === "Rejected" && !note.trim()) {
      notifyError("A reason is required when rejecting a submission.");
      return;
    }

    const who = `${selected.studentName} (${selected.studentNumber})`;
    const ok = await askConfirm(
      status === "Approved"
        ? `Approve the career record for ${who}? Their profile will show it as verified.`
        : `Reject the career record for ${who}? They will see your reason and can resubmit.`,
      { confirmLabel: status === "Approved" ? "Approve" : "Reject", danger: status === "Rejected" }
    );
    if (!ok) return;

    setSaving(true);
    try {
      const res = await reviewCareer(selected.id, status, note.trim() || null);
      notifySuccess(res.message || "Submission reviewed.");
      setSelected(null);
      await loadAll();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return records;
    return records.filter(
      (r) =>
        r.studentName?.toLowerCase().includes(term) ||
        r.studentNumber?.toLowerCase().includes(term) ||
        r.company?.toLowerCase().includes(term) ||
        r.jobTitle?.toLowerCase().includes(term) ||
        r.industry?.toLowerCase().includes(term)
    );
  }, [records, searchTerm]);

  return (
    <div style={pageWrap}>
      <div style={{ ...toolbar, justifyContent: "space-between" }}>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
          Review the proof of occupation alumni submit from the mobile app.
        </p>
        <button type="button" style={btn} onClick={loadAll}>
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      {/* ── Stats ─────────────────────────────────────────── */}
      {stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 14, marginTop: 4 }}>
            <StatTile icon={Users} label="Graduates" value={stats.totalGraduates} tone="info" />
            <StatTile icon={Briefcase} label="Submitted" value={stats.submitted} tone="violet" />
            <StatTile icon={Clock3} label="Pending" value={stats.pending} tone="warning" />
            <StatTile icon={BadgeCheck} label="Approved" value={stats.approved} tone="success" />
            <StatTile icon={XCircle} label="Rejected" value={stats.rejected} tone="danger" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 180px), 1fr))", gap: 14, marginTop: 14 }}>
            <StatTile icon={Briefcase} label="Employed" value={stats.employed} tone="success" />
            <StatTile icon={Briefcase} label="Self-Employed" value={stats.selfEmployed} tone="success" />
            <StatTile icon={XCircle} label="Unemployed" value={stats.unemployed} tone="warning" />
            <StatTile icon={BadgeCheck} label="Further Studies" value={stats.furtherStudies} tone="info" />
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0" }}>
            Employment figures count approved records only.
          </p>
        </>
      )}

      {/* ── Filters ───────────────────────────────────────── */}
      <div style={filterRow}>
        <SearchBox
          placeholder="Search name, alumni number, job, company, industry"
          value={searchTerm}
          onChange={setSearchTerm}
          onReset={() => setSearchTerm("")}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...textInput, width: "auto", minWidth: 160 }}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s || "all"} value={s}>
              {s ? s : "All Statuses"}
            </option>
          ))}
        </select>
      </div>

      {loading && <GridSkeleton count={6} />}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="No submissions found"
          hint={
            records.length === 0
              ? "No alumni have submitted proof of occupation yet."
              : "Try a different search or status filter."
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            {filtered.length} submission{filtered.length !== 1 ? "s" : ""} found
          </p>
          <div style={cardGrid}>
            {filtered.map((r) => (
              <div key={r.id} style={card}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ ...cardTitle, margin: 0 }}>{r.studentName}</h4>
                    <p style={{ ...cardMeta, margin: "2px 0 0", fontWeight: 700, color: "var(--text)" }}>
                      {r.studentNumber}
                    </p>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>
                      {r.program} • {r.schoolYear}
                    </p>
                  </div>
                  <span style={{ ...pill, ...statusToneFor(r.status) }}>{r.status}</span>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <div style={{ fontSize: 13.5, color: "var(--text)" }}>
                    <strong>{r.employmentStatus}</strong>
                    {r.jobTitle ? ` — ${r.jobTitle}` : ""}
                  </div>
                  <div style={{ ...cardMeta, marginTop: 3 }}>
                    {[r.company, r.industry].filter(Boolean).join(" • ") || "—"}
                  </div>
                  <div style={{ ...cardMeta, marginTop: 3 }}>
                    Submitted {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                    {r.dateStarted ? ` • Started ${new Date(r.dateStarted).toLocaleDateString()}` : ""}
                  </div>
                </div>

                {r.status === "Rejected" && r.reviewNote && (
                  <div
                    style={{
                      ...cardMeta, background: "var(--danger-tint)", color: "var(--danger)",
                      padding: "7px 10px", borderRadius: 8,
                    }}
                  >
                    {r.reviewNote}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
                  <button type="button" style={{ ...btn, flex: 1, justifyContent: "center" }} onClick={() => openReview(r)}>
                    <Eye size={15} /> Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Review modal ──────────────────────────────────── */}
      {selected && (
        <ModalShell
          title={`Review — ${selected.studentName}`}
          onClose={() => !saving && setSelected(null)}
          width={640}
        >
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <span style={{ ...pill, ...statusToneFor(selected.status) }}>{selected.status}</span>
              <span style={{ ...cardMeta }}>
                {selected.studentNumber} • {selected.program} • {selected.schoolYear}
              </span>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted)", marginBottom: 6 }}>
                Declared occupation
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Status</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{selected.employmentStatus}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Job title</span>
                <span style={{ fontSize: 13, textAlign: "right" }}>{selected.jobTitle || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Company</span>
                <span style={{ fontSize: 13, textAlign: "right" }}>{selected.company || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Industry</span>
                <span style={{ fontSize: 13, textAlign: "right" }}>{selected.industry || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "4px 0" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>Date started</span>
                <span style={{ fontSize: 13, textAlign: "right" }}>
                  {selected.dateStarted ? new Date(selected.dateStarted).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted)" }}>
                Proof documents
              </div>
              <ProofImage path={selected.certificatePath} label="Certificate of Employment" />
              <ProofImage path={selected.workIdPath} label="Work ID" />
            </div>

            {selected.status !== "Pending" && (
              <div style={{ ...cardMeta, marginBottom: 12 }}>
                Reviewed by {selected.reviewedByAdminName || "—"}
                {selected.reviewedAt ? ` on ${new Date(selected.reviewedAt).toLocaleDateString()}` : ""}
                {selected.reviewNote ? ` — ${selected.reviewNote}` : ""}
              </div>
            )}

            {selected.status === "Pending" && (
              <>
                <Field label="Note to alumnus" hint="Required when rejecting. Optional when approving.">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="e.g. The certificate is unreadable — please re-upload a clearer photo."
                    style={{ ...textInput, resize: "vertical", fontFamily: "inherit" }}
                  />
                </Field>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" style={btn} onClick={() => setSelected(null)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" style={btnDanger} onClick={() => handleReview("Rejected")} disabled={saving}>
                    <XCircle size={15} /> Reject
                  </button>
                  <button type="button" style={btnPrimary} onClick={() => handleReview("Approved")} disabled={saving}>
                    <Check size={15} /> {saving ? "Saving..." : "Approve"}
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
