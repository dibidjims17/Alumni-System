import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import { getStudents, importStudents, toggleStudentStatus } from "../services/studentsApi";
import { importDocuments } from "../services/documentsApi";

const YEAR_OPTIONS = ["1", "2", "3", "4", "Graduate"];

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const [docImporting, setDocImporting] = useState(false);
  const [docImportResult, setDocImportResult] = useState(null);
  const docFileInputRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");

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

  // Derive the list of unique programs directly from the fetched students,
  // so new programs added via CSV import show up automatically.
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
      <h2>Students</h2>

      <div style={{ margin: "16px 0" }}>
        <label>
          Import Students (CSV):{" "}
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileSelect}
            disabled={importing}
          />
        </label>
        {importing && <p>Importing...</p>}
        {importResult && (
          <p style={{ color: importResult.success ? "green" : "red" }}>
            {importResult.message}
          </p>
        )}
      </div>

      <div style={{ margin: "16px 0" }}>
        <label>
          Import Document Statuses (CSV):{" "}
          <input
            type="file"
            accept=".csv"
            ref={docFileInputRef}
            onChange={handleDocFileSelect}
            disabled={docImporting}
          />
        </label>
        {docImporting && <p>Importing documents...</p>}
        {docImportResult && (
          <p style={{ color: docImportResult.success ? "green" : "red" }}>
            {docImportResult.message}
          </p>
        )}
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
                    <Link to={`/students/${s.id}/documents`}>Documents</Link>
                    {" | "}
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
    </div>
  );
}