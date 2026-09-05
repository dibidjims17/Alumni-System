import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Newspaper, Briefcase, CalendarDays,
  UserCog, Trash2, Activity, LogOut, Moon, Sun, School, Menu,
} from "lucide-react";
import { getSession, clearSession } from "../services/api";
import { API_BASE_URL } from "../config";

const FILE_ROOT = API_BASE_URL.replace("/api", "");

function adminPhotoUrl(path) {
  if (!path) return null;
  const clean = String(path).replace(/\\/g, "/").replace(/^\/+/, "");
  return `${FILE_ROOT}/${clean}`;
}
import { useAdminTheme } from "../theme";
import ToastHost from "./ToastHost";
import DiscardHost from "./DiscardHost";
import ConfirmHost from "./ConfirmHost";
import { askConfirm } from "./confirmBus";

const SEGMENT_TITLES = {
  dashboard: "Dashboard",
  students: "Students",
  documents: "Documents",
  news: "News",
  jobs: "Jobs",
  events: "Events",
  "activity-log": "Activity Log",
  "manage-admins": "Manage Admins",
  trash: "Trash",
};

function titleFor(pathname) {
  const segment = pathname.split("/")[1];
  return (segment && SEGMENT_TITLES[segment]) || "Dashboard";
}

const GROUPS = [
  {
    label: "Overview",
    items: [
      { path: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    ],
  },
  {
    label: "Directory",
    items: [
      { path: "/students", label: "Students", Icon: Users },
      { path: "/documents", label: "Documents", Icon: FileText },
    ],
  },
  {
    label: "Content",
    items: [
      { path: "/news", label: "News", Icon: Newspaper },
      { path: "/jobs", label: "Jobs", Icon: Briefcase },
      { path: "/events", label: "Events", Icon: CalendarDays },
    ],
  },
];

const SUPER_ADMIN_GROUP = {
  label: "Administration",
  items: [
    { path: "/activity-log", label: "Activity Log", Icon: Activity },
    { path: "/manage-admins", label: "Manage Admins", Icon: UserCog },
    { path: "/trash", label: "Trash", Icon: Trash2 },
  ],
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const { isDark, toggle } = useAdminTheme();

  async function handleLogout() {
    if (!(await askConfirm("Are you sure you want to sign out?"))) return;
    clearSession();
    navigate("/login");
  }

  const isSuperAdmin = session?.role === "SuperAdmin";
  const groups = isSuperAdmin
    ? [...GROUPS, SUPER_ADMIN_GROUP]
    : GROUPS;

  // Responsive shell: under ~960px the sidebar becomes an overlay drawer
  // so half/quarter windows keep full content width; under ~600px the
  // header compacts (icon-only user block, tighter padding).
  const [vw, setVw] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  const [navOpen, setNavOpen] = useState(false);
  // Re-read the session (name/photo) after in-place profile edits.
  const [, setSessionVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setSessionVersion((v) => v + 1);
    window.addEventListener("admin-session-updated", refresh);
    return () => window.removeEventListener("admin-session-updated", refresh);
  }, []);
  const compact = vw < 960;
  const tiny = vw < 600;

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Close the drawer on navigation; never leave it stuck open.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  const navItemStyle = (isActive) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 12px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 13.5,
    fontWeight: isActive ? 600 : 500,
    color: isActive ? "var(--sidebar-active)" : "var(--sidebar-text)",
    background: isActive ? "var(--sidebar-item)" : "transparent",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <ToastHost />
      <DiscardHost />
      <ConfirmHost />
      {/* Sidebar — docked on wide screens, overlay drawer when compact */}
      {compact && navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 30,
            background: "rgba(0,0,0,0.45)",
          }}
        />
      )}
      <aside
        style={{
          width: 244,
          flexShrink: 0,
          background: "var(--sidebar)",
          color: "var(--sidebar-text)",
          display: "flex",
          flexDirection: "column",
          position: compact ? "fixed" : "sticky",
          top: 0,
          height: "100vh",
          zIndex: compact ? 40 : "auto",
          transform: compact && !navOpen ? "translateX(-105%)" : "none",
          transition: "transform 200ms ease",
          boxShadow: compact && navOpen ? "8px 0 32px rgba(0,0,0,0.35)" : "none",
        }}
      >
        <div style={{ padding: "20px 18px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <School size={24} color="var(--sidebar-active)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Reunio</div>
            <div style={{ fontSize: 11, color: "var(--sidebar-muted)" }}>Admin Console</div>
          </div>
        </div>

        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 12px" }}>
          {groups.map((group) => (
            <div key={group.label} style={{ marginBottom: 18 }}>
              <div style={{
                fontSize: 10.5, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: 1, color: "var(--sidebar-muted)",
                padding: "0 12px 6px",
              }}>
                {group.label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {group.items.map(({ path, label, Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    end={path === "/dashboard"}
                    style={({ isActive }) => navItemStyle(isActive || location.pathname.startsWith(path))}
                  >
                    <Icon size={17} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div style={{ padding: 12, borderTop: "1px solid var(--sidebar-border)" }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 12px", borderRadius: 8, cursor: "pointer",
              border: "none", background: "transparent",
              color: "var(--sidebar-muted)", fontSize: 13.5,
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12,
            padding: tiny ? "10px 12px" : compact ? "12px 16px" : "14px 28px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            position: "sticky", top: 0, zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {compact && (
              <button
                onClick={() => setNavOpen((v) => !v)}
                title="Open navigation"
                aria-label="Open navigation"
                style={{
                  width: 36, height: 36, borderRadius: 8, cursor: "pointer", flexShrink: 0,
                  border: "1px solid var(--border)", background: "var(--surface-alt)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text)",
                }}
              >
                <Menu size={18} />
              </button>
            )}
            <h1 style={{
              margin: 0, fontWeight: 800, letterSpacing: -0.3,
              fontSize: tiny ? 19 : 24,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {titleFor(location.pathname)}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: tiny ? 8 : 14, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {adminPhotoUrl(session?.profilePicturePath) ? (
                <img
                  src={adminPhotoUrl(session?.profilePicturePath)}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--primary)", color: "var(--on-primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14,
                }}>
                  {(session?.fullName || "A").charAt(0).toUpperCase()}
                </div>
              )}
              {!tiny && (
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{session?.fullName}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{session?.role}</div>
                </div>
              )}
            </div>

            <button
              onClick={toggle}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: 36, height: 36, borderRadius: 8, cursor: "pointer",
                border: "1px solid var(--border)", background: "var(--surface-alt)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text)",
              }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main style={{ flex: 1, padding: tiny ? 12 : compact ? 16 : 28, overflow: "auto", minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
