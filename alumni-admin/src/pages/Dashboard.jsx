import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  UserCheck,
  Newspaper,
  Briefcase,
  ArrowUpRight,
  FileText,
  RefreshCw,
} from "lucide-react";
import { getStudentStats } from "../services/studentsApi";
import { getNews } from "../services/newsApi";
import { getJobs } from "../services/jobsApi";
import { notifyError } from "../components/toastBus";
import { pageWrap } from "../components/kit";
import { Skeleton } from "../components/Skeleton";

// Fill-viewport dashboard: hero + stat row + bottom row share the available
// height (flex:1 on the bottom row) so it consumes the page without
// overflowing. Small screens stack and fall back to normal page scroll.
const statGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 16,
  width: "100%",
};

const bottomGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
  gap: 16,
  width: "100%",
  flex: 1,
  minHeight: 0,
  alignItems: "stretch",
};

function StatCard({ label, value, sub, Icon, accent, tint, loading }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "18px",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 10,
        boxShadow: "var(--stat-shadow)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: tint,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={accent} />
        </div>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 750,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            color: "var(--muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
      </div>
      {loading ? <Skeleton width={72} height={30} /> : (
        <div style={{ fontSize: 30, fontWeight: 780, lineHeight: 1, letterSpacing: -0.5 }}>{value}</div>
      )}
      <div
        style={{
          fontSize: 12.5,
          color: "var(--muted)",
          lineHeight: 1.4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {loading ? <Skeleton width="70%" height={12} /> : sub}
      </div>
    </div>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ height: 7, borderRadius: 999, background: "var(--surface-alt)", overflow: "hidden", width: "100%" }}>
      <div
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: "100%",
          borderRadius: 999,
          background: color,
          transition: "width 400ms ease",
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [newsCount, setNewsCount] = useState(null);
  const [activeJobsCount, setActiveJobsCount] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);

  async function load() {
    try {
      const [studentStats, news, jobs] = await Promise.all([
        getStudentStats(),
        getNews(),
        getJobs(),
      ]);
      setStats(studentStats);
      setNewsCount(news.length);
      setActiveJobsCount(jobs.filter((j) => j.isActive).length);
      setSyncedAt(new Date());
    } catch (err) {
      notifyError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const loading = !stats || newsCount === null || activeJobsCount === null;

  const derived = useMemo(() => {
    const total = stats?.totalStudents ?? 0;
    const grads = stats?.graduateStudents ?? 0;
    const active = stats?.activeStudents ?? 0;
    return {
      total,
      grads,
      active,
      gradPct: total ? Math.round((grads / total) * 100) : 0,
      activePct: total ? Math.round((active / total) * 100) : 0,
    };
  }, [stats]);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const quickLinks = [
    { to: "/students", label: "Students", desc: "Directory", Icon: Users },
    { to: "/documents", label: "Documents", desc: "Checklists", Icon: FileText },
    { to: "/news", label: "News", desc: "Publish", Icon: Newspaper },
    { to: "/jobs", label: "Jobs", desc: "Board", Icon: Briefcase },
  ];

  return (
    <div style={{ ...pageWrap, display: "flex", flexDirection: "column", gap: 18, height: "100%", minHeight: "calc(100vh - 190px)", flex: 1 }}>
      {/* Hero strip — this is what gives light mode its character */}
      <div
        style={{
          background: "linear-gradient(100deg, var(--hero-from) 0%, var(--hero-to) 100%)",
          borderRadius: 16,
          padding: "22px 26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          color: "var(--hero-text)",
          boxShadow: "var(--stat-shadow)",
          position: "relative",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -70,
            top: -70,
            width: 230,
            height: 230,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.09)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 60,
            bottom: -110,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            pointerEvents: "none",
          }}
        />
        <div style={{ minWidth: 0, position: "relative" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: "var(--hero-muted)" }}>
            {today}
          </div>
          <h2 style={{ margin: "4px 0 0", fontSize: 24, letterSpacing: -0.3, color: "var(--hero-text)" }}>
            Alumni at a glance
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--hero-muted)" }}>
            Students, content, and hiring health.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div className="dash-hero-total" style={{ textAlign: "right", lineHeight: 1.2 }}>
            {loading ? <Skeleton width={64} height={28} /> : (
              <div style={{ fontSize: 28, fontWeight: 800 }}>{derived.total}</div>
            )}
            <div style={{ fontSize: 11.5, color: "var(--hero-muted)" }}>total students</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              title="Re-fetch dashboard counts"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 12.5,
                fontWeight: 700,
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.24)",
                color: "var(--hero-text)",
                cursor: refreshing ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              {refreshing ? "Syncing…" : loading ? "Loading…" : "Refresh"}
            </button>
            <span style={{ fontSize: 11, color: "var(--hero-muted)" }}>
              {syncedAt ? `Synced ${syncedAt.toLocaleTimeString()}` : "Not synced yet"}
            </span>
          </div>
        </div>
      </div>

      <div className="dash-stat-grid" style={statGrid}>
        <StatCard label="Total" value={derived.total} sub="All records" Icon={Users} accent="var(--primary)" tint="var(--tile-bg)" loading={loading} />
        <StatCard label="Graduates" value={derived.grads} sub={`${derived.gradPct}% of total`} Icon={GraduationCap} accent="#2E7D32" tint="rgba(46,125,50,0.13)" loading={loading} />
        <StatCard label="Active" value={derived.active} sub={`${derived.activePct}% active`} Icon={UserCheck} accent="#1565C0" tint="rgba(21,101,192,0.12)" loading={loading} />
        <StatCard label="News" value={newsCount ?? 0} sub="Announcements" Icon={Newspaper} accent="#6A1B9A" tint="rgba(106,27,154,0.12)" loading={loading} />
        <StatCard label="Jobs" value={activeJobsCount ?? 0} sub="Open roles" Icon={Briefcase} accent="#EF6C00" tint="rgba(239,108,0,0.13)" loading={loading} />
      </div>

      <div className="dash-bottom-grid" style={bottomGrid}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "20px 22px",
            minWidth: 0,
            boxShadow: "var(--stat-shadow)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14.5 }}>Student mix</h3>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Graduates vs active</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ fontWeight: 650 }}>Graduates</span>
                {loading ? <Skeleton width={90} height={12} /> : (
                  <span style={{ color: "var(--muted)" }}>{`${derived.grads} (${derived.gradPct}%)`}</span>
                )}
              </div>
              <Bar pct={derived.gradPct} color="#2E7D32" />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ fontWeight: 650 }}>Active</span>
                {loading ? <Skeleton width={90} height={12} /> : (
                  <span style={{ color: "var(--muted)" }}>{`${derived.active} (${derived.activePct}%)`}</span>
                )}
              </div>
              <Bar pct={derived.activePct} color="#1565C0" />
            </div>
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "20px 22px",
            minWidth: 0,
            boxShadow: "var(--stat-shadow)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14.5 }}>Quick actions</h3>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Most-used workflows</span>
          </div>
          <div className="dash-quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
            {quickLinks.map(({ to, label, desc, Icon }) => (
              <Link
                key={to}
                to={to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 13px",
                  border: "1px solid var(--border)",
                  borderRadius: 11,
                  background: "var(--surface-alt)",
                  textDecoration: "none",
                  color: "var(--text)",
                  minWidth: 0,
                }}
              >
                <Icon size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
                  <span style={{ display: "block", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {label}
                  </span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>{desc}</span>
                </span>
                <ArrowUpRight size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .dash-stat-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .dash-bottom-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .dash-quick-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 640px) {
          .dash-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .dash-quick-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .dash-hero-total { display: none !important; }
        }
      `}</style>
    </div>
  );
}
