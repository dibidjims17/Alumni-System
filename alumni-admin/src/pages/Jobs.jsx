import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJobs, createJob, updateJob, deleteJob } from "../services/jobsApi";
import ConfirmDialog from "../components/ConfirmDialog";

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

  const FORM_SALARY_CAP = 500000;
  const FORM_SALARY_STEP = 1000;

  function formatPeso(value) {
    if (value === "" || value == null) return "Undisclosed";
    return `₱${Number(value).toLocaleString()}`;
  }

  function stepSalary(field, delta) {
    const current = Number(form[field]) || 0;
    const next = Math.min(FORM_SALARY_CAP, Math.max(0, current + delta));
    setForm({ ...form, [field]: next });
  }

  async function loadJobs(activeSearch = "") {
    setLoading(true);
    setError("");
    try {
      const data = await getJobs(activeSearch);
      setJobs(data);
    } catch (err) {
      setError(err.message);
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
    setShowModal(true);
  }

  function openEditModal(job) {
    setEditingId(job.id);
    setForm({
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
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
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
      loadJobs(searchTerm);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      await deleteJob(confirmDeleteId);
      loadJobs(searchTerm);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmDeleteId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Jobs</h2>
        <button onClick={openCreateModal}>+ Add New Job</button>
      </div>

      <form onSubmit={submitSearch} style={{ margin: "16px 0", display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Search title or company"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <button type="submit">Search</button>
        {searchTerm.trim() !== "" && (
          <button type="button" onClick={resetSearch}>Reset</button>
        )}
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading jobs...</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Job Title</th>
              <th>Company</th>
              <th>Type</th>
              <th>Deadline</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.jobTitle}</td>
                <td>{job.company}</td>
                <td>{job.employmentType}</td>
                <td>{job.deadline ? new Date(job.deadline).toLocaleDateString() : "—"}</td>
                <td>{job.isActive ? "Yes" : "No"}</td>
                <td>
                  <button onClick={() => openEditModal(job)}>Edit</button>{" "}
                  <button onClick={() => setConfirmDeleteId(job.id)}>Delete</button>{" "}
                  <Link to={`/jobs/${job.id}/applicants`}>Applicants</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              maxWidth: 500,
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Job" : "Post New Job"}</h3>
              <button onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
              <div>
                <label>Job Title</label><br />
                <input
                  type="text"
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Company</label><br />
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Location</label><br />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Industry</label><br />
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Employment Type</label><br />
                <select
                  value={form.employmentType}
                  onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                  style={{ width: "100%" }}
                >
                  <option value="">Select...</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label>Salary Min — {formatPeso(form.salaryMin)}</label><br />
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button type="button" onClick={() => stepSalary("salaryMin", -FORM_SALARY_STEP)} style={{ padding: "2px 10px" }}>−</button>
                    <input
                      type="range"
                      min={0}
                      max={FORM_SALARY_CAP}
                      step={FORM_SALARY_STEP}
                      value={Number(form.salaryMin) || 0}
                      onChange={(e) => setForm({ ...form, salaryMin: Number(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => stepSalary("salaryMin", FORM_SALARY_STEP)} style={{ padding: "2px 10px" }}>+</button>
                  </div>
                  <input
                    type="number"
                    value={form.salaryMin}
                    onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                    placeholder="Undisclosed"
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Salary Max — {formatPeso(form.salaryMax)}</label><br />
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button type="button" onClick={() => stepSalary("salaryMax", -FORM_SALARY_STEP)} style={{ padding: "2px 10px" }}>−</button>
                    <input
                      type="range"
                      min={0}
                      max={FORM_SALARY_CAP}
                      step={FORM_SALARY_STEP}
                      value={Number(form.salaryMax) || 0}
                      onChange={(e) => setForm({ ...form, salaryMax: Number(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={() => stepSalary("salaryMax", FORM_SALARY_STEP)} style={{ padding: "2px 10px" }}>+</button>
                  </div>
                  <input
                    type="number"
                    value={form.salaryMax}
                    onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                    placeholder="Undisclosed"
                    style={{ width: "100%", marginTop: 4 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Description</label><br />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Application Deadline</label><br />
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />{" "}
                  Active
                </label>
              </div>

              <div style={{ marginTop: 16 }}>
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Job" : "Post Job"}
                </button>
                <button type="button" onClick={closeModal} style={{ marginLeft: 8 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        message={confirmDeleteId ? "Move this job to trash?" : null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}