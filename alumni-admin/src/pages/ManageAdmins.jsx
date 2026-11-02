import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, UserCheck, UserX, Pencil, Camera, Plus } from "lucide-react";
import { getAdmins, createAdmin, toggleAdminStatus, updateAdminRole, updateAdminProfile, uploadAdminPicture } from "../services/adminApi";
import { getSession, patchSession } from "../services/api";
import { API_BASE_URL } from "../config";
import { notifyError, notifySuccess } from "../components/toastBus";
import {
  ModalShell, Field, textInput, selectStyle,
  cardGrid, card, cardTitle, cardMeta, actionsRow, iconButton,
  btn, btnPrimary, PasswordInput, statusTone, EmptyState, pageWrap,
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
      notifyError(err.message);
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
      notifySuccess("Admin created successfully.");
      loadAdmins();
    } catch (err) {
      notifyError(err.message);
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
      notifyError("You can't deactivate your own account.");
      return;
    }
    try {
      await toggleAdminStatus(admin.id);
      notifySuccess("Admin status updated.");
      loadAdmins();
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function handleRoleChange(admin, newRole) {
    if (isSelf(admin)) {
      notifyError("You can't change your own role.");
      return;
    }
    try {
      await updateAdminRole(admin.id, newRole);
      notifySuccess("Admin role updated.");
      loadAdmins();
    } catch (err) {
      notifyError(err.message);
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
      notifyError("Image size must not exceed 5MB.");
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
      notifySuccess("Profile updated.");
      closeEditModal();
      loadAdmins();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  function rolePillStyle(role) {
    return statusTone(role === "SuperAdmin" ? "violet" : "info");
  }

  function statusPillStyle(isActive) {
    return statusTone(isActive ? "success" : "danger");
  }

  function renderAdminCard(a, self) {
    return (
      <div
        key={a.id}
        style={{
          ...card,
          ...(self ? { outline: "2px solid var(--primary)", outlineOffset: -2 } : {}),
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
              width: 44, height: 44, borderRadius: "50%", background: "var(--violet-tint)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, color: "var(--violet)", flexShrink: 0,
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
            <p style={{ ...cardMeta, margin: 0 }}>
              This is your account — edit it in the{" "}
              <Link to="/profile" style={{ color: "var(--primary)", fontWeight: 600 }}>
                Profile tab
              </Link>
              . Role and status can only be changed by another SuperAdmin.
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
    <div style={pageWrap}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <button onClick={openCreateModal} style={btnPrimary}>
          <Plus size={15} /> Add Admin
        </button>
      </div>

      {loading ? (
        <GridSkeleton count={6} />
      ) : admins.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No admins yet" hint="Create the first admin account to get started." />
      ) : (
        <div style={cardGrid}>
          {selfAdmin && renderAdminCard(selfAdmin, true)}
          {otherAdmins.map((a) => renderAdminCard(a, false))}
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
              <button type="button" onClick={closeModal} style={btn}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={btnPrimary}>
                {saving ? "Creating..." : "Create Admin"}
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
                  width: 64, height: 64, borderRadius: "50%", background: "var(--violet-tint)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 22, color: "var(--violet)", flexShrink: 0,
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
              <button type="button" onClick={closeEditModal} style={btn}>
                Cancel
              </button>
              <button type="submit" disabled={editSaving} style={btnPrimary}>
                {editSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
