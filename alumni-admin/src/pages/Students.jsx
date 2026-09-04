import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import { UserPlus, Pencil, Eye, KeyRound, FileText, RotateCcw, UserCheck, UserX } from "lucide-react";
import { API_BASE_URL } from "../config";
import { getStudents, importStudents, toggleStudentStatus, getStudentProfile, updateStudent, resetStudentPassword, createStudent } from "../services/studentsApi";
import ConfirmDialog from "../components/ConfirmDialog";
import { SearchBox, cardGrid, card, cardTitle, cardMeta, ModalShell, Field, textInput, selectStyle, btn, btnPrimary } from "../components/kit";
import { notifyError } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";

const FILE_ROOT = API_BASE_URL.replace("/api", "");
const emptyAddForm = { studentNumber: "", fullName: "", email: "", program: "", schoolYear: "1" };

const YEAR_OPTIONS = ["1", "2", "3", "4", "Graduate"];

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showImportModal, setShowImportModal] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");

  const [viewingProfile, setViewingProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", program: "", schoolYear: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [confirmResetId, setConfirmResetId] = useState(null);
  const [resetResult, setResetResult] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [savingAdd, setSavingAdd] = useState(false);

  function openAddModal() {
    setAddForm(emptyAddForm);
    setShowAddModal(true);
  }

  function closeAddModal() {
    setShowAddModal(false);
  }

  async function handleAddSave(e) {
    e.preventDefault();
    setSavingAdd(true);
    setError("");
    try {
      await createStudent(addForm);
      closeAddModal();
      loadStudents();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSavingAdd(false);
    }
  }

  async function loadStudents() {
    setLoading(true);
    setError("");
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  function openImportModal() {
    setImportResult(null);
    setShowImportModal(true);
  }

  function closeImportModal() {
    setShowImportModal(false);
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setImporting(true);
        setImportResult(null);
        try {
          const result = await importStudents(results.data);
          setImportResult({ success: true, message: `Imported successfully.`, detail: result });
          loadStudents();
        } catch (err) {
          setImportResult({ success: false, message: err.message });
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (err) => {
        setImportResult({ success: false, message: err.message });
      },
    });
  }

  async function handleToggleStatus(id) {
    try {
      await toggleStudentStatus(id);
      loadStudents();
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function openViewProfile(student) {
    setViewingProfile(null);
    setLoadingProfile(true);
    try {
      const data = await getStudentProfile(student.id);
      setViewingProfile({ student, ...data });
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoadingProfile(false);
    }
  }

  function openEditModal(student) {
    setEditingStudent(student);
    setEditForm({
      fullName: student.fullName || "",
      email: student.email || "",
      program: student.program || "",
      schoolYear: student.schoolYear || "",
    });
  }

  function closeEditModal() {
    setEditingStudent(null);
  }

  async function requestCloseEdit() {
    const changed =
      editForm.fullName !== editingStudent?.fullName ||
      editForm.email !== editingStudent?.email ||
      editForm.program !== editingStudent?.program ||
      editForm.schoolYear !== editingStudent?.schoolYear;
    if (changed && !(await askConfirm("You have unsaved changes. Discard them?"))) return;
    closeEditModal();
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setSavingEdit(true);
    setError("");
    try {
      await updateStudent(editingStudent.id, editForm);
      closeEditModal();
      loadStudents();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmResetPassword() {
    try {
      const result = await resetStudentPassword(confirmResetId);
      const student = students.find((s) => s.id === confirmResetId);
      setResetResult({ student, temporaryPassword: result.temporaryPassword });
    } catch (err) {
      notifyError(err.message);
    } finally {
      setConfirmResetId(null);
    }
  }

  const programOptions = useMemo(() => {
    const unique = new Set(students.map((s) => s.program).filter(Boolean));
    return Array.from(unique).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        !term ||
        s.studentNumber?.toLowerCase().includes(term) ||
        s.fullName?.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term);

      const matchesYear = !yearFilter || s.schoolYear === yearFilter;
      const matchesProgram = !programFilter || s.program === programFilter;

      return matchesSearch && matchesYear && matchesProgram;
    });
  }, [students, searchTerm, yearFilter, programFilter]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Students</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={openAddModal} style={btnPrimary}>
            <UserPlus size={15} />
            Add Student
          </button>
          <button onClick={openImportModal} style={btn}>+ Import CSV</button>
        </div>
      </div>

      <div style={{ margin: "16px 0", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox
          placeholder="Search by Student Number, Name, or Email"
          value={searchTerm}
          onChange={setSearchTerm}
          onReset={() => setSearchTerm("")}
        />

        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
          <option value="">All Years</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
          <option value="">All Programs</option>
          {programOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <button
          style={btn}
          onClick={() => {
            setSearchTerm("");
            setYearFilter("");
            setProgramFilter("");
          }}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {loading && <p>Loading students...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <>
          <p>{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found</p>
          <div style={cardGrid}>
            {filteredStudents.map((s) => (
              <div key={s.id} style={card}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {s.profilePicturePath ? (
                    <img
                      src={`${FILE_ROOT}/${s.profilePicturePath}`}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", background: "var(--surface-alt)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, color: "var(--primary)", flexShrink: 0,
                    }}>
                      {(s.fullName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h4 style={{ ...cardTitle, margin: 0 }}>{s.fullName}</h4>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>{s.studentNumber}</p>
                  </div>
                </div>
                <p style={{ ...cardMeta, margin: 0 }}>{s.email}</p>
                <p style={{ ...cardMeta, margin: 0 }}>{s.program} • {s.schoolYear}</p>
                <span
                  style={{
                    alignSelf: "flex-start", fontSize: 12, fontWeight: 600,
                    padding: "2px 10px", borderRadius: 999,
                    background: s.isActive ? "#e6f4ea" : "#fdecea",
                    color: s.isActive ? "#1e7e34" : "#c0392b",
                  }}
                >
                  {s.isActive ? "Active" : "Inactive"}
                </span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                  <button type="button" title="View" aria-label="View" style={{ ...btn, padding: "6px 9px" }} onClick={() => openViewProfile(s)}><Eye size={15} /></button>
                  <button type="button" title="Edit" aria-label="Edit" style={{ ...btn, padding: "6px 9px" }} onClick={() => openEditModal(s)}><Pencil size={15} /></button>
                  <button type="button" title="Reset password" aria-label="Reset password" style={{ ...btn, padding: "6px 9px" }} onClick={() => setConfirmResetId(s.id)}><KeyRound size={15} /></button>
                  <Link to={`/documents/${s.id}`} title="Documents" style={{ ...btn, padding: "6px 9px", textDecoration: "none" }}><FileText size={15} /></Link>
                  <button
                    type="button"
                    title={s.isActive ? "Deactivate" : "Activate"}
                    aria-label={s.isActive ? "Deactivate" : "Activate"}
                    style={{ ...btn, padding: "6px 9px", color: s.isActive ? "var(--danger)" : "var(--success)", borderColor: "var(--border)" }}
                    onClick={async () => {
                      if (await askConfirm(
                        `Are you sure you want to ${s.isActive ? "deactivate" : "activate"} ${s.fullName}?`,
                        { confirmLabel: s.isActive ? "Deactivate" : "Activate", danger: s.isActive }
                      )) {
                        handleToggleStatus(s.id);
                      }
                    }}
                  >
                    {s.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showImportModal && (
        <ModalShell title="Import Students (CSV)" onClose={closeImportModal} width={480}>
          <div>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileSelect}
              disabled={importing}
            />
            {importing && <p style={{ color: "var(--muted)" }}>Importing...</p>}
            {importResult && (
              <p style={{ color: importResult.success ? "var(--success)" : "var(--danger)" }}>
                {importResult.message}
              </p>
            )}
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
              Expected columns: StudentNumber, FullName, Email, Program, SchoolYear.
              Existing student numbers are updated; new ones are created with the
              student number as the default password.
            </p>
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button onClick={closeImportModal} style={btn}>Close</button>
            </div>
          </div>
        </ModalShell>
      )}

      {(loadingProfile || viewingProfile) && (
        <ModalShell
          title="Alumni Profile"
          onClose={() => setViewingProfile(null)}
          width={680}
        >
          {loadingProfile && <p style={{ color: "var(--muted)" }}>Loading profile...</p>}

          {viewingProfile && (() => {
            const { student, profile, jobPreferences } = viewingProfile;
            const row = (label, value) => (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "5px 0" }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>{label}</span>
                <span style={{ color: "var(--text)", fontSize: 13, textAlign: "right" }}>{value || "—"}</span>
              </div>
            );
            const section = (title, children) => (
              <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted)", marginBottom: 6 }}>
                  {title}
                </div>
                {children}
              </div>
            );

            return (
              <div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
                  {profile.profilePictureUrl ? (
                    <img
                      src={`${FILE_ROOT}/${profile.profilePictureUrl}`}
                      alt="Profile"
                      width={88}
                      height={88}
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{
                      width: 88, height: 88, borderRadius: "50%",
                      background: "var(--surface-alt)", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 32, fontWeight: "bold", color: "var(--primary)",
                    }}>
                      {(student.fullName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>{student.fullName}</h3>
                    <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: 13 }}>
                      {student.studentNumber} • {student.program} • {student.schoolYear}
                    </p>
                    <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{student.email}</p>
                  </div>
                  <span style={{
                    marginLeft: "auto", padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: student.isActive ? "var(--surface-alt)" : "var(--surface-alt)",
                    color: student.isActive ? "var(--success)" : "var(--danger)",
                  }}>
                    {student.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {section("About", (
                  <>
                    {row("Headline", profile.headline)}
                    {row("Bio", profile.bio)}
                    {row("Location", profile.location)}
                    {row("Phone", profile.phone)}
                    {row("LinkedIn", profile.linkedInUrl)}
                    {row("Address", profile.address)}
                    {row("Date of Birth", profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "")}
                    {row("Visible in directory", profile.showInDirectory ? "Yes" : "No")}
                    {row("Skills", (profile.skills || []).join(", "))}
                  </>
                ))}

                {section("Work Experience", (
                  (profile.workExperiences || []).length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>None</p>
                  ) : (
                    (profile.workExperiences || []).map((w) => (
                      <div key={w.id} style={{ marginBottom: 8 }}>
                        <div style={{ color: "var(--text)", fontSize: 14 }}>{w.jobTitle} — {w.company}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>{w.location || ""}</div>
                      </div>
                    ))
                  )
                ))}

                {section("Education", (
                  (profile.educations || []).length === 0 ? (
                    <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>None</p>
                  ) : (
                    (profile.educations || []).map((e) => (
                      <div key={e.id} style={{ marginBottom: 8 }}>
                        <div style={{ color: "var(--text)", fontSize: 14 }}>{e.degree} in {e.fieldOfStudy}</div>
                        <div style={{ color: "var(--muted)", fontSize: 12 }}>
                          {e.school} ({e.startYear || "?"} – {e.endYear || "present"})
                        </div>
                      </div>
                    ))
                  )
                ))}

                {section("Job Preferences", (
                  jobPreferences ? (
                    <>
                      {row("Preferred Job Title", jobPreferences.preferredJobTitle)}
                      {row("Preferred Industry", jobPreferences.preferredIndustry)}
                      {row("Preferred Location", jobPreferences.preferredLocation)}
                      {row("Open to work", jobPreferences.isOpenToWork ? "Yes" : "No")}
                    </>
                  ) : (
                    <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Not set</p>
                  )
                ))}
              </div>
            );
          })()}
        </ModalShell>
      )}

      {editingStudent && (
        <ModalShell title={`Edit Student — ${editingStudent.studentNumber}`} onClose={requestCloseEdit} width={480}>
          <form onSubmit={handleEditSave}>
            <Field label="Full Name">
              <input
                type="text"
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Program">
              <input
                type="text"
                value={editForm.program}
                onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="School Year">
              <select
                value={editForm.schoolYear}
                onChange={(e) => setEditForm({ ...editForm, schoolYear: e.target.value })}
                required
                style={selectStyle}
              >
                <option value="">Select...</option>
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </Field>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={requestCloseEdit} style={btn}>
                Cancel
              </button>
              <button type="submit" disabled={savingEdit} style={btnPrimary}>
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {showAddModal && (
        <ModalShell title="Add Student" onClose={closeAddModal} width={480}>
          <form onSubmit={handleAddSave}>
            <Field label="Student Number">
              <input
                type="text"
                value={addForm.studentNumber}
                onChange={(e) => setAddForm({ ...addForm, studentNumber: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Full Name">
              <input
                type="text"
                value={addForm.fullName}
                onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Program">
              <input
                type="text"
                value={addForm.program}
                onChange={(e) => setAddForm({ ...addForm, program: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="School Year">
              <select
                value={addForm.schoolYear}
                onChange={(e) => setAddForm({ ...addForm, schoolYear: e.target.value })}
                style={selectStyle}
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </Field>

            <p style={{ fontSize: 13, color: "#555", marginTop: 8 }}>
              Default password is the student number; they must change it on first login.
            </p>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={closeAddModal} style={btn}>
                Cancel
              </button>
              <button type="submit" disabled={savingAdd} style={btnPrimary}>
                {savingAdd ? "Saving..." : "Add Student"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {resetResult && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => setResetResult(null)}
        >
          <div
            style={{
              background: "var(--surface)", padding: 24, borderRadius: 10,
              maxWidth: 480, width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Temporary Password Issued</h3>
            <p>
              For <strong>{resetResult.student?.fullName}</strong> ({resetResult.student?.studentNumber}):
            </p>
            <p style={{
              fontSize: 20, fontFamily: "monospace",
              background: "#f4f4f4", padding: 12, textAlign: "center",
              userSelect: "all",
            }}>
              {resetResult.temporaryPassword}
            </p>
            <p style={{ fontSize: 13, color: "#555" }}>
              Relay this to the student. It is shown only once — they must
              change it on next login.
            </p>
            <button onClick={() => setResetResult(null)} style={btnPrimary}>Done</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        message={confirmResetId ? "Issue a new temporary password for this student? Their current password will stop working." : null}
        onConfirm={confirmResetPassword}
        onCancel={() => setConfirmResetId(null)}
      />
    </div>
  );
}