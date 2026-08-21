import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getJobs, createJob, updateJob, deleteJob } from "../services/jobsApi";

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

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  async function loadJobs() {
    setLoading(true);
    setError("");
    try {
      const data = await getJobs();
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

  function startEdit(job) {
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
  }

  function cancelEdit() {
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
      cancelEdit();
      loadJobs();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteJob(id);
      loadJobs();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>Jobs</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ marginBottom: 30, maxWidth: 500 }}>
        <h3>{editingId ? "Edit Job" : "Post New Job"}</h3>

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
            <label>Salary Min</label><br />
            <input
              type="number"
              value={form.salaryMin}
              onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Salary Max</label><br />
            <input
              type="number"
              value={form.salaryMax}
              onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
              style={{ width: "100%" }}
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

        <div style={{ marginTop: 14 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update Job" : "Post Job"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={{ marginLeft: 8 }}>
              Cancel
            </button>
          )}
        </div>
      </form>

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
                  <button onClick={() => startEdit(job)}>Edit</button>{" "}
                  <button onClick={() => handleDelete(job.id)}>Delete</button>{" "}
                  <Link to={`/jobs/${job.id}/applicants`}>Applicants</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}