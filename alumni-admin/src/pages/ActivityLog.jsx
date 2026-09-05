import { useEffect, useState, useMemo } from "react";
import { Activity, User } from "lucide-react";
import { getAllActivityLogs } from "../services/activityLogApi";
import { SearchBox, card, cardMeta, selectStyle, btn } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { RotateCcw } from "lucide-react";
import { notifyError } from "../components/toastBus";

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
        notifyError(err.message);
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
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ margin: "16px 0", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <SearchBox
          placeholder="Search by name or details"
          value={searchTerm}
          onChange={setSearchTerm}
          onReset={() => setSearchTerm("")}
        />

        <select value={actorTypeFilter} onChange={(e) => setActorTypeFilter(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
          <option value="">All Actor Types</option>
          <option value="Admin">Admin</option>
          <option value="Student">Student</option>
        </select>

        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
          <option value="">All Actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <button
          style={btn}
          onClick={() => {
            setSearchTerm("");
            setActorTypeFilter("");
            setActionFilter("");
          }}
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {loading ? (
        <GridSkeleton count={6} />
      ) : (
        <>
          <p>{filteredLogs.length} entries found</p>

          {pagedLogs.length === 0 ? (
            <p>No entries found.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
              {pagedLogs.map((log) => (
                <div key={log.id} style={card}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: "#eef3ec",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 700, color: "var(--primary)", flexShrink: 0, fontSize: 15,
                    }}>
                      {(log.actorName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ fontSize: 14 }}>{log.actorName || "—"}</strong>
                        <span style={{
                          fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999,
                          background: log.actorType === "Admin" ? "#e3f2fd" : "#e6f4ea",
                          color: log.actorType === "Admin" ? "#1565c0" : "#1e7e34",
                        }}>
                          {log.actorType || "—"}
                        </span>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 999,
                          background: "#f3f4f6", color: "#374151",
                        }}>
                          <Activity size={13} />
                          {log.action}
                        </span>
                      </div>
                      <p style={{ ...cardMeta, margin: 0 }}>{log.details || "—"}</p>
                      <p style={{ ...cardMeta, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
                        <User size={13} color="#888" />
                        IP: {log.ipAddress || "—"}
                      </p>
                    </div>
                    <span style={{ marginLeft: "auto", flexShrink: 0, fontSize: 12, color: "#666" }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)} style={btn}>
              ← Previous
            </button>{" "}
            <span style={{ margin: "0 10px" }}>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} style={btn}>
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
