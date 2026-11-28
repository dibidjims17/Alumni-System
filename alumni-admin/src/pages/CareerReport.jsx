import { useEffect, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  Download,
  FileSpreadsheet,
  RotateCcw,
  Users,
  XCircle,
} from "lucide-react";
import {
  getCareerReport,
  exportCareerReportCsv,
} from "../services/careersApi";
import {
  pageWrap,
  pageHeader,
  card,
  cardTitle,
  cardMeta,
  pill,
  statusTone,
  EmptyState,
  btn,
  textInput,
  StatCard,
  CompactStat,
  Bar,
} from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError, notifySuccess } from "../components/toastBus";

// Month-scoped career report (SuperAdmin) — the registrar deliverable:
// submissions received in a chosen month, the review workload for that
// month, distributions over those submissions, and the rows themselves.
// Mirrors the Tracer report page: same stats/panels/table layout, but
// scoped by a month picker instead of server-side paging.

// Themed table cells — copied from Events.jsx attendeeTh/attendeeTd (the
// raw table style broke in dark mode once; these read CSS variables).
const th = {
  background: "var(--surface-alt)",
  color: "var(--text)",
  textAlign: "left",
  fontWeight: 650,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
};

const td = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
  color: "var(--text)",
  verticalAlign: "top",
};

const statGrid = {
  display: "flex",
  flexWrap: "wrap",
  gap: 16,
  marginTop: 20,
  marginBottom: 16,
};

const panelGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  gap: 16,
  marginBottom: 16,
};

function pctOf(count, whole) {
  return whole > 0 ? Math.round((count / whole) * 100) : 0;
}

function sum(items) {
  return items.reduce((total, item) => total + item.count, 0);
}

// Card holding a titled list of Bar rows (distributions).
function Panel({ title, hint, children }) {
  return (
    <section style={card}>
      <div>
        <h3 style={{ ...cardTitle, margin: 0 }}>{title}</h3>
        {hint && <p style={{ ...cardMeta, margin: "4px 0 0" }}>{hint}</p>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </section>
  );
}

function DistRow({ label, count, pct, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 12.5,
        }}
      >
        <span
          title={label}
          style={{
            color: "var(--text)",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span style={{ color: "var(--muted)", flexShrink: 0, fontWeight: 650 }}>
          {count} · {pct}%
        </span>
      </div>
      <Bar pct={pct} color={color} />
    </div>
  );
}

function statusPill(status) {
  if (status === "Approved") return statusTone("success");
  if (status === "Rejected") return statusTone("danger");
  return statusTone("warning");
}

function alignmentPill(alignment) {
  if (alignment === "Aligned") return statusTone("success");
  if (alignment === "Related") return statusTone("info");
  if (alignment === "Not Aligned") return statusTone("danger");
  if (alignment === "Unassessed") return statusTone("warning");
  return statusTone("violet");
}

// Local month value ("YYYY-MM") for <input type="month"> — built from the
// local date so the picker never lands on the wrong month near midnight.
function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function CareerReport() {
  const [monthValue, setMonthValue] = useState(currentMonth);
  const [report, setReport] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  // Re-triggers the load for the Retry button (same pattern as the
  // Tracer statsTick).
  const [tick, setTick] = useState(0);

  const [year, month] = monthValue.split("-").map(Number);

  // Load on every month change. cancelled guards against a slow response
  // for an earlier month overwriting a newer selection (same pattern as
  // the Tracer stats effect).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setReport(null);
      setError(null);
      try {
        const data = await getCareerReport(year, month);
        if (cancelled) return;
        setReport(data);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        notifyError(err.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year, month, tick]);

  async function handleExport() {
    setExporting(true);
    try {
      await exportCareerReportCsv(year, month);
      notifySuccess("Career report exported.");
    } catch (err) {
      notifyError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const submitted = report?.submitted ?? 0;
  const employmentSum = sum(report?.byEmployment ?? []);
  const alignmentSum = sum(report?.byAlignment ?? []);
  const programSum = sum(report?.byProgram ?? []);

  return (
    <div style={pageWrap}>
      <div style={{ ...pageHeader, margin: "20px 0 8px" }}>
        <p
          style={{
            margin: 0,
            color: "var(--muted)",
            fontSize: 13.5,
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Career submissions received in the selected month — review outcomes,
          employment and program alignment for those submissions. Exports the
          month as CSV for the school.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: "var(--muted)",
              fontWeight: 600,
            }}
          >
            Month
            <input
              type="month"
              value={monthValue}
              onChange={(e) => e.target.value && setMonthValue(e.target.value)}
              style={{ ...textInput, width: "auto" }}
            />
          </label>
          <button type="button" style={btn} onClick={handleExport} disabled={exporting || !report}>
            <Download size={15} />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {error ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="Couldn't load the career report"
          hint={error}
          action={
            <button
              type="button"
              style={btn}
              onClick={() => setTick((t) => t + 1)}
            >
              <RotateCcw size={14} />
              Retry
            </button>
          }
        />
      ) : report === null ? (
        <GridSkeleton count={6} />
      ) : (
        <>
          <div style={statGrid}>
            <CompactStat
              label="Pending"
              value={report.pending}
              Icon={Clock3}
              accent="var(--warning)"
            />
            <CompactStat
              label="Approved"
              value={report.approved}
              Icon={BadgeCheck}
              accent="var(--success)"
            />
            <CompactStat
              label="Rejected"
              value={report.rejected}
              Icon={XCircle}
              accent="var(--danger)"
            />
            <CompactStat
              label="Submitted"
              value={report.submitted}
              Icon={Users}
              accent="var(--primary)"
            />
            <CompactStat
              label="Reviewed"
              value={report.reviewedThisMonth}
              Icon={Clock3}
              accent="var(--gold)"
            />
          </div>

          {submitted > 0 && (
            <div style={panelGrid}>
              <Panel
                title="Employment status"
                hint={`Among ${submitted} submission${submitted === 1 ? "" : "s"} this month`}
              >
                {report.byEmployment.map((item) => (
                  <DistRow
                    key={item.label}
                    label={item.label}
                    count={item.count}
                    pct={pctOf(item.count, employmentSum)}
                    color="var(--primary)"
                  />
                ))}
              </Panel>

              <Panel
                title="Program alignment"
                hint={`Confirmed on approval — ${report.byAlignment.reduce(
                  (n, i) => (i.label === "Unassessed" ? n : n + i.count),
                  0
                )} of ${submitted} assessed`}
              >
                {report.byAlignment.map((item) => (
                  <DistRow
                    key={item.label}
                    label={item.label}
                    count={item.count}
                    pct={pctOf(item.count, alignmentSum)}
                    color="var(--gold)"
                  />
                ))}
              </Panel>

              <Panel
                title="Programs represented"
                hint={`${programSum} submission${programSum === 1 ? "" : "s"} this month`}
              >
                {report.byProgram.map((item) => (
                  <DistRow
                    key={item.label}
                    label={item.label}
                    count={item.count}
                    pct={pctOf(item.count, programSum)}
                    color="var(--success)"
                  />
                ))}
              </Panel>
            </div>
          )}

          {report.rows.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={`No submissions in ${report.monthLabel}`}
              hint="Alumni submissions appear here once they upload proof of occupation in that month."
            />
          ) : (
            <>
              <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 8px" }}>
                {report.rows.length} submission{report.rows.length === 1 ? "" : "s"} in{" "}
                {report.monthLabel}
              </p>

              <div style={{ overflowX: "auto", margin: "0 -4px", padding: "0 4px" }}>
                <table
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                    minWidth: 940,
                    border: "1px solid var(--border)",
                    fontSize: 13,
                    color: "var(--text)",
                  }}
                >
                  <thead>
                    <tr>
                      <th scope="col" style={th}>Alumnus</th>
                      <th scope="col" style={th}>Alumni #</th>
                      <th scope="col" style={th}>Program</th>
                      <th scope="col" style={th}>Occupation</th>
                      <th scope="col" style={th}>Alignment</th>
                      <th scope="col" style={th}>Status</th>
                      <th scope="col" style={th}>Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r) => (
                      <tr key={r.id}>
                        <td style={td}>
                          <div style={{ fontWeight: 650 }}>{r.studentName}</div>
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {r.schoolYear}
                          </div>
                        </td>
                        <td style={td}>{r.studentNumber}</td>
                        <td style={td}>{r.program || "—"}</td>
                        <td style={td}>
                          <strong>{r.employmentStatus}</strong>
                          {r.jobTitle && (
                            <div style={{ fontSize: 12, color: "var(--muted)" }}>
                              {r.jobTitle}
                              {r.company ? `, ${r.company}` : ""}
                            </div>
                          )}
                        </td>
                        <td style={td}>
                          <span
                            style={{
                              ...pill,
                              ...alignmentPill(r.courseAlignment || "Unassessed"),
                            }}
                          >
                            {r.courseAlignment || "Unassessed"}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ ...pill, ...statusPill(r.status) }}>
                            {r.status}
                          </span>
                        </td>
                        <td style={td}>
                          {new Date(r.createdAt).toLocaleDateString()}
                          <div style={{ fontSize: 12, color: "var(--muted)" }}>
                            {new Date(r.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p style={{ fontSize: 12, color: "var(--muted)", margin: "12px 0 0" }}>
            Submissions are counted by the date they were received (UTC).
            Employment and alignment cover this month's submissions; alignment is
            confirmed when the registrar approves a record.
          </p>
        </>
      )}
    </div>
  );
}
