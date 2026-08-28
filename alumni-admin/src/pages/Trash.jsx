import { useEffect, useState, useMemo } from "react";
import { getDeletedJobs, restoreJob, permanentlyDeleteJob } from "../services/jobsApi";
import { getDeletedNews, restoreNews, permanentlyDeleteNews } from "../services/newsApi";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";

export default function Trash() {
  const [deletedJobs, setDeletedJobs] = useState([]);
  const [deletedNews, setDeletedNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "jobs" | "news"
  const [searchTerm, setSearchTerm] = useState("");

  async function loadTrash() {
    setLoading(true);
    try {
      const [jobs, news] = await Promise.all([getDeletedJobs(), getDeletedNews()]);
      setDeletedJobs(jobs);
      setDeletedNews(news);
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrash();
  }, []);

  function askRestoreJob(job) {
    setConfirmAction({
      message: `Restore "${job.jobTitle}"?`,
      onConfirm: async () => {
        try {
          await restoreJob(job.id);
          setToast({ message: "Job restored.", type: "success" });
          loadTrash();
        } catch (err) {
          setToast({ message: err.message, type: "error" });
        } finally {
          setConfirmAction(null);
        }
      },
    });
  }

  function askPermanentDeleteJob(job) {
    setConfirmAction({
      message: `Permanently delete "${job.jobTitle}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await permanentlyDeleteJob(job.id);
          setToast({ message: "Job permanently deleted.", type: "success" });
          loadTrash();
        } catch (err) {
          setToast({ message: err.message, type: "error" });
        } finally {
          setConfirmAction(null);
        }
      },
    });
  }

  function askRestoreNews(item) {
    setConfirmAction({
      message: `Restore "${item.title}"?`,
      onConfirm: async () => {
        try {
          await restoreNews(item.id);
          setToast({ message: "News restored.", type: "success" });
          loadTrash();
        } catch (err) {
          setToast({ message: err.message, type: "error" });
        } finally {
          setConfirmAction(null);
        }
      },
    });
  }

  function askPermanentDeleteNews(item) {
    setConfirmAction({
      message: `Permanently delete "${item.title}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await permanentlyDeleteNews(item.id);
          setToast({ message: "News permanently deleted.", type: "success" });
          loadTrash();
        } catch (err) {
          setToast({ message: err.message, type: "error" });
        } finally {
          setConfirmAction(null);
        }
      },
    });
  }

  const combinedItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const jobItems = deletedJobs
      .filter(
        (job) =>
          !term ||
          job.jobTitle?.toLowerCase().includes(term) ||
          job.company?.toLowerCase().includes(term)
      )
      .map((job) => ({
        type: "Job",
        id: job.id,
        title: job.jobTitle,
        subtitle: job.company,
        postedAt: job.postedAt,
        onRestore: () => askRestoreJob(job),
        onDeleteForever: () => askPermanentDeleteJob(job),
      }));

    const newsItems = deletedNews
      .filter(
        (item) =>
          !term ||
          item.title?.toLowerCase().includes(term) ||
          item.content?.toLowerCase().includes(term)
      )
      .map((item) => ({
        type: "News",
        id: item.id,
        title: item.title,
        subtitle: item.postedByAdminName,
        postedAt: item.postedAt,
        onRestore: () => askRestoreNews(item),
        onDeleteForever: () => askPermanentDeleteNews(item),
      }));

    let combined = [];
    if (typeFilter === "all") combined = [...jobItems, ...newsItems];
    else if (typeFilter === "jobs") combined = jobItems;
    else if (typeFilter === "news") combined = newsItems;

    return combined.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  }, [deletedJobs, deletedNews, typeFilter, searchTerm]);

  return (
    <div>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <ConfirmDialog
        message={confirmAction?.message}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      <h2>Trash</h2>

      <div style={{ margin: "16px 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search deleted jobs or news..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: 280 }}
        />

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="jobs">Jobs Only</option>
          <option value="news">News Only</option>
        </select>

        <button
          onClick={() => {
            setSearchTerm("");
            setTypeFilter("all");
          }}
        >
          Reset Filters
        </button>
      </div>

      {loading ? (
        <p>Loading trash...</p>
      ) : combinedItems.length === 0 ? (
        <p>Nothing in trash{searchTerm ? " matching your search." : "."}</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>{typeFilter === "jobs" ? "Company" : typeFilter === "news" ? "Posted By" : "Company / Posted By"}</th>
              <th>Posted At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {combinedItems.map((item) => (
              <tr key={`${item.type}-${item.id}`}>
                <td>{item.type}</td>
                <td>{item.title}</td>
                <td>{item.subtitle}</td>
                <td>{new Date(item.postedAt).toLocaleDateString()}</td>
                <td>
                  <button onClick={item.onRestore}>Restore</button>{" "}
                  <button onClick={item.onDeleteForever} style={{ color: "#dc2626" }}>
                    Delete Forever
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}