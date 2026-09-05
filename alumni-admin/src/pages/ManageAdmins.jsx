import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, UserX, Pencil, Camera } from "lucide-react";
import { getAdmins, createAdmin, toggleAdminStatus, updateAdminRole, updateAdminProfile, uploadAdminPicture } from "../services/adminApi";
import { getSession, patchSession } from "../services/api";
import { API_BASE_URL } from "../config";
import Toast from "../components/Toast";
import {
  ModalShell, Field, textInput, selectStyle,
  cardGrid, card, cardTitle, cardMeta, actionsRow, iconButton,
  btn, btnPrimary, PasswordInput,
} from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";

const emptyForm = { username: "", fullName: "", email: "", password: "", role: "Staff" };
const FILE_ROOT = API_BASE_URL.replace("/api", "");
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

export function adminPictureUrl(path) {
  if (!path) return null;
  const clean = String(path).replace(/\\/g, "/").replace(/^\/+/, "");
  return `${FILE_ROOT}/${clean}`;
}

export default function ManageAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [editingAdmin, setEditingAdmin] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

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

  function openEditModal(admin) {
    setEditingAdmin(admin);
    setEditName(admin.fullName || "");
    setEditEmail(admin.email || "");
    setEditFile(null);
    setEditPreview(adminPictureUrl(admin.profilePicturePath));
  }

  function closeEditModal() {
    if (editPreview && editPreview.startsWith("blob:")) {
      try { URL.revokeObjectURL(editPreview); } catch { }
    }
    setEditingAdmin(null);
    setEditFile(null);
    setEditPreview(null);
  }

  function handleEditFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_PICTURE_BYTES) {
      setToast({ message: "Image size must not exceed 5MB.", type: "error" });
      return;
    }
    if (editPreview && editPreview.startsWith("blob:")) {
      try { URL.revokeObjectURL(editPreview); } catch { }
    }
    setEditFile(file);
    setEditPreview(URL.createObjectURL(file));
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editingAdmin) return;
    setEditSaving(true);
    try {
      const updated = await updateAdminProfile(editingAdmin.id, {
        fullName: editName.trim(),
        email: editEmail.trim(),
      });
      let picturePath = updated.profilePicturePath || null;
      if (editFile) {
        const pic = await uploadAdminPicture(editingAdmin.id, editFile);
        picturePath = pic.profilePicturePath || picturePath;
      }
      // Keep the header + own-card in sync when editing yourself.
      if (isSelf(editingAdmin)) {
        patchSession({ fullName: updated.fullName, profilePicturePath: picturePath });
      }
      setToast({ message: "Profile updated.", type: "success" });
      closeEditModal();
      loadAdmins();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setEditSaving(false);
    }
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
          {adminPictureUrl(a.profilePicturePath) ? (
            <img
              src={adminPictureUrl(a.profilePicturePath)}
              alt=""
              style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: "#eceaf6",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, color: "#4a3b8f", flexShrink: 0,
            }}>
              {avatarInitial(a)}
            </div>
          )}
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
            <>
              <p style={{ ...cardMeta, margin: 0, flex: 1 }}>
                This is your account — role and status can only be changed by another SuperAdmin.
              </p>
              {iconButton("Edit profile", Pencil)(() => openEditModal(a))}
            </>
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
              {iconButton("Edit", Pencil)(() => openEditModal(a))}
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

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
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
              <PasswordInput
                value={form.password}
                onChange={(value) => setForm({ ...form, password: value })}
                autoComplete="new-password"
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

      {editingAdmin && (
        <ModalShell title={`Edit profile — ${editingAdmin.username}`} onClose={closeEditModal} width={460}>
          <form onSubmit={handleEditSave}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              {editPreview ? (
                <img
                  src={editPreview}
                  alt=""
                  style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 64, height: 64, borderRadius: "50%", background: "#eceaf6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 22, color: "#4a3b8f", flexShrink: 0,
                }}>
                  {avatarInitial(editingAdmin)}
                </div>
              )}
              <label style={{ ...btn, cursor: "pointer" }}>
                <Camera size={15} />
                {editPreview && !editPreview.startsWith("blob:") ? "Change photo" : "Upload photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
                  onChange={handleEditFile}
                  style={{ display: "none" }}
                />
              </label>
            </div>
            <Field label="Full Name">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                style={textInput}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
                style={textInput}
              />
            </Field>
            <div style={actionsRow}>
              <button type="submit" disabled={editSaving} style={btnPrimary}>
                {editSaving ? "Saving..." : "Save changes"}
              </button>
              <button type="button" onClick={closeEditModal} style={btn}>
                Cancel
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
