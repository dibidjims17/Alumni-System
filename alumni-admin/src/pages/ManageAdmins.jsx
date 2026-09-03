import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, UserX } from "lucide-react";
import { getAdmins, createAdmin, toggleAdminStatus, updateAdminRole } from "../services/adminApi";
import Toast from "../components/Toast";
import {
  ModalShell, Field, textInput, selectStyle,
  cardGrid, card, cardTitle, cardMeta, actionsRow, iconButton,
} from "../components/kit";

const emptyForm = { username: "", fullName: "", email: "", password: "", role: "Staff" };

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

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

  async function handleToggleStatus(id) {
    try {
      await toggleAdminStatus(id);
      setToast({ message: "Admin status updated.", type: "success" });
      loadAdmins();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    }
  }

  async function handleRoleChange(id, newRole) {
    try {
      await updateAdminRole(id, newRole);
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

  return (
    <div>
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Manage Admins</h2>
        <button onClick={openCreateModal}>+ Add Admin</button>
      </div>

      {loading ? (
        <p>Loading admins...</p>
      ) : (
        <div style={cardGrid}>
          {admins.map((a) => (
            <div key={a.id} style={card}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", background: "#eceaf6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, color: "#4a3b8f", flexShrink: 0,
                }}>
                  {avatarInitial(a)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h4 style={{ ...cardTitle, margin: 0 }}>{a.fullName}</h4>
                  <p style={{ ...cardMeta, margin: "2px 0 0" }}>@{a.username}</p>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: "2px 10px",
                  borderRadius: 999, whiteSpace: "nowrap", ...statusPillStyle(a.isActive),
                }}>
                  {a.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p style={{ ...cardMeta, margin: 0 }}>{a.email}</p>

              <div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, padding: "3px 10px",
                  borderRadius: 999, ...rolePillStyle(a.role),
                }}>
                  <ShieldCheck size={13} />
                  {a.role}
                </span>
              </div>

              <p style={{ ...cardMeta, margin: 0 }}>
                Last login: {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "Never"}
              </p>

              <div style={actionsRow}>
                <select
                  value={a.role}
                  onChange={(e) => handleRoleChange(a.id, e.target.value)}
                  title="Change role"
                  style={{ ...selectStyle, width: "auto", flex: 1, padding: "6px 8px", fontSize: 13 }}
                >
                  <option value="Staff">Staff</option>
                  <option value="SuperAdmin">SuperAdmin</option>
                </select>
                {iconButton(
                  a.isActive ? "Deactivate" : "Activate",
                  a.isActive ? UserX : UserCheck
                )(() => handleToggleStatus(a.id))}
              </div>
            </div>
          ))}
        </div>
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
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                style={textInput}
              />
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
              <button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Admin"}
              </button>
              <button type="button" onClick={closeModal}>
                Cancel
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
