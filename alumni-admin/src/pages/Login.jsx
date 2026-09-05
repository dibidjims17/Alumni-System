import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { School, LogIn, Sun, Moon } from "lucide-react";
import { loginAdmin, saveSession, adminForgotPassword, adminResetPassword } from "../services/api";
import { PasswordInput, CodeInput } from "../components/kit";
import { useAdminTheme } from "../theme";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Recovery flow: "login" -> "forgot" (send code) -> "reset" (code + new password)
  const [mode, setMode] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [notice, setNotice] = useState("");
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

  function enterForgot() {
    setMode("forgot");
    setError("");
    setNotice("");
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
  }

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const data = await adminForgotPassword(resetEmail.trim());
      setNotice(data.message || "If that email is registered, a reset code has been sent.");
      setMode("reset");
    } catch (err) {
      setError(err.message || "Failed to send reset code");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (resetCode.trim().length !== 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await adminResetPassword(resetEmail.trim(), resetCode.trim(), newPassword);
      setMode("login");
      setPassword("");
      setNotice("Password reset successfully. You can now log in.");
    } catch (err) {
      setError(err.message || "Invalid or expired reset code");
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
          width: "min(360px, 100%)",
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

        {mode === "login" && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "var(--muted)" }}>Username or email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="e.g. jdelacruz or jdelacruz@school.edu"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "var(--muted)" }}>Password</label>
              <PasswordInput
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                style={inputStyle}
              />
            </div>

            {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: "4px 0" }}>{error}</p>}
            {notice && <p style={{ color: "var(--success)", fontSize: 13, margin: "4px 0" }}>{notice}</p>}

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

            <button
              type="button"
              onClick={enterForgot}
              style={{
                width: "100%", marginTop: 8, padding: "8px 0",
                border: "none", background: "none", cursor: "pointer",
                color: "var(--primary)", fontSize: 13, fontWeight: 600,
              }}
            >
              Forgot password?
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleSendCode}>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
              Enter your admin email and we'll send a 6-digit reset code (valid 15 minutes).
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "var(--muted)" }}>Admin email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                autoComplete="email"
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
                fontWeight: 600,
              }}
            >
              {loading ? "Sending..." : "Send reset code"}
            </button>

            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              style={{
                width: "100%", marginTop: 8, padding: "8px 0",
                border: "none", background: "none", cursor: "pointer",
                color: "var(--muted)", fontSize: 13, fontWeight: 600,
              }}
            >
              ← Back to login
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleReset}>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
              Code sent to <strong>{resetEmail}</strong>. Enter it below with your new password.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>6-digit code</label>
              <CodeInput value={resetCode} onChange={setResetCode} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, color: "var(--muted)" }}>New password</label>
              <PasswordInput
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
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
                fontWeight: 600,
              }}
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>

            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              style={{
                width: "100%", marginTop: 8, padding: "8px 0",
                border: "none", background: "none", cursor: "pointer",
                color: "var(--muted)", fontSize: 13, fontWeight: 600,
              }}
            >
              ← Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
