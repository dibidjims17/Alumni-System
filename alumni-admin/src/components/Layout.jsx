import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, Newspaper, Briefcase, CalendarDays,
  UserCog, Trash2, Activity, LogOut, Moon, Sun, School,
} from "lucide-react";
import { getSession, clearSession } from "../services/api";
import { useAdminTheme } from "../theme";
import ToastHost from "./ToastHost";
import DiscardHost from "./DiscardHost";
import ConfirmHost from "./ConfirmHost";
import { askConfirm } from "./confirmBus";

const TITLES = {
  "/dashboard": "Dashboard",
  "/students": "Students",
  "/documents": "Documents",
  "/news": "News",
  "/jobs": "Jobs",
  "/events": "Events",
  "/activity-log": "Activity Log",
  "/manage-admins": "Manage Admins",
  "/trash": "Trash",
};

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

function titleFor(pathname) {
  // exact-ish match: longest known prefix
  let match = "/dashboard";
  Object.keys(TITLES).forEach((p) => {
    if (pathname.startsWith(p) && p.length >= match.length) match = p;
  });
  return TITLES[match];
}

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
      {/* Sidebar — always dark evergreen */}
      <aside
        style={{
          width: 244,
          flexShrink: 0,
          background: "var(--sidebar)",
          color: "var(--sidebar-text)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ padding: "20px 18px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <School size={24} color="var(--sidebar-active)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Alumni System</div>
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
            padding: "14px 28px",
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            position: "sticky", top: 0, zIndex: 10,
          }}
        >
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>{titleFor(location.pathname)}</h1>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--primary)", color: "var(--on-primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 14,
              }}>
                {(session?.fullName || "A").charAt(0).toUpperCase()}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{session?.fullName}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{session?.role}</div>
              </div>
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

        <main style={{ flex: 1, padding: 28, overflow: "auto" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
