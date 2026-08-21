import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getJobApplicants, updateApplicationStatus, downloadResume } from "../services/jobsApi";

const STATUS_OPTIONS = ["Pending", "Reviewed", "Shortlisted", "Rejected"];

export default function JobApplicants() {
  const { id } = useParams();
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  async function loadApplicants() {
    setLoading(true);
    setError("");
    try {
      const data = await getJobApplicants(id);
      setApplicants(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplicants();
  }, [id]);

  async function handleStatusChange(applicationId, newStatus, currentNotes) {
    setSavingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, newStatus, currentNotes || "");
      loadApplicants();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleNotesBlur(applicationId, status, newNotes, oldNotes) {
    if (newNotes === oldNotes) return;
    setSavingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, status, newNotes);
      loadApplicants();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function handleViewResume(resumeId) {
    try {
      await downloadResume(resumeId);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <Link to="/jobs">← Back to Jobs</Link>
      <h2>Applicants</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading applicants...</p>
      ) : applicants.length === 0 ? (
        <p>No applicants yet.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Student Number</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Program</th>
              <th>Applied At</th>
              <th>Resume</th>
              <th>Status</th>
              <th>Admin Notes</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a) => (
              <tr key={a.applicationId}>
                <td>{a.studentNumber}</td>
                <td>{a.fullName}</td>
                <td>{a.email}</td>
                <td>{a.program}</td>
                <td>{new Date(a.appliedAt).toLocaleString()}</td>
                <td>
                  {a.attachResume && a.resumeId ? (
                    <button onClick={() => handleViewResume(a.resumeId)}>
                      {a.resumeFileName || "View Resume"}
                    </button>
                  ) : (
                    "No"
                  )}
                </td>
                <td>
                  <select
                    value={a.status}
                    onChange={(e) => handleStatusChange(a.applicationId, e.target.value, a.adminNotes)}
                    disabled={savingId === a.applicationId}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    defaultValue={a.adminNotes || ""}
                    onBlur={(e) => handleNotesBlur(a.applicationId, a.status, e.target.value, a.adminNotes)}
                    disabled={savingId === a.applicationId}
                    style={{ width: "100%" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}