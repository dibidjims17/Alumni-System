import { useEffect, useState } from "react";
import { getAdmins, createAdmin, toggleAdminStatus, updateAdminRole } from "../services/adminApi";
import Toast from "../components/Toast";

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
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.username}</td>
                <td>{a.fullName}</td>
                <td>{a.email}</td>
                <td>
                  <select value={a.role} onChange={(e) => handleRoleChange(a.id, e.target.value)}>
                    <option value="Staff">Staff</option>
                    <option value="SuperAdmin">SuperAdmin</option>
                  </select>
                </td>
                <td>{a.isActive ? "Active" : "Inactive"}</td>
                <td>{a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "Never"}</td>
                <td>
                  <button onClick={() => handleToggleStatus(a.id)}>
                    {a.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: "#fff", padding: 24, borderRadius: 8,
              maxWidth: 420, width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Add New Admin</h3>
              <button onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
              <div>
                <label>Username</label><br />
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <label>Full Name</label><br />
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <label>Email</label><br />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <label>Password</label><br />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ marginTop: 10 }}>
                <label>Role</label><br />
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={{ width: "100%" }}
                >
                  <option value="Staff">Staff</option>
                  <option value="SuperAdmin">SuperAdmin</option>
                </select>
              </div>

              <div style={{ marginTop: 16 }}>
                <button type="submit" disabled={saving}>
                  {saving ? "Creating..." : "Create Admin"}
                </button>
                <button type="button" onClick={closeModal} style={{ marginLeft: 8 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}