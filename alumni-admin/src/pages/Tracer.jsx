import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Briefcase,
  ClipboardList,
  Download,
  GraduationCap,
  RotateCcw,
  ThumbsUp,
  Users,
  Wrench,
} from "lucide-react";
import {
  getTracerResponses,
  getTracerStats,
  exportTracerCsv,
} from "../services/tracerApi";
import {
  pageWrap,
  pageHeader,
  card,
  cardTitle,
  cardMeta,
  pill,
  statusTone,
  SearchBox,
  ToneSelect,
  EmptyState,
  btn,
  StatCard,
  CompactStat,
  Bar,
} from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError, notifySuccess } from "../components/toastBus";

// P3 — Graduate Tracer Study reports (SuperAdmin + Staff read-only).
// Stats cover submitted responses only; the table shows every row with
// server-side paging and filters. Distributions come from the API as
// ordered {label,count} lists (questionnaire order, zeros omitted).

const PAGE_SIZE = 10;

// Filter placeholders are real ToneSelect options (it renders `value`
// verbatim), so the "All …" choice is mapped back to an empty query param.
const ANY_STATUS = "All statuses";
const ANY_EMPLOYMENT = "All employment";
const ANY_RELATEDNESS = "All relatedness";
const ANY_PROGRAM = "All programs";

// Questionnaire option sets — fixed by the paper form (mirror the API).
const STATUS_OPTIONS = [ANY_STATUS, "Submitted", "Draft"];
const EMPLOYMENT_OPTIONS = [
  ANY_EMPLOYMENT,
  "Employed (Full-time)",
  "Employed (Part-time / Contractual)",
  "Self-Employed / Freelance",
  "Unemployed (Looking for work)",
  "Unemployed (Not looking)",
  "Currently Studying",
];
const RELATEDNESS_OPTIONS = [
  ANY_RELATEDNESS,
  "Highly Related",
  "Related",
  "Somewhat Related",
  "NOT Related",
];

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

const panelGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  gap: 16,
  marginBottom: 16,
};

const distRow = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const distLabelRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
  fontSize: 12.5,
};

function pctOf(count, whole) {
  return whole > 0 ? Math.round((count / whole) * 100) : 0;
}

function sum(items) {
  return items.reduce((total, item) => total + item.count, 0);
}

// Stat subtitles print raw counts ("1 respondent", "2 respondents"), so the
// noun needs its singular form whenever the count is 1.
function plural(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

// Card holding a titled list of Bar rows (distribution / funnel / skills).
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
    <div style={distRow}>
      <div style={distLabelRow}>
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

export default function Tracer() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(null);

  const [rows, setRows] = useState(null); // null = loading
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [rowsError, setRowsError] = useState(null);

  const [exporting, setExporting] = useState(false);

  // Search is committed on Enter (SearchBox onSubmit) so typing does not
  // refetch on every keystroke.
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(ANY_STATUS);
  const [employmentFilter, setEmploymentFilter] = useState(ANY_EMPLOYMENT);
  const [relatednessFilter, setRelatednessFilter] = useState(ANY_RELATEDNESS);
  const [programFilter, setProgramFilter] = useState(ANY_PROGRAM);

  const filters = useMemo(
    () => ({
      search: appliedSearch.trim(),
      status: statusFilter === ANY_STATUS ? "" : statusFilter,
      employment: employmentFilter === ANY_EMPLOYMENT ? "" : employmentFilter,
      relatedness:
        relatednessFilter === ANY_RELATEDNESS ? "" : relatednessFilter,
      program: programFilter === ANY_PROGRAM ? "" : programFilter,
    }),
    [appliedSearch, statusFilter, employmentFilter, relatednessFilter, programFilter]
  );

  const hasActiveFilters = useMemo(
    () =>
      !!filters.search ||
      !!filters.status ||
      !!filters.employment ||
      !!filters.relatedness ||
      !!filters.program,
    [filters]
  );

  // Stats load: nested async fn inside the effect (same pattern as the
  // rows effect) so setState happens after await, not synchronously in the
  // effect body. statsTick re-triggers the load for the Retry button.
  const [statsTick, setStatsTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStatsError(null);
      try {
        const data = await getTracerStats();
        if (cancelled) return;
        setStats(data);
      } catch (err) {
        if (cancelled) return;
        setStatsError(err.message);
        notifyError(err.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [statsTick]);

  // Rows: server-side paging + filters. cancelled guards against a slow
  // response overwriting a newer filter selection.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setRows(null);
      setRowsError(null);
      try {
        const data = await getTracerResponses(page, filters);
        if (cancelled) return;
        setRows(data.items);
        setTotal(data.total);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setRowsError(err.message);
        notifyError(err.message);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [page, filters]);

  // Every filter change restarts at page 1 (batched with the filter state).
  function resetPage() {
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setAppliedSearch("");
    setStatusFilter(ANY_STATUS);
    setEmploymentFilter(ANY_EMPLOYMENT);
    setRelatednessFilter(ANY_RELATEDNESS);
    setProgramFilter(ANY_PROGRAM);
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportTracerCsv();
      notifySuccess("Tracer responses exported.");
    } catch (err) {
      notifyError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const programOptions = useMemo(
    () => [ANY_PROGRAM, ...(stats?.programs || [])],
    [stats]
  );

  // Derived card values (submitted-only denominators).
  const submitted = stats?.submitted ?? 0;
  const employedPct = pctOf(stats?.employedCount ?? 0, submitted);
  const relatedPct = pctOf(
    stats?.courseRelatedCount ?? 0,
    stats?.relatednessAnswers ?? 0
  );
  const satisfiedPct = pctOf(stats?.satisfiedYes ?? 0, submitted);
  const topSalary = stats?.salary?.length
    ? stats.salary.reduce((best, item) => (item.count > best.count ? item : best))
    : null;
  const topSkill = stats?.topSkills?.[0] ?? null;
  const salarySum = sum(stats?.salary ?? []);
  const relatednessSum = sum(stats?.relatedness ?? []);
  const employmentSum = sum(stats?.employment ?? []);
  const skillSum = sum(stats?.topSkills ?? []);
  const draftSum = sum(stats?.draftsByStep ?? []);

  return (
    <div style={pageWrap}>
      <div style={{ ...pageHeader, margin: "16px 0 4px" }}>
        <p
          style={{
            margin: 0,
            color: "var(--muted)",
            fontSize: 13.5,
            maxWidth: 560,
            lineHeight: 1.5,
          }}
        >
          Participation and outcomes for the Graduate Tracer Study —
          submitted responses only. Exports every response as CSV for the
          school.
        </p>
        <button style={btn} onClick={handleExport} disabled={exporting}>
          <Download size={15} />
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      {statsError ? (
        <EmptyState
          icon={ClipboardList}
          title="Couldn't load tracer stats"
          hint={statsError}
          action={
            <button style={btn} onClick={() => setStatsTick((t) => t + 1)}>
              <RotateCcw size={14} />
              Retry
            </button>
          }
        />
      ) : (
        <>
          <div className="tracer-stat-grid">
            <CompactStat
              label="Employed"
              value={stats ? `${employedPct}%` : "—"}
              Icon={Briefcase}
              accent="var(--success)"
              loading={!stats}
            />
            <CompactStat
              label="Program-related"
              value={stats ? `${relatedPct}%` : "—"}
              Icon={GraduationCap}
              accent="var(--success)"
              loading={!stats}
            />
            <CompactStat
              label="Response rate"
              value={stats ? `${stats.responseRate}%` : "—"}
              Icon={Users}
              accent="var(--primary)"
              loading={!stats}
            />
            <CompactStat
              label="Satisfied"
              value={stats ? `${satisfiedPct}%` : "—"}
              Icon={ThumbsUp}
              accent="var(--primary)"
              loading={!stats}
            />
            <CompactStat
              label="Top salary"
              value={topSalary ? topSalary.label : stats ? "—" : ""}
              Icon={Banknote}
              accent="var(--warning)"
              loading={!stats}
            />
            <CompactStat
              label="Top skill"
              value={topSkill ? topSkill.label : stats ? "—" : ""}
              Icon={ThumbsUp}
              accent="var(--primary)"
              loading={!stats}
            />
          </div>

          {stats && submitted > 0 && (
            <div style={panelGrid}>
              <Panel
                title="Employment status"
                hint={`Among ${plural(submitted, "submitted response")}`}
              >
                {stats.employment.map((item) => (
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
                title="Program relatedness"
                hint={`${stats.relatednessAnswers} answered this question`}
              >
                {stats.relatedness.map((item) => (
                  <DistRow
                    key={item.label}
                    label={item.label}
                    count={item.count}
                    pct={pctOf(item.count, relatednessSum)}
                    color="var(--gold)"
                  />
                ))}
              </Panel>

              <Panel
                title="Monthly salary"
                hint={`${plural(salarySum, "employed respondent")}`}
              >
                {stats.salary.map((item) => (
                  <DistRow
                    key={item.label}
                    label={item.label}
                    count={item.count}
                    pct={pctOf(item.count, salarySum)}
                    color="var(--primary)"
                  />
                ))}
              </Panel>
            </div>
          )}

          {stats && (stats.drafts > 0 || stats.topSkills.length > 0) && (
            <div style={panelGrid}>
              {stats.drafts > 0 && (
                <Panel
                  title={`Drafts in progress (${stats.drafts})`}
                  hint="Where interrupted respondents stopped"
                >
                  {stats.draftsByStep.map((item) => (
                    <DistRow
                      key={item.label}
                      label={item.label}
                      count={item.count}
                      pct={pctOf(item.count, draftSum)}
                      color="var(--warning)"
                    />
                  ))}
                </Panel>
              )}

              {stats.topSkills.length > 0 && (
                <Panel
                  title="Skills used at work"
                  hint="Multi-select — what graduates actually apply"
                >
                  {stats.topSkills.map((item) => (
                    <DistRow
                      key={item.label}
                      label={item.label}
                      count={item.count}
                      pct={pctOf(item.count, skillSum)}
                      color="var(--gold)"
                    />
                  ))}
                </Panel>
              )}
            </div>
          )}
        </>
      )}

      {/* Filters */}
      <div
        style={{
          margin: "20px 0 16px",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <SearchBox
          placeholder="Search name, alumni #, or email"
          value={search}
          onChange={setSearch}
          onSubmit={() => {
            setAppliedSearch(search);
            resetPage();
          }}
          onReset={() => {
            setSearch("");
            setAppliedSearch("");
            resetPage();
          }}
        />
        <ToneSelect
          label="Filter by status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={(value) => {
            setStatusFilter(value);
            resetPage();
          }}
        />
        <ToneSelect
          label="Filter by employment"
          value={employmentFilter}
          options={EMPLOYMENT_OPTIONS}
          onChange={(value) => {
            setEmploymentFilter(value);
            resetPage();
          }}
        />
        <ToneSelect
          label="Filter by program relatedness"
          value={relatednessFilter}
          options={RELATEDNESS_OPTIONS}
          onChange={(value) => {
            setRelatednessFilter(value);
            resetPage();
          }}
        />
        <ToneSelect
          label="Filter by program"
          value={programFilter}
          options={programOptions}
          onChange={(value) => {
            setProgramFilter(value);
            resetPage();
          }}
        />
        <button style={btn} onClick={resetFilters}>
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* Responses table */}
      {rows === null ? (
        <GridSkeleton count={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={total === 0 && !hasActiveFilters ? "No responses yet" : "No matching responses"}
          hint={
            total === 0 && !hasActiveFilters
              ? "Responses appear here as graduates complete the questionnaire."
              : "Try different filters or clear the search."
          }
          action={
            hasActiveFilters ? (
              <button style={btn} onClick={resetFilters}>
                <RotateCcw size={14} />
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 8px" }}>
            {total} response{total === 1 ? "" : "s"} found
            {rowsError ? ` (last refresh failed: ${rowsError})` : ""}
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
                  <th scope="col" style={th}>Graduate</th>
                  <th scope="col" style={th}>Alumni #</th>
                  <th scope="col" style={th}>Program</th>
                  <th scope="col" style={th}>Employment</th>
                  <th scope="col" style={th}>Relatedness</th>
                  <th scope="col" style={th}>Status</th>
                  <th scope="col" style={th}>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 650 }}>{r.fullName}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {r.email}
                      </div>
                    </td>
                    <td style={td}>{r.studentNumber}</td>
                    <td style={td}>{r.program}</td>
                    <td style={td}>
                      {r.employmentStatus || "—"}
                      {r.companyName && (
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>
                          {r.position
                            ? `${r.position}, ${r.companyName}`
                            : r.companyName}
                        </div>
                      )}
                    </td>
                    <td style={td}>{r.courseRelatedness || "—"}</td>
                    <td style={td}>
                      <span
                        style={{
                          ...pill,
                          ...(r.status === "Submitted"
                            ? statusTone("success")
                            : statusTone("warning")),
                        }}
                      >
                        {r.status === "Submitted"
                          ? "Submitted"
                          : `Draft · Step ${r.currentStep}`}
                      </span>
                    </td>
                    <td style={td}>
                      {r.submittedAt
                        ? new Date(r.submittedAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ marginTop: 16 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={btn}
              >
                ← Previous
              </button>{" "}
              <span style={{ margin: "0 10px" }}>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={btn}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Stat-card grid lives here (not inline) because the 3-column desktop
          rule needs a media query — inline styles can't express one. 3
          fixed columns keep the sixth card in a tidy 3x2 at every desktop
          width; auto-fit keeps narrow panes 2-up. */}
      <style>{`
        .tracer-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
          gap: 16px;
          margin-top: 20px;
          margin-bottom: 16px;
        }
        @media (min-width: 900px) {
          .tracer-stat-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
