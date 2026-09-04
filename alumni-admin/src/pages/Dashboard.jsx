import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  GraduationCap,
  UserCheck,
  Newspaper,
  Briefcase,
  ArrowRight,
  FileText,
} from "lucide-react";
import { getStudentStats } from "../services/studentsApi";
import { getNews } from "../services/newsApi";
import { getJobs } from "../services/jobsApi";
import { notifyError } from "../components/toastBus";
import { pageWrap } from "../components/kit";

const statGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
  gap: 16,
  width: "100%",
};

const panelGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
  gap: 16,
  marginTop: 16,
  width: "100%",
};

function StatCard({ label, value, sub, Icon, accent, loading }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "16px 18px",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 1px 2px rgba(16,24,20,0.06), 0 4px 14px rgba(16,24,20,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accent,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: "var(--surface-alt)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={19} color={accent} />
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 750, lineHeight: 1, letterSpacing: -0.5 }}>
        {loading ? "—" : value}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.4 }}>{loading ? "Loading…" : sub}</div>
    </div>
  );
}

function Bar({ pct, color }) {
  return (
    <div style={{ height: 8, borderRadius: 999, background: "var(--surface-alt)", overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", borderRadius: 999, background: color, transition: "width 400ms ease" }} />
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
    { to: "/students", label: "Manage students", desc: "Directory & accounts", Icon: Users },
    { to: "/documents", label: "Review documents", desc: "Checklists & releases", Icon: FileText },
    { to: "/news", label: "Publish news", desc: "Announcements", Icon: Newspaper },
    { to: "/jobs", label: "Manage jobs", desc: "Board & applicants", Icon: Briefcase },
  ];

  return (
    <div style={pageWrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: -0.3 }}>Dashboard</h2>
          <p style={{ margin: "6px 0 0", fontSize: 13.5, color: "var(--muted)" }}>
            {today} • At-a-glance health of students, content, and hiring.
          </p>
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 650,
            padding: "7px 12px",
            borderRadius: 999,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--muted)",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Syncing…" : "● Live"}
        </div>
      </div>

      <div style={{ ...statGrid, marginTop: 18 }}>
        <StatCard label="Total Students" value={derived.total} sub="All records in directory" Icon={Users} accent="var(--primary)" loading={loading} />
        <StatCard label="Graduate Alumni" value={derived.grads} sub={`${derived.gradPct}% of total students`} Icon={GraduationCap} accent="#2E7D32" loading={loading} />
        <StatCard label="Active Accounts" value={derived.active} sub={`${derived.activePct}% currently active`} Icon={UserCheck} accent="#1565C0" loading={loading} />
        <StatCard label="News Posts" value={newsCount ?? 0} sub="Published announcements" Icon={Newspaper} accent="#6A1B9A" loading={loading} />
        <StatCard label="Active Jobs" value={activeJobsCount ?? 0} sub="Open on the job board" Icon={Briefcase} accent="#EF6C00" loading={loading} />
      </div>

      <div style={panelGrid}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Student mix</h3>
          <p style={{ margin: "4px 0 16px", fontSize: 13, color: "var(--muted)" }}>Share of graduates and active accounts.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>Graduates</span>
                <span style={{ color: "var(--muted)" }}>{loading ? "—" : `${derived.grads} (${derived.gradPct}%)`}</span>
              </div>
              <Bar pct={derived.gradPct} color="#2E7D32" />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600 }}>Active accounts</span>
                <span style={{ color: "var(--muted)" }}>{loading ? "—" : `${derived.active} (${derived.activePct}%)`}</span>
              </div>
              <Bar pct={derived.activePct} color="#1565C0" />
            </div>
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Quick actions</h3>
          <p style={{ margin: "4px 0 12px", fontSize: 13, color: "var(--muted)" }}>Jump to the most-used workflows.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 10 }}>
            {quickLinks.map(({ to, label, desc, Icon }) => (
              <Link
                key={to}
                to={to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "11px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  background: "var(--surface-alt)",
                  textDecoration: "none",
                  color: "var(--text)",
                  minWidth: 0,
                }}
              >
                <Icon size={17} color="var(--primary)" style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13.5, fontWeight: 650, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{desc}</span>
                </span>
                <ArrowRight size={15} color="var(--muted)" style={{ flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
