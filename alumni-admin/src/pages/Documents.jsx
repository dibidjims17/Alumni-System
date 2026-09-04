import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import { Upload, FileText, RotateCcw } from "lucide-react";
import { API_BASE_URL } from "../config";
import { getStudents } from "../services/studentsApi";
import { importDocuments } from "../services/documentsApi";
import { notifyError, notifySuccess } from "../components/toastBus";
import { SearchBox, cardGrid, card, cardTitle, cardMeta, ModalShell, btn, btnPrimary } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";

const FILE_ROOT = API_BASE_URL.replace("/api", "");
export default function Documents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  async function load() {
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          const result = await importDocuments(results.data);
          setImportResult({ success: true, detail: result });
          notifySuccess("Document statuses imported.");
          setShowImport(false);
          load();
        } catch (err) {
          setImportResult({ success: false, message: err.message });
        } finally {
          setImporting(false);
        }
      },
      error: (err) => {
        setImportResult({ success: false, message: err.message });
      },
    });
  }

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Documents</h2>
        <button style={btnPrimary} onClick={() => { setImportResult(null); setShowImport(true); }}>
          <Upload size={15} />
          Import Statuses (CSV)
        </button>
      </div>

      <div style={{ margin: "16px 0", display: "flex", gap: 8 }}>
        <SearchBox
          placeholder="Search by Student Number, Name, or Program"
          value={searchTerm}
          onChange={setSearchTerm}
          onReset={() => setSearchTerm("")}
        />
      </div>

      {loading ? (
        <GridSkeleton count={6} />
      ) : filteredStudents.length === 0 ? (
        <p>No matching students.</p>
      ) : (
        <div style={cardGrid}>
          {filteredStudents.map((s) => (
            <div key={s.id} style={card}>
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
                  <p style={{ ...cardMeta, margin: "2px 0 0" }}>{s.studentNumber}</p>
                  <p style={{ ...cardMeta, margin: "2px 0 0" }}>{s.program} • {s.schoolYear}</p>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                <Link
                  to={`/documents/${s.id}`}
                  style={{ ...btn, textDecoration: "none", alignSelf: "flex-start" }}
                >
                  <FileText size={15} />
                  View Checklist
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showImport && (
        <ModalShell title="Import Document Statuses (CSV)" onClose={() => setShowImport(false)} width={480}>
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={importing}
            />
            {importing && <p style={{ color: "var(--muted)" }}>Importing...</p>}
            {importResult && !importResult.success && (
              <p style={{ color: "var(--danger)" }}>{importResult.message}</p>
            )}
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
              Upload a CSV of document statuses to bulk-update the checklist.
              Use <RotateCcw size={12} style={{ verticalAlign: "middle" }} /> Initialize on a
              student's checklist to seed the standard documents first.
            </p>
            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button style={btn} onClick={() => setShowImport(false)}>Close</button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
