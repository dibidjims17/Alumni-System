import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStudents } from "../services/studentsApi";

export default function Documents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function load() {
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
    load();
  }, []);

  const term = searchTerm.trim().toLowerCase();
  const filteredStudents = students.filter(
    (s) =>
      !term ||
      s.studentNumber?.toLowerCase().includes(term) ||
      s.fullName?.toLowerCase().includes(term) ||
      s.program?.toLowerCase().includes(term)
  );

  return (
    <div>
      <h2>Documents</h2>

      <div style={{ margin: "16px 0", display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder="Search by Student Number, Name, or Program"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: 280 }}
        />
        {searchTerm.trim() !== "" && (
          <button type="button" onClick={() => setSearchTerm("")}>Reset</button>
        )}
      </div>

      {loading && <p>Loading students...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Student Number</th>
              <th>Full Name</th>
              <th>Program</th>
              <th>Year</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr key={s.id}>
                <td>{s.studentNumber}</td>
                <td>{s.fullName}</td>
                <td>{s.program}</td>
                <td>{s.schoolYear}</td>
                <td>
                  <Link to={`/students/${s.id}/documents`}>View Checklist</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}