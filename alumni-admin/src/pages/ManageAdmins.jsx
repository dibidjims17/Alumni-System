import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, UserX, Eye, EyeOff } from "lucide-react";
import { getAdmins, createAdmin, toggleAdminStatus, updateAdminRole } from "../services/adminApi";
import { getSession } from "../services/api";
import Toast from "../components/Toast";
import {
  ModalShell, Field, textInput, selectStyle,
  cardGrid, card, cardTitle, cardMeta, actionsRow, iconButton,
  btn, btnPrimary,
} from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";

const emptyForm = { username: "", fullName: "", email: "", password: "", role: "Staff" };

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showFormPassword, setShowFormPassword] = useState(false);

  async function loadAdmins() {
    setLoading(true);
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
  }, []);

  function openCreateModal() {
    setForm(emptyForm);
    setShowFormPassword(false);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await createAdmin(form);
      closeModal();
      setToast({ message: "Admin created successfully.", type: "success" });
      loadAdmins();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // Own account is matched by username — the session carries no admin id.
  const session = getSession();
  const isSelf = (a) => !!session && a.username === session.username;
  const selfAdmin = admins.find(isSelf) || null;
  const otherAdmins = admins.filter((a) => !isSelf(a));

  async function handleToggleStatus(admin) {
    if (isSelf(admin)) {
      setToast({ message: "You can't deactivate your own account.", type: "error" });
      return;
    }
    try {
      await toggleAdminStatus(admin.id);
      setToast({ message: "Admin status updated.", type: "success" });
      loadAdmins();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  }

  async function handleRoleChange(admin, newRole) {
    if (isSelf(admin)) {
      setToast({ message: "You can't change your own role.", type: "error" });
      return;
    }
    try {
      await updateAdminRole(admin.id, newRole);
      setToast({ message: "Admin role updated.", type: "success" });
      loadAdmins();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  }

  function avatarInitial(admin) {
    return (admin.fullName || admin.username || "?").charAt(0).toUpperCase();
  }

  function rolePillStyle(role) {
    return role === "SuperAdmin"
      ? { background: "#ede7f6", color: "#5e35b1" }
      : { background: "#e3f2fd", color: "#1565c0" };
  }

  function statusPillStyle(isActive) {
    return isActive
      ? { background: "#e6f4ea", color: "#1e7e34" }
      : { background: "#fdecea", color: "#c0392b" };
  }

  function renderAdminCard(a, self) {
    return (
      <div
        key={a.id}
        style={{
          ...card,
          ...(self ? { outline: "2px solid var(--primary)", outlineOffset: -2, maxWidth: 560 } : {}),
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", background: "#eceaf6",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, color: "#4a3b8f", flexShrink: 0,
          }}>
            {avatarInitial(a)}
          </div>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h4 style={{ ...cardTitle, margin: 0 }}>{a.fullName}</h4>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 12, fontWeight: 600, padding: "3px 10px",
                borderRadius: 999, whiteSpace: "nowrap", ...rolePillStyle(a.role),
              }}>
                <ShieldCheck size={13} />
                {a.role}
              </span>
              {self && (
                <span style={{
                  fontSize: 12, fontWeight: 700, padding: "3px 10px",
                  borderRadius: 999, whiteSpace: "nowrap",
                  background: "var(--primary)", color: "var(--on-primary)",
                }}>
                  You
                </span>
              )}
            </div>
            <p style={{ ...cardMeta, margin: 0 }}>@{a.username}</p>
            <p style={{ ...cardMeta, margin: 0 }}>{a.email}</p>
            <p style={{ ...cardMeta, margin: 0 }}>
              Last login: {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "Never"}
            </p>
          </div>
          <span style={{
            marginLeft: "auto", flexShrink: 0,
            fontSize: 12, fontWeight: 600, padding: "2px 10px",
            borderRadius: 999, whiteSpace: "nowrap", ...statusPillStyle(a.isActive),
          }}>
            {a.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 12,
            marginTop: 8,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {self ? (
            <p style={{ ...cardMeta, margin: 0 }}>
              This is your account — role and status can only be changed by another SuperAdmin.
            </p>
          ) : (
            <>
              <select
                value={a.role}
                onChange={(e) => handleRoleChange(a, e.target.value)}
                title="Change role"
                style={{ ...selectStyle, width: "auto", flex: 1, padding: "6px 8px", fontSize: 13 }}
              >
                <option value="Staff">Staff</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </select>
              {iconButton(
                a.isActive ? "Deactivate" : "Activate",
                a.isActive ? UserX : UserCheck
              )(() => handleToggleStatus(a))}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Manage Admins</h2>
        <button onClick={openCreateModal} style={btnPrimary}>+ Add Admin</button>
      </div>

      {loading ? (
        <GridSkeleton count={6} />
      ) : (
        <>
          {selfAdmin && (
            <>
              <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)", margin: "16px 0 4px" }}>
                Your profile
              </h3>
              {renderAdminCard(selfAdmin, true)}
            </>
          )}
          <h3 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6, color: "var(--muted)", margin: "20px 0 4px" }}>
            Other admins{otherAdmins.length > 0 ? ` (${otherAdmins.length})` : ""}
          </h3>
          {otherAdmins.length === 0 ? (
            <p style={{ ...cardMeta }}>No other admins.</p>
          ) : (
            <div style={cardGrid}>
              {otherAdmins.map((a) => renderAdminCard(a, false))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <ModalShell title="Add New Admin" onClose={closeModal} width={520}>
          <form onSubmit={handleSubmit}>
            <Field label="Username">
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                style={textInput}
              />
            </Field>
            <Field label="Full Name">
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                style={textInput}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                style={textInput}
              />
            </Field>
            <Field label="Password">
              <div style={{ position: "relative" }}>
                <input
                  type={showFormPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="new-password"
                  style={{ ...textInput, paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword((v) => !v)}
                  title={showFormPassword ? "Hide password" : "Show password"}
                  aria-label={showFormPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute", right: 6, top: "50%",
                    transform: "translateY(-50%)",
                    border: "none", background: "none", cursor: "pointer",
                    display: "flex", color: "var(--muted)", padding: 4,
                  }}
                >
                  {showFormPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </Field>
            <Field label="Role">
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={selectStyle}
              >
                <option value="Staff">Staff</option>
                <option value="SuperAdmin">SuperAdmin</option>
              </select>
            </Field>

            <div style={actionsRow}>
              <button type="submit" disabled={saving} style={btnPrimary}>
                {saving ? "Creating..." : "Create Admin"}
              </button>
              <button type="button" onClick={closeModal} style={btn}>
                Cancel
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
