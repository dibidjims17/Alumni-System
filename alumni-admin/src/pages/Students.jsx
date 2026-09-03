import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import { API_BASE_URL } from "../config";
import { getStudents, importStudents, toggleStudentStatus, getStudentProfile, updateStudent, resetStudentPassword } from "../services/studentsApi";
import { importDocuments } from "../services/documentsApi";
import ConfirmDialog from "../components/ConfirmDialog";

const FILE_ROOT = API_BASE_URL.replace("/api", "");

const YEAR_OPTIONS = ["1", "2", "3", "4", "Graduate"];

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showImportModal, setShowImportModal] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const [docImporting, setDocImporting] = useState(false);
  const [docImportResult, setDocImportResult] = useState(null);
  const docFileInputRef = useRef(null);

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

  async function loadStudents() {
    setLoading(true);
    setError("");
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, []);

  function openImportModal() {
    setImportResult(null);
    setDocImportResult(null);
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

  function handleDocFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setDocImporting(true);
        setDocImportResult(null);
        try {
          const result = await importDocuments(results.data);
          setDocImportResult({ success: true, message: "Documents imported successfully.", detail: result });
        } catch (err) {
          setDocImportResult({ success: false, message: err.message });
        } finally {
          setDocImporting(false);
          if (docFileInputRef.current) docFileInputRef.current.value = "";
        }
      },
      error: (err) => {
        setDocImportResult({ success: false, message: err.message });
      },
    });
  }

  async function handleToggleStatus(id) {
    try {
      await toggleStudentStatus(id);
      loadStudents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function openViewProfile(student) {
    setViewingProfile(null);
    setLoadingProfile(true);
    try {
      const data = await getStudentProfile(student.id);
      setViewingProfile({ student, ...data });
    } catch (err) {
      setError(err.message);
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

  async function handleEditSave(e) {
    e.preventDefault();
    setSavingEdit(true);
    setError("");
    try {
      await updateStudent(editingStudent.id, editForm);
      closeEditModal();
      loadStudents();
    } catch (err) {
      setError(err.message);
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
      setError(err.message);
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
        <button onClick={openImportModal}>+ Import CSV</button>
      </div>

      <div style={{ margin: "16px 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by Student Number, Name, or Email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: 280 }}
        />

        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          <option value="">All Years</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All Programs</option>
          {programOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearchTerm("");
            setYearFilter("");
            setProgramFilter("");
          }}
        >
          Reset Filters
        </button>
      </div>

      {loading && <p>Loading students...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <>
          <p>{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found</p>
          <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>Student Number</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Program</th>
                <th>Year</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => (
                <tr key={s.id}>
                  <td>{s.studentNumber}</td>
                  <td>{s.fullName}</td>
                  <td>{s.email}</td>
                  <td>{s.program}</td>
                  <td>{s.schoolYear}</td>
                  <td>{s.isActive ? "Active" : "Inactive"}</td>
                  <td>
                    <button onClick={() => openViewProfile(s)}>View</button>{" "}
                    <button onClick={() => openEditModal(s)}>Edit</button>{" "}
                    <button onClick={() => setConfirmResetId(s.id)}>Reset PW</button>{" "}
                    <Link to={`/students/${s.id}/documents`}>Documents</Link>{" "}
                    <button onClick={() => handleToggleStatus(s.id)}>
                      {s.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {showImportModal && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={closeImportModal}
        >
          <div
            style={{
              background: "#fff", padding: 24, borderRadius: 8,
              maxWidth: 500, width: "90%", maxHeight: "85vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Import CSV</h3>
              <button onClick={closeImportModal}>✕</button>
            </div>

            <div style={{ marginTop: 20 }}>
              <p><strong>Import Students</strong></p>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={importing}
              />
              {importing && <p>Importing...</p>}
              {importResult && (
                <p style={{ color: importResult.success ? "green" : "red" }}>
                  {importResult.message}
                </p>
              )}
            </div>

            <hr style={{ margin: "20px 0" }} />

            <div>
              <p><strong>Import Document Statuses</strong></p>
              <input
                type="file"
                accept=".csv"
                ref={docFileInputRef}
                onChange={handleDocFileSelect}
                disabled={docImporting}
              />
              {docImporting && <p>Importing documents...</p>}
              {docImportResult && (
                <p style={{ color: docImportResult.success ? "green" : "red" }}>
                  {docImportResult.message}
                </p>
              )}
            </div>

            <div style={{ marginTop: 20 }}>
              <button onClick={closeImportModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {(loadingProfile || viewingProfile) && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => { if (!loadingProfile) setViewingProfile(null); }}
        >
          <div
            style={{
              background: "#fff", padding: 24, borderRadius: 8,
              maxWidth: 640, width: "92%", maxHeight: "85vh", overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Alumni Profile</h3>
              <button onClick={() => setViewingProfile(null)} disabled={loadingProfile}>✕</button>
            </div>

            {loadingProfile && <p>Loading profile...</p>}

            {viewingProfile && (() => {
              const { student, profile, jobPreferences } = viewingProfile;
              return (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    {profile.profilePictureUrl ? (
                      <img
                        src={`${FILE_ROOT}/${profile.profilePictureUrl}`}
                        alt="Profile"
                        width={96}
                        height={96}
                        style={{ borderRadius: "50%", objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: 96, height: 96, borderRadius: "50%",
                        background: "#ddd", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        fontSize: 32, fontWeight: "bold", color: "#555",
                      }}>
                        {(student.fullName || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 style={{ margin: "0 0 4px" }}>{student.fullName}</h4>
                      <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
                        {student.studentNumber} • {student.program} • {student.schoolYear}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
                        {student.email} • {student.isActive ? "Active" : "Inactive"}
                      </p>
                      {profile.headline && <p><em>{profile.headline}</em></p>}
                    </div>
                  </div>

                  <hr style={{ margin: "16px 0" }} />

                  <p><strong>Bio:</strong> {profile.bio || "—"}</p>
                  <p><strong>Location:</strong> {profile.location || "—"}</p>
                  <p><strong>Phone:</strong> {profile.phone || "—"}</p>
                  <p><strong>LinkedIn:</strong> {profile.linkedInUrl || "—"}</p>
                  <p><strong>Address:</strong> {profile.address || "—"}</p>
                  <p><strong>Date of Birth:</strong> {profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "—"}</p>
                  <p><strong>Visible in directory:</strong> {profile.showInDirectory ? "Yes" : "No"}</p>

                  <p><strong>Skills:</strong> {(profile.skills || []).join(", ") || "—"}</p>

                  <p><strong>Work Experience:</strong></p>
                  {(profile.workExperiences || []).length === 0 && <p>—</p>}
                  <ul>
                    {(profile.workExperiences || []).map((w) => (
                      <li key={w.id}>{w.jobTitle} — {w.company} ({w.location || "—"})</li>
                    ))}
                  </ul>

                  <p><strong>Education:</strong></p>
                  {(profile.educations || []).length === 0 && <p>—</p>}
                  <ul>
                    {(profile.educations || []).map((e) => (
                      <li key={e.id}>{e.degree} in {e.fieldOfStudy} — {e.school} ({e.startYear || "?"}–{e.endYear || "present"})</li>
                    ))}
                  </ul>

                  <p><strong>Job Preferences:</strong> {jobPreferences
                    ? `${jobPreferences.preferredJobTitle || "—"} / ${jobPreferences.preferredIndustry || "—"} / ${jobPreferences.preferredLocation || "—"} (Open to work: ${jobPreferences.isOpenToWork ? "Yes" : "No"})`
                    : "Not set"}</p>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {editingStudent && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.5)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={closeEditModal}
        >
          <div
            style={{
              background: "#fff", padding: 24, borderRadius: 8,
              maxWidth: 480, width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Edit Student — {editingStudent.studentNumber}</h3>
              <button onClick={closeEditModal}>✕</button>
            </div>

            <form onSubmit={handleEditSave} style={{ marginTop: 16 }}>
              <div>
                <label>Full Name</label><br />
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Email</label><br />
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Program</label><br />
                <input
                  type="text"
                  value={editForm.program}
                  onChange={(e) => setEditForm({ ...editForm, program: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>School Year</label><br />
                <select
                  value={editForm.schoolYear}
                  onChange={(e) => setEditForm({ ...editForm, schoolYear: e.target.value })}
                  required
                  style={{ width: "100%" }}
                >
                  <option value="">Select...</option>
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 16 }}>
                <button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button type="button" onClick={closeEditModal} style={{ marginLeft: 8 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
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
              background: "#fff", padding: 24, borderRadius: 8,
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
            <button onClick={() => setResetResult(null)}>Done</button>
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