import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { getSession, clearSession } from "../services/api";

const navItems = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/students", label: "Students" },
  { path: "/news", label: "News" },
  { path: "/jobs", label: "Jobs" },
  { path: "/activity-log", label: "Activity Log" },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 220,
          borderRight: "1px solid #ccc",
          padding: 20,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Alumni Admin</h3>
        <p style={{ fontSize: 13, color: "#555" }}>
          {session?.fullName} ({session?.role})
        </p>

        <nav style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  fontWeight: isActive ? "bold" : "normal",
                  textDecoration: isActive ? "underline" : "none",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={handleLogout} style={{ marginTop: "auto" }}>
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: 40 }}>
        <Outlet />
      </main>
    </div>
  );
}