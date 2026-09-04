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
} from "lucide-react";
import { getStudentStats } from "../services/studentsApi";
import { getNews } from "../services/newsApi";
import { getJobs } from "../services/jobsApi";
import { notifyError } from "../components/toastBus";
import { pageWrap } from "../components/kit";

// Compact, no-scroll dashboard: one hero strip + one stat row + one bottom
// row. Total vertical budget ≈ 480px so a standard viewport never scrolls;
// small screens fall back to normal page scroll via the Layout <main>.
const statGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 12,
  width: "100%",
};

const bottomGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
  gap: 12,
  width: "100%",
  minHeight: 0,
};

function StatCard({ label, value, sub, Icon, accent, tint, loading }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 13,
        padding: "12px 14px",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 7,
        boxShadow: "var(--stat-shadow)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: tint,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={16} color={accent} />
        </div>
        <div
          style={{
            fontSize: 11,
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
      <div style={{ fontSize: 25, fontWeight: 780, lineHeight: 1, letterSpacing: -0.5 }}>
        {loading ? "—" : value}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "var(--muted)",
          lineHeight: 1.3,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {loading ? "Loading…" : sub}
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

  useEffect(() => {
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
      } catch (err) {
        notifyError(err.message);
      }
    }
    load();
  }, []);

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
    <div style={{ ...pageWrap, display: "flex", flexDirection: "column", gap: 14, minHeight: 0 }}>
      {/* Hero strip — this is what gives light mode its character */}
      <div
        style={{
          background: "linear-gradient(100deg, var(--hero-from) 0%, var(--hero-to) 100%)",
          borderRadius: 16,
          padding: "16px 20px",
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
          <h2 style={{ margin: "3px 0 0", fontSize: 21, letterSpacing: -0.3, color: "var(--hero-text)" }}>
            Alumni at a glance
          </h2>
          <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--hero-muted)" }}>
            Students, content, and hiring health — no scrolling needed.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div className="dash-hero-total" style={{ textAlign: "right", lineHeight: 1.15 }}>

            <div style={{ fontSize: 24, fontWeight: 800 }}>{loading ? "—" : derived.total}</div>
            <div style={{ fontSize: 11, color: "var(--hero-muted)" }}>total students</div>
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "7px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "var(--hero-text)",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Syncing…" : "● Live"}
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
            padding: "14px 16px",
            minWidth: 0,
            boxShadow: "var(--stat-shadow)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 13.5 }}>Student mix</h3>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Graduates vs active</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 12 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ fontWeight: 650 }}>Graduates</span>
                <span style={{ color: "var(--muted)" }}>{loading ? "—" : `${derived.grads} (${derived.gradPct}%)`}</span>
              </div>
              <Bar pct={derived.gradPct} color="#2E7D32" />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                <span style={{ fontWeight: 650 }}>Active</span>
                <span style={{ color: "var(--muted)" }}>{loading ? "—" : `${derived.active} (${derived.activePct}%)`}</span>
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
            padding: "14px 16px",
            minWidth: 0,
            boxShadow: "var(--stat-shadow)",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 13.5 }}>Quick actions</h3>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Most-used workflows</span>
          </div>
          <div className="dash-quick-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, marginTop: 12 }}>
            {quickLinks.map(({ to, label, desc, Icon }) => (
              <Link
                key={to}
                to={to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  padding: "10px 11px",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
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
