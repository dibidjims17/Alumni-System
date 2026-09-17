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
        <div style={{ ...card, maxWidth: 640, padding: 0, overflow: "hidden" }}>
          <div style={{
            position: "relative",
            background: "linear-gradient(120deg, var(--primary-strong), var(--primary))",
            padding: "20px 20px 0",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", right: -60, top: -60,
              width: 200, height: 200, borderRadius: "50%",
              background: "rgba(255,255,255,0.09)", pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", right: 70, bottom: -90,
              width: 170, height: 170, borderRadius: "50%",
              background: "rgba(255,255,255,0.06)", pointerEvents: "none",
            }} />
            <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 14 }}>
              {profilePictureUrl(profile.profilePicturePath) ? (
                <img
                  src={profilePictureUrl(profile.profilePicturePath)}
                  alt=""
                  style={{
                    width: 88, height: 88, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                    border: "3px solid rgba(255,255,255,0.85)", marginBottom: -28,
                    background: "var(--surface)",
                  }}
                />
              ) : (
                <div style={{
                  width: 88, height: 88, borderRadius: "50%", background: "var(--surface)",
                  color: "var(--primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 34, flexShrink: 0,
                  border: "3px solid rgba(255,255,255,0.85)", marginBottom: -28,
                }}>
                  {avatarInitial(profile)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h4 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>{profile.fullName}</h4>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600, padding: "3px 10px",
                    borderRadius: 999, whiteSpace: "nowrap",
                    background: "rgba(255,255,255,0.16)", color: "#fff",
                  }}>
                    <ShieldCheck size={13} />
                    {profile.role}
                  </span>
                </div>
                <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.8)" }}>@{profile.username}</p>
              </div>
              <span style={{
                flexShrink: 0, marginBottom: 8,
                fontSize: 12, fontWeight: 600, padding: "2px 10px",
                borderRadius: 999, whiteSpace: "nowrap", ...statusPillStyle(profile.isActive),
                background: profile.isActive ? "#e6f4ea" : "#fdecea",
              }}>
                {profile.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <div style={{ padding: "40px 20px 16px" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px 20px",
            }}>
              {[
                ["Email", profile.email],
                ["Username", `@${profile.username}`],
                ["Role", profile.role],
                ["Member since", profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"],
                ["Last login", profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Never"],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: 0.6, color: "var(--muted)", marginBottom: 2,
                  }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, overflowWrap: "break-word" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: 12,
                marginTop: 16,
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
