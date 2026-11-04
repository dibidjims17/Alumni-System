import { useEffect, useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import { UserPlus, Pencil, Eye, KeyRound, FileText, RotateCcw, UserCheck, UserX, Upload, Send, Users, Search, BriefcaseBusiness, BadgeCheck, Clock3, CircleAlert, BellRing, CheckCircle2 } from "lucide-react";
import { API_BASE_URL } from "../config";
import { getStudents, importStudents, toggleStudentStatus, getStudentProfile, updateStudent, resetStudentPassword, createStudent, sendInvite, getYearChangeRequests, reviewYearChangeRequest } from "../services/studentsApi";
import { SearchBox, cardGrid, card, cardTitle, cardMeta, pill, statusTone, ModalShell, Field, textInput, selectStyle, btn, btnPrimary, btnDanger, toolbar, filterRow, EmptyState, pageWrap } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError, notifySuccess } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";
import KebabMenu from "../components/KebabMenu";
import { sendCareerReminder } from "../services/careersApi";

const FILE_ROOT = API_BASE_URL.replace("/api", "");
const emptyAddForm = { studentNumber: "", fullName: "", email: "", program: "", schoolYear: "Graduate" };

const YEAR_OPTIONS = ["Graduate", "4"];

function careerReviewTone(status) {
  if (status === "Approved") return statusTone("success");
  if (status === "Rejected") return statusTone("danger");
  return statusTone("warning");
}

function alignmentTone(alignment) {
  if (alignment === "Aligned") return statusTone("success");
  if (alignment === "Related") return statusTone("info");
  if (alignment === "Not Aligned") return statusTone("danger");
  return statusTone("violet");
}

function careerHeadline(career) {
  if (!career) return "No career details submitted";
  if (career.jobTitle && career.company) return `${career.jobTitle} at ${career.company}`;
  if (career.jobTitle) return career.jobTitle;
  return career.employmentStatus;
}

function careerDescription(career, schoolYear) {
  if (!career && schoolYear !== "Graduate") return "Career tracking becomes available after graduation.";
  if (!career) return "Employment status has not been added yet.";
  if (career.reviewStatus === "Pending") return "Career proof is awaiting admin review.";
  if (career.reviewStatus === "Rejected") return "Career proof needs correction and resubmission.";
  if (career.courseAlignment) return `${career.courseAlignment} with the graduate program.`;
  return "Career information is verified.";
}

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showImportModal, setShowImportModal] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "", "active", "inactive", "unclaimed"
  const [sendingCareerReminderId, setSendingCareerReminderId] = useState(null);
  const [remindedCareerIds, setRemindedCareerIds] = useState([]);

  const [viewingProfile, setViewingProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: "", email: "", program: "", schoolYear: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const [resetResult, setResetResult] = useState(null);

  const [yearRequests, setYearRequests] = useState([]);

  async function loadYearRequests() {
    try {
      setYearRequests(await getYearChangeRequests("Pending"));
    } catch {
      // Queue is auxiliary — never block the directory on it.
    }
  }

  async function handleReviewYearRequest(req, approve) {
    const ok = await askConfirm(
      `${approve ? "Approve" : "Decline"} year change for ${req.studentName} (${req.studentNumber}): ${req.currentSchoolYear} → ${req.requestedSchoolYear}?` +
      (approve && req.requestedSchoolYear === "Graduate" ? " Documents will initialize and an invite email will be sent." : ""),
      { confirmLabel: approve ? "Approve" : "Decline", danger: !approve }
    );
    if (!ok) return;
    try {
      const res = await reviewYearChangeRequest(req.id, approve);
      notifySuccess(res.message || (approve ? "Request approved." : "Request declined."));
      loadYearRequests();
      loadStudents();
    } catch (err) {
      notifyError(err.message);
    }
  }

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
    try {
      const created = await createStudent(addForm);
      closeAddModal();
      loadStudents();
      setResetResult({
        student: { fullName: created.fullName, studentNumber: created.studentNumber },
        temporaryPassword: created.temporaryPassword,
        inviteEmailSent: created.inviteEmailSent,
      });
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSavingAdd(false);
    }
  }

  async function loadStudents() {
    setLoading(true);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadYearRequests();
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
          const summary = `Imported ${result.imported ?? 0}, updated ${result.skipped ?? 0}, ` +
            `${result.errors ?? 0} errors, ${result.emailsSent ?? 0} invites sent.`;
          setImportResult({ success: true, message: summary, detail: result });
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

  async function confirmResetPassword(student) {
    const ok = await askConfirm(
      `Issue a new temporary password for ${student.fullName} (${student.studentNumber})? Their current password will stop working.`,
      { confirmLabel: "Reset password", danger: true }
    );
    if (!ok) return;
    try {
      const result = await resetStudentPassword(student.id);
      setResetResult({ student, temporaryPassword: result.temporaryPassword });
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function confirmSendInvite(student) {
    const ok = await askConfirm(
      `Send the app invite + a fresh temporary password to ${student.fullName} (${student.email})?`,
      { confirmLabel: "Send invite" }
    );
    if (!ok) return;

    try {
      const result = await sendInvite(student.id);
      notifySuccess(result.message || "Invite sent.");
      setResetResult({
        student: { fullName: student.fullName, studentNumber: student.studentNumber },
        temporaryPassword: result.temporaryPassword,
        inviteEmailSent: true,
      });
    } catch (err) {
      notifyError(err.message);
      if (err.temporaryPassword) {
        setResetResult({
          student: { fullName: student.fullName, studentNumber: student.studentNumber },
          temporaryPassword: err.temporaryPassword,
          inviteEmailSent: false,
        });
      }
    }
  }

  async function confirmToggleStatus(student) {
    const action = student.isActive ? "deactivate" : "activate";
    const ok = await askConfirm(
      `Are you sure you want to ${action} ${student.fullName}?`,
      { confirmLabel: student.isActive ? "Deactivate" : "Activate", danger: student.isActive }
    );
    if (ok) await handleToggleStatus(student.id);
  }

  async function confirmCareerReminder(student) {
    const needsResubmission = student.career?.reviewStatus === "Rejected";
    const ok = await askConfirm(
      needsResubmission
        ? `Remind ${student.fullName} to review the rejection note and resubmit their career proof?`
        : `Remind ${student.fullName} to report their employment status and upload career proof?`,
      { confirmLabel: "Send reminder" }
    );
    if (!ok) return;

    setSendingCareerReminderId(student.id);
    try {
      const result = await sendCareerReminder(student.id);
      notifySuccess(result.message || "Career reminder sent.");
      setRemindedCareerIds((current) => [...current, student.id]);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSendingCareerReminderId(null);
    }
  }

  function careerReminderAlreadySent(student) {
    return student.careerReminderActive || remindedCareerIds.includes(student.id);
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
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && s.isActive) ||
        (statusFilter === "inactive" && !s.isActive) ||
        (statusFilter === "unclaimed" && !s.isClaimed);

      return matchesSearch && matchesYear && matchesProgram && matchesStatus;
    });
  }, [students, searchTerm, yearFilter, programFilter, statusFilter]);

  return (
    <div style={pageWrap}>
      <div style={{ ...toolbar, justifyContent: "flex-end" }}>
        <button onClick={openAddModal} style={btnPrimary}>
          <UserPlus size={15} />
          Add Alumni
        </button>
        <button onClick={openImportModal} style={btn}>
          <Upload size={15} />
          Import CSV
        </button>
      </div>

      <div style={filterRow}>
        <SearchBox
          placeholder="Search by alumni number, name, or email"
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

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="unclaimed">Unclaimed</option>
        </select>

        <button
          style={btn}
          onClick={() => {
            setSearchTerm("");
            setYearFilter("");
            setProgramFilter("");
            setStatusFilter("");
          }}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {yearRequests.length > 0 && (
        <div style={{ ...card, borderLeft: "4px solid var(--warning)", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h4 style={{ ...cardTitle, margin: 0 }}>
              Year correction requests ({yearRequests.length})
            </h4>
            <span style={{ ...pill, ...statusTone("warning") }}>
              Needs review
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {yearRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
                  borderTop: "1px solid var(--border)", paddingTop: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                    {req.studentName}{" "}
                    <span style={{ ...cardMeta, fontWeight: 400 }}>({req.studentNumber})</span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    {req.currentSchoolYear} → <strong>{req.requestedSchoolYear}</strong>
                  </div>
                  <div style={{ ...cardMeta, marginTop: 2 }}>
                    “{req.reason}” • {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ""}
                  </div>
                </div>
                <button
                  type="button"
                  style={{ ...btnPrimary, padding: "6px 12px" }}
                  onClick={() => handleReviewYearRequest(req, true)}
                >
                  Approve
                </button>
                <button
                  type="button"
                  style={{ ...btnDanger, padding: "6px 12px" }}
                  onClick={() => handleReviewYearRequest(req, false)}
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <GridSkeleton count={8} />}

      {!loading && filteredStudents.length === 0 && (
        <EmptyState
          icon={students.length === 0 ? Users : Search}
          title={students.length === 0 ? "No alumni yet" : "No alumni found"}
          hint={
            students.length === 0
              ? "Add alumni or import a CSV to populate the directory."
              : "Try a different search or clear your filters."
          }
          action={
            students.length > 0 ? (
              <button
                type="button"
                style={btn}
                onClick={() => {
                  setSearchTerm("");
                  setYearFilter("");
                  setProgramFilter("");
                  setStatusFilter("");
                }}
              >
                <RotateCcw size={14} />
                Reset filters
              </button>
            ) : null
          }
        />
      )}

      {!loading && filteredStudents.length > 0 && (
        <>
          <p>{filteredStudents.length} alumni record{filteredStudents.length === 1 ? "" : "s"} found</p>
          <div style={cardGrid}>
            {filteredStudents.map((s) => (
              <div key={s.id} className="alumni-card" style={{ ...card, position: "relative" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ ...cardTitle, margin: 0 }}>{s.fullName}</h4>
                    <p style={{ ...cardMeta, margin: "2px 0 0", fontWeight: 700, color: "var(--text)", fontSize: 13.5 }}>{s.studentNumber}</p>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>{s.email}</p>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>{s.program} • {s.schoolYear}</p>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", flexShrink: 0 }}>
                    <span
                      style={{
                        ...pill,
                        ...(s.schoolYear === "Graduate" ? statusTone("violet") : statusTone("info")),
                      }}
                    >
                      {s.schoolYear === "Graduate" ? "Graduate" : `Year ${s.schoolYear}`}
                    </span>
                    <span
                      style={{
                        ...pill,
                        ...(s.isActive ? statusTone("success") : statusTone("danger")),
                      }}
                    >
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                    {!s.isClaimed && (
                      <span
                        title="Never logged in — invite not yet claimed"
                        style={{ ...pill, ...statusTone("warning") }}
                      >
                        Unclaimed
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 11, marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: s.career ? "var(--info-tint)" : "var(--surface-alt)",
                        color: s.career ? "var(--info)" : "var(--muted)",
                      }}
                    >
                      <BriefcaseBusiness size={17} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", lineHeight: 1.35 }}>
                        {careerHeadline(s.career)}
                      </div>
                      <p style={{ ...cardMeta, margin: "3px 0 0", lineHeight: 1.4 }}>
                        {careerDescription(s.career, s.schoolYear)}
                      </p>
                      {s.career && (
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          <span style={{ ...pill, ...statusTone("violet") }}>
                            {s.career.employmentStatus}
                          </span>
                          <span style={{ ...pill, ...careerReviewTone(s.career.reviewStatus), display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {s.career.reviewStatus === "Approved" ? <BadgeCheck size={12} /> :
                              s.career.reviewStatus === "Rejected" ? <CircleAlert size={12} /> : <Clock3 size={12} />}
                            {s.career.reviewStatus === "Approved" ? "Verified" : s.career.reviewStatus}
                          </span>
                          {s.career.courseAlignment && (
                            <span style={{ ...pill, ...alignmentTone(s.career.courseAlignment) }}>
                              {s.career.courseAlignment}
                            </span>
                          )}
                        </div>
                      )}
                      {s.schoolYear === "Graduate" && s.isActive &&
                        (!s.career || s.career.reviewStatus === "Rejected") && (
                          <button
                            type="button"
                            className="career-reminder-button"
                            title={
                              careerReminderAlreadySent(s) && s.careerReminderSentAt
                                ? `Reminder sent ${new Date(s.careerReminderSentAt).toLocaleString()}`
                                : undefined
                            }
                            disabled={
                              sendingCareerReminderId === s.id ||
                              careerReminderAlreadySent(s)
                            }
                            style={{
                              ...btn,
                              marginTop: 10,
                              padding: "6px 10px",
                              background: careerReminderAlreadySent(s)
                                ? "var(--success-tint)"
                                : "var(--warning-tint)",
                              borderColor: careerReminderAlreadySent(s)
                                ? "var(--success)"
                                : "var(--warning)",
                              color: careerReminderAlreadySent(s)
                                ? "var(--success)"
                                : "var(--warning)",
                            }}
                            onClick={() => confirmCareerReminder(s)}
                          >
                            {careerReminderAlreadySent(s) ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <BellRing size={14} />
                            )}
                            {sendingCareerReminderId === s.id
                              ? "Sending…"
                              : careerReminderAlreadySent(s)
                                ? "Reminder sent"
                                : s.career?.reviewStatus === "Rejected"
                                  ? "Remind to resubmit"
                                  : "Remind to report"}
                          </button>
                        )}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 11, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <button
                    type="button"
                    style={{ ...btnPrimary, padding: "7px 13px" }}
                    onClick={() => openViewProfile(s)}
                  >
                    <Eye size={15} /> View profile
                  </button>

                  <KebabMenu
                    label={`More actions for ${s.fullName}`}
                    items={[
                      { key: "edit", label: "Edit alumni", icon: Pencil, onClick: () => openEditModal(s) },
                      { key: "invite", label: "Send invite", icon: Send, hidden: s.schoolYear !== "Graduate", onClick: () => confirmSendInvite(s) },
                      { key: "docs", label: "Documents", icon: FileText, to: `/documents/${s.id}`, hidden: s.schoolYear !== "Graduate" },
                      { key: "reset", label: "Reset password", icon: KeyRound, onClick: () => confirmResetPassword(s) },
                      { key: "toggle", label: s.isActive ? "Deactivate" : "Activate", icon: s.isActive ? UserX : UserCheck, danger: s.isActive, dividerBefore: true, onClick: () => confirmToggleStatus(s) },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showImportModal && (
        <ModalShell title="Import Alumni (CSV)" onClose={closeImportModal} width={480}>
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
              Existing alumni numbers are updated; new Graduate accounts get a
              unique 12-character temporary password (valid 7 days) emailed to
              them with the app download link, once Site:WebsiteUrl is configured.
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
        <ModalShell title={`Edit Alumni — ${editingStudent.studentNumber}`} onClose={requestCloseEdit} width={480}>
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

            <Field label="Year Level">
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
        <ModalShell title="Add Alumni" onClose={closeAddModal} width={480}>
          <form onSubmit={handleAddSave}>
            <Field label="Alumni Number">
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

            <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
              A unique temporary password will be generated and must be changed on first login.
            </p>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={closeAddModal} style={btn}>
                Cancel
              </button>
              <button type="submit" disabled={savingAdd} style={btnPrimary}>
                {savingAdd ? "Saving..." : "Add Alumni"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {resetResult && (
        <ModalShell title="Temporary Password Issued" onClose={() => setResetResult(null)} width={480}>
          <div>
            <p>
              For <strong>{resetResult.student?.fullName}</strong> ({resetResult.student?.studentNumber}):
            </p>
            <p style={{
              fontSize: 20, fontFamily: "monospace",
              background: "var(--surface-alt)", color: "var(--text)",
              border: "1px solid var(--border)", borderRadius: 8,
              padding: 12, textAlign: "center",
              userSelect: "all",
            }}>
              {resetResult.temporaryPassword}
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              Relay this to them. It is shown only once, expires in
              7 days, and must be changed on next login — afterwards they
              can use Forgot Password.
              {resetResult.inviteEmailSent !== undefined && (
                <>
                  <br />
                  {resetResult.inviteEmailSent
                    ? "An invite email with this password and the app download link was sent."
                    : "No invite email was sent (promo site link not configured)."}
                </>
              )}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setResetResult(null)} style={btnPrimary}>Done</button>
            </div>
          </div>
        </ModalShell>
      )}

      <style>{`
        .alumni-card {
          transition: transform 160ms ease, box-shadow 160ms ease;
        }
        .alumni-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md) !important;
        }
        .alumni-card:focus-within {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
        .career-reminder-button:hover:not(:disabled) {
          filter: brightness(0.97);
        }
      `}</style>
    </div>
  );
}
