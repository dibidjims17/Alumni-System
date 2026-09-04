import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { School, LogIn, Sun, Moon } from "lucide-react";
import { loginAdmin, saveSession } from "../services/api";
import { useAdminTheme } from "../theme";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isDark, toggle } = useAdminTheme();

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    marginTop: 6,
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginAdmin(username, password);
      saveSession(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <button
        onClick={toggle}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position: "fixed", top: 18, right: 18,
          width: 38, height: 38, borderRadius: 10, cursor: "pointer",
          border: "1px solid var(--border)", background: "var(--surface)",
          color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div
        style={{
          width: 360,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "28px 26px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <School size={30} color="var(--primary)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "var(--text)" }}>Alumni System</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Admin Console</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: "var(--muted)" }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, color: "var(--muted)" }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
            />
          </div>

          {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: "4px 0" }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", marginTop: 12, padding: "11px 0",
              border: "none", borderRadius: 8, cursor: "pointer",
              background: "var(--primary)", color: "var(--on-primary)",
              fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <LogIn size={16} />
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
