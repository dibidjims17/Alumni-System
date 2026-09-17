import { useEffect, useState } from "react";
import { ShieldCheck, Pencil, Camera } from "lucide-react";
import { getMyProfile, updateMyProfile, uploadMyPicture } from "../services/adminApi";
import { patchSession } from "../services/api";
import { API_BASE_URL } from "../config";
import Toast from "../components/Toast";
import {
  ModalShell, Field, textInput,
  card, cardTitle, cardMeta, actionsRow,
  btn, btnPrimary,
} from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";

const FILE_ROOT = API_BASE_URL.replace("/api", "");
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

function profilePictureUrl(path) {
  if (!path) return null;
  const clean = String(path).replace(/\\/g, "/").replace(/^\/+/, "");
  return `${FILE_ROOT}/${clean}`;
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

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [editPreview, setEditPreview] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  async function loadProfile() {
    setLoading(true);
    try {
      setProfile(await getMyProfile());
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function openEditModal() {
    if (!profile) return;
    setEditName(profile.fullName || "");
    setEditEmail(profile.email || "");
    setEditFile(null);
    setEditPreview(profilePictureUrl(profile.profilePicturePath));
    setShowEdit(true);
  }

  function closeEditModal() {
    if (editPreview && editPreview.startsWith("blob:")) {
      try { URL.revokeObjectURL(editPreview); } catch { }
    }
    setShowEdit(false);
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
    setEditSaving(true);
    try {
      const updated = await updateMyProfile({
        fullName: editName.trim(),
        email: editEmail.trim(),
      });
      let picturePath = updated.profilePicturePath || null;
      if (editFile) {
        const pic = await uploadMyPicture(editFile);
        picturePath = pic.profilePicturePath || picturePath;
      }
      // Keep the header in sync without forcing a re-login.
      patchSession({ fullName: updated.fullName, profilePicturePath: picturePath });
      setToast({ message: "Profile updated.", type: "success" });
      closeEditModal();
      loadProfile();
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div>
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      {loading ? (
        <GridSkeleton count={1} />
      ) : !profile ? (
        <p>Could not load your profile.</p>
      ) : (
        <div style={{ ...card, maxWidth: 560 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {profilePictureUrl(profile.profilePicturePath) ? (
              <img
                src={profilePictureUrl(profile.profilePicturePath)}
                alt=""
                style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#eceaf6",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 22, color: "#4a3b8f", flexShrink: 0,
              }}>
                {avatarInitial(profile)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h4 style={{ ...cardTitle, margin: 0, fontSize: 17 }}>{profile.fullName}</h4>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 12, fontWeight: 600, padding: "3px 10px",
                  borderRadius: 999, whiteSpace: "nowrap", ...rolePillStyle(profile.role),
                }}>
                  <ShieldCheck size={13} />
                  {profile.role}
                </span>
              </div>
              <p style={{ ...cardMeta, margin: 0 }}>@{profile.username}</p>
              <p style={{ ...cardMeta, margin: 0 }}>{profile.email}</p>
              <p style={{ ...cardMeta, margin: 0 }}>
                Last login: {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Never"}
              </p>
            </div>
            <span style={{
              marginLeft: "auto", flexShrink: 0,
              fontSize: 12, fontWeight: 600, padding: "2px 10px",
              borderRadius: 999, whiteSpace: "nowrap", ...statusPillStyle(profile.isActive),
            }}>
              {profile.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 12,
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <button type="button" onClick={openEditModal} style={btnPrimary}>
              <Pencil size={15} />
              Edit profile
            </button>
          </div>
        </div>
      )}

      {showEdit && (
        <ModalShell title="Edit your profile" onClose={closeEditModal} width={460}>
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
                  {avatarInitial({ fullName: editName, username: profile?.username })}
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
            <p style={{ ...cardMeta, margin: "0 0 12px" }}>
              Only you can change these — role and account status stay with a SuperAdmin.
            </p>
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
