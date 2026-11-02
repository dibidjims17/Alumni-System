import { useEffect, useState } from "react";
import { ShieldCheck, Pencil, Camera } from "lucide-react";
import { getMyProfile, updateMyProfile, uploadMyPicture } from "../services/adminApi";
import { patchSession } from "../services/api";
import { API_BASE_URL } from "../config";
import { notifyError, notifySuccess } from "../components/toastBus";
import {
  ModalShell, Field, textInput,
  card, cardTitle, cardMeta, actionsRow,
  btn, btnPrimary, statusTone, EmptyState, pageWrap,
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

function statusPillStyle(isActive) {
  return statusTone(isActive ? "success" : "danger");
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      notifyError(err.message);
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
      notifySuccess("Profile updated.");
      closeEditModal();
      loadProfile();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div style={pageWrap}>
      {loading ? (
        <GridSkeleton count={1} />
      ) : !profile ? (
        <EmptyState
          icon={ShieldCheck}
          title="Could not load your profile"
          hint="Check your connection and try again."
          action={<button type="button" onClick={loadProfile} style={btnPrimary}>Retry</button>}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ ...card, padding: 0, overflow: "hidden" }}>
            <div style={{
              position: "relative",
              height: 200,
              background: "linear-gradient(120deg, var(--primary-strong), var(--primary))",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", right: -60, top: -70,
                width: 240, height: 240, borderRadius: "50%",
                background: "var(--hero-ring)", pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", right: 90, bottom: -110,
                width: 200, height: 200, borderRadius: "50%",
                background: "var(--hero-ring-soft)", pointerEvents: "none",
              }} />
              <div style={{
                position: "absolute", right: 24, bottom: 12,
                fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
                color: "var(--hero-muted)", textAlign: "right",
              }}>
                REUNIO · ADMIN CONSOLE
              </div>
            </div>

            <div style={{ padding: "0 24px 20px" }}>
              <div style={{
                display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap",
                marginTop: -32, position: "relative", zIndex: 1,
              }}>
                {profilePictureUrl(profile.profilePicturePath) ? (
                  <img
                    src={profilePictureUrl(profile.profilePicturePath)}
                    alt=""
                    style={{
                      width: 120, height: 120, borderRadius: "50%", objectFit: "cover", flexShrink: 0,
                      border: "4px solid var(--surface)",
                      background: "var(--surface)",
                      boxShadow: "var(--shadow-md)",
                      position: "relative", zIndex: 2,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 120, height: 120, borderRadius: "50%",
                    background: "var(--primary)", color: "var(--on-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 46, flexShrink: 0,
                    border: "4px solid var(--surface)",
                    boxShadow: "var(--shadow-md)",
                    position: "relative", zIndex: 2,
                  }}>
                    {avatarInitial(profile)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 200, paddingBottom: 2, paddingTop: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{profile.fullName}</h4>
                  <p style={{ ...cardMeta, margin: "2px 0 0" }}>@{profile.username}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 12, fontWeight: 600, padding: "3px 10px",
                      borderRadius: 999, whiteSpace: "nowrap",
                      background: "var(--success-tint)", color: "var(--success)",
                    }}>
                      <ShieldCheck size={13} />
                      {profile.role}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "3px 10px",
                      borderRadius: 999, whiteSpace: "nowrap", ...statusPillStyle(profile.isActive),
                    }}>
                      {profile.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div style={{ paddingBottom: 2 }}>
                  <button type="button" onClick={openEditModal} style={btnPrimary}>
                    <Pencil size={15} />
                    Edit profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...card }}>
            <h4 style={{ ...cardTitle, margin: "0 0 12px", fontSize: 15 }}>About</h4>
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
                  width: 64, height: 64, borderRadius: "50%", background: "var(--violet-tint)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 22, color: "var(--violet)", flexShrink: 0,
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
