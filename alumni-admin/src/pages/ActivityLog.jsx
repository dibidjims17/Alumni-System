import { useEffect, useState, useMemo } from "react";
import { getAllActivityLogs } from "../services/activityLogApi";

const PAGE_SIZE = 20;

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [actorTypeFilter, setActorTypeFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await getAllActivityLogs();
        setLogs(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Full list of distinct actions across ALL entries, not just the visible page
  const actionOptions = useMemo(() => {
    const unique = new Set(logs.map((l) => l.action).filter(Boolean));
    return Array.from(unique).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return logs.filter((l) => {
      const matchesSearch =
        !term ||
        l.actorName?.toLowerCase().includes(term) ||
        l.details?.toLowerCase().includes(term);
      const matchesType = !actorTypeFilter || l.actorType === actorTypeFilter;
      const matchesAction = !actionFilter || l.action === actionFilter;
      return matchesSearch && matchesType && matchesAction;
    });
  }, [logs, searchTerm, actorTypeFilter, actionFilter]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actorTypeFilter, actionFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const pagedLogs = filteredLogs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div>
      <h2>Activity Log</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ margin: "16px 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name or details"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: 260 }}
        />

        <select value={actorTypeFilter} onChange={(e) => setActorTypeFilter(e.target.value)}>
          <option value="">All Actor Types</option>
          <option value="Admin">Admin</option>
          <option value="Student">Student</option>
        </select>

        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearchTerm("");
            setActorTypeFilter("");
            setActionFilter("");
          }}
        >
          Reset Filters
        </button>
      </div>

      {loading ? (
        <p>Loading activity log...</p>
      ) : (
        <>
          <p>{filteredLogs.length} entries found</p>
          <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>Actor</th>
                <th>Type</th>
                <th>Action</th>
                <th>Details</th>
                <th>IP Address</th>
                <th>Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {pagedLogs.map((log) => (
                <tr key={log.id}>
                  <td>{log.actorName}</td>
                  <td>{log.actorType}</td>
                  <td>{log.action}</td>
                  <td>{log.details}</td>
                  <td>{log.ipAddress}</td>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: 16 }}>
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
              ← Previous
            </button>{" "}
            <span style={{ margin: "0 10px" }}>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}