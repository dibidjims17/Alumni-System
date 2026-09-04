import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { getStudents } from "../services/studentsApi";
import { SearchBox, cardGrid, card, cardTitle, cardMeta, actionsRow } from "../components/kit";

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

      <div style={{ margin: "16px 0" }}>
        <SearchBox
          placeholder="Search by Student Number, Name, or Program"
          value={searchTerm}
          onChange={setSearchTerm}
          onReset={() => setSearchTerm("")}
        />
      </div>

      {loading && <p>Loading students...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && (
        <>
          <p>{filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found</p>
          {filteredStudents.length === 0 ? (
            <p>No students found.</p>
          ) : (
            <div style={cardGrid}>
              {filteredStudents.map((s) => (
                <div key={s.id} style={card}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", background: "#eef3ec",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, color: "var(--primary)", flexShrink: 0,
                    }}>
                      {(s.fullName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ ...cardTitle, margin: 0 }}>{s.fullName}</h4>
                      <p style={{ ...cardMeta, margin: "2px 0 0" }}>{s.studentNumber}</p>
                    </div>
                  </div>
                  <p style={{ ...cardMeta, margin: 0 }}>{s.program} • {s.schoolYear}</p>
                  <div style={actionsRow}>
                    <Link
                      to={`/students/${s.id}/documents`}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "6px 10px", border: "1px solid #ccc", borderRadius: 8,
                        background: "#fff", cursor: "pointer", fontSize: 13,
                        color: "inherit", textDecoration: "none",
                      }}
                    >
                      <FileText size={15} />
                      View Checklist
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
