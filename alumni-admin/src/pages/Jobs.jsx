import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { getJobs, createJob, updateJob, deleteJob } from "../services/jobsApi";
import ConfirmDialog from "../components/ConfirmDialog";
import { SearchBox, useDirtyGuard, cardGrid, card, cardTitle, cardMeta, iconButton, ModalShell, Field, textInput, selectStyle, btn, btnPrimary } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError } from "../components/toastBus";

const emptyForm = {
  jobTitle: "",
  company: "",
  location: "",
  industry: "",
  employmentType: "",
  salaryMin: "",
  salaryMax: "",
  description: "",
  deadline: "",
  isActive: true,
};

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const { setDirty, withGuard } = useDirtyGuard();
  const pristineRef = useRef("");

  const FORM_SALARY_CAP = 500000;
  const FORM_SALARY_STEP = 1000;

  function formatPeso(value) {
    if (value === "" || value == null) return "Undisclosed";
    return `₱${Number(value).toLocaleString()}`;
  }

  function formatSalaryRange(job) {
    const hasMin = job.salaryMin !== "" && job.salaryMin != null;
    const hasMax = job.salaryMax !== "" && job.salaryMax != null;
    if (!hasMin && !hasMax) return "";
    return `${hasMin ? formatPeso(job.salaryMin) : "—"} – ${hasMax ? formatPeso(job.salaryMax) : "—"}`;
  }

  function stepSalary(field, delta) {
    const current = Number(form[field]) || 0;
    const next = Math.min(FORM_SALARY_CAP, Math.max(0, current + delta));
    updateField({ [field]: next });
  }

  function updateField(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    setDirty(JSON.stringify(next) !== pristineRef.current);
  }

  async function loadJobs(activeSearch = "") {
    setLoading(true);
    setError("");
    try {
      const data = await getJobs(activeSearch);
      setJobs(data);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  function submitSearch(e) {
    e.preventDefault();
    loadJobs(searchTerm);
  }

  function resetSearch() {
    setSearchTerm("");
    loadJobs("");
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    pristineRef.current = JSON.stringify(emptyForm);
    setDirty(false);
    setShowModal(true);
  }

  function openEditModal(job) {
    setEditingId(job.id);
    const next = {
      jobTitle: job.jobTitle || "",
      company: job.company || "",
      location: job.location || "",
      industry: job.industry || "",
      employmentType: job.employmentType || "",
      salaryMin: job.salaryMin ?? "",
      salaryMax: job.salaryMax ?? "",
      description: job.description || "",
      deadline: job.deadline ? job.deadline.slice(0, 10) : "",
      isActive: job.isActive,
    };
    setForm(next);
    pristineRef.current = JSON.stringify(next);
    setDirty(false);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function closeModalGuarded() {
    withGuard(closeModal);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        salaryMin: form.salaryMin === "" ? null : Number(form.salaryMin),
        salaryMax: form.salaryMax === "" ? null : Number(form.salaryMax),
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      };

      if (editingId) {
        await updateJob(editingId, payload);
      } else {
        await createJob(payload);
      }
      closeModal();
      setDirty(false);
      loadJobs(searchTerm);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      await deleteJob(confirmDeleteId);
      loadJobs(searchTerm);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setConfirmDeleteId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <button onClick={openCreateModal} style={btnPrimary}>
          <Plus size={16} /> Add New Job
        </button>
      </div>

      <form
        onSubmit={submitSearch}
        style={{ margin: "16px 0", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
      >
        <SearchBox
          placeholder="Search title or company"
          value={searchTerm}
          onChange={setSearchTerm}
          onReset={resetSearch}
        />
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <GridSkeleton count={6} />
      ) : jobs.length === 0 ? (
        <p>No jobs found.</p>
      ) : (
        <div style={cardGrid}>
          {jobs.map((job) => {
            const salaryLine = formatSalaryRange(job);
            const deadlineDate = job.deadline ? new Date(job.deadline).toLocaleDateString() : "—";
            const isClosed = job.deadline ? new Date(job.deadline).getTime() < Date.now() : false;
            return (
              <div key={job.id} style={card}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    <h3 style={cardTitle}>{job.jobTitle}</h3>
                    <p style={cardMeta}>{job.company || "—"} • {job.location || "—"}</p>
                    <p style={cardMeta}>{job.employmentType || "—"} • {job.industry || "—"}</p>
                    {salaryLine && <p style={cardMeta}>Salary: {salaryLine}</p>}
                    <p style={cardMeta}>
                      Deadline: {deadlineDate}
                      {isClosed ? " (Closed)" : ""}
                    </p>
                  </div>
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
                  {iconButton("Edit", Pencil)(() => openEditModal(job))}
                  {iconButton("Delete", Trash2)(() => setConfirmDeleteId(job.id), { color: "var(--danger)", borderColor: "var(--danger)" })}
                  <Link
                    to={`/jobs/${job.id}/applicants`}
                    style={{ ...btn, textDecoration: "none" }}
                  >
                    <Users size={15} />
                    Applicants
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalShell title={editingId ? "Edit Job" : "Post New Job"} onClose={closeModalGuarded} width={560}>
          <form onSubmit={handleSubmit}>
            <Field label="Job Title">
              <input
                type="text"
                value={form.jobTitle}
                onChange={(e) => updateField({ jobTitle: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Company">
              <input
                type="text"
                value={form.company}
                onChange={(e) => updateField({ company: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Location">
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => updateField({ location: e.target.value })}
                    style={textInput}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Industry">
                  <input
                    type="text"
                    value={form.industry}
                    onChange={(e) => updateField({ industry: e.target.value })}
                    style={textInput}
                  />
                </Field>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="Employment Type">
                  <select
                    value={form.employmentType}
                    onChange={(e) => updateField({ employmentType: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="">Select...</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Application Deadline">
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => updateField({ deadline: e.target.value })}
                    style={textInput}
                  />
                </Field>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label={`Salary Min — ${formatPeso(form.salaryMin)}`}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button type="button" onClick={() => stepSalary("salaryMin", -FORM_SALARY_STEP)} style={{ padding: "2px 10px" }}>−</button>
                    <input
                      type="range"
                      min={0}
                      max={FORM_SALARY_CAP}
                      step={FORM_SALARY_STEP}
                      value={Number(form.salaryMin) || 0}
                      onChange={(e) => updateField({ salaryMin: Number(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => stepSalary("salaryMin", FORM_SALARY_STEP)} style={{ padding: "2px 10px" }}>+</button>
                  </div>
                  <input
                    type="number"
                    value={form.salaryMin}
                    onChange={(e) => updateField({ salaryMin: e.target.value })}
                    placeholder="Undisclosed"
                    style={{ ...textInput, marginTop: 6 }}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label={`Salary Max — ${formatPeso(form.salaryMax)}`}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button type="button" onClick={() => stepSalary("salaryMax", -FORM_SALARY_STEP)} style={{ padding: "2px 10px" }}>−</button>
                    <input
                      type="range"
                      min={0}
                      max={FORM_SALARY_CAP}
                      step={FORM_SALARY_STEP}
                      value={Number(form.salaryMax) || 0}
                      onChange={(e) => updateField({ salaryMax: Number(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => stepSalary("salaryMax", FORM_SALARY_STEP)} style={{ padding: "2px 10px" }}>+</button>
                  </div>
                  <input
                    type="number"
                    value={form.salaryMax}
                    onChange={(e) => updateField({ salaryMax: e.target.value })}
                    placeholder="Undisclosed"
                    style={{ ...textInput, marginTop: 6 }}
                  />
                </Field>
              </div>
            </div>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => updateField({ description: e.target.value })}
                rows={5}
                style={{ ...textInput, resize: "vertical" }}
              />
            </Field>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#333", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField({ isActive: e.target.checked })}
                />{" "}
                Active
              </label>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={closeModalGuarded} style={btn}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={btnPrimary}>
                {saving ? "Saving..." : editingId ? "Update Job" : "Post Job"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      <ConfirmDialog
        message={confirmDeleteId ? "Move this job to trash?" : null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
