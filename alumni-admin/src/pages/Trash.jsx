import { useEffect, useState, useMemo } from "react";
import { RotateCcw, Trash2, Briefcase, Newspaper, CalendarDays } from "lucide-react";
import { getDeletedJobs, restoreJob, permanentlyDeleteJob } from "../services/jobsApi";
import { getDeletedNews, restoreNews, permanentlyDeleteNews } from "../services/newsApi";
import { getDeletedEvents, restoreEvent, permanentlyDeleteEvent } from "../services/eventsApi";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast from "../components/Toast";
import { SearchBox, cardGrid, card, cardTitle, cardMeta, iconButton, selectStyle, btn, btnDanger, toolbar, filterRow } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";

export default function Trash() {
  const [deletedJobs, setDeletedJobs] = useState([]);
  const [deletedNews, setDeletedNews] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "jobs" | "news" | "events"
  const [searchTerm, setSearchTerm] = useState("");

  async function loadTrash() {
    setLoading(true);
    try {
      const [jobs, news, events] = await Promise.all([getDeletedJobs(), getDeletedNews(), getDeletedEvents()]);
      setDeletedJobs(jobs);
      setDeletedNews(news);
      setDeletedEvents(events);
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

  const trashCount = deletedJobs.length + deletedNews.length + deletedEvents.length;

  function askRestoreEvent(event) {
    setConfirmAction({
      message: `Restore "${event.title}"?`,
      onConfirm: async () => {
        try {
          await restoreEvent(event.id);
          setToast({ message: "Event restored.", type: "success" });
          loadTrash();
        } catch (err) {
          setToast({ message: err.message, type: "error" });
        } finally {
          setConfirmAction(null);
        }
      },
    });
  }

  function askPermanentDeleteEvent(event) {
    setConfirmAction({
      message: `Permanently delete "${event.title}"? This cannot be undone.`,
      onConfirm: async () => {
        try {
          await permanentlyDeleteEvent(event.id);
          setToast({ message: "Event permanently deleted.", type: "success" });
          loadTrash();
        } catch (err) {
          setToast({ message: err.message, type: "error" });
        } finally {
          setConfirmAction(null);
        }
      },
    });
  }

  function askEmptyTrash() {
    if (trashCount === 0) return;
    setConfirmAction({
      message: `Permanently delete all ${trashCount} item${trashCount === 1 ? "" : "s"} in trash? This cannot be undone.`,
      onConfirm: async () => {
        try {
          for (const job of deletedJobs) {
            await permanentlyDeleteJob(job.id);
          }
          for (const item of deletedNews) {
            await permanentlyDeleteNews(item.id);
          }
          for (const event of deletedEvents) {
            await permanentlyDeleteEvent(event.id);
          }
          setToast({ message: `Emptied trash (${trashCount} item${trashCount === 1 ? "" : "s"} deleted).`, type: "success" });
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

    const eventItems = deletedEvents
      .filter(
        (event) =>
          !term ||
          event.title?.toLowerCase().includes(term) ||
          event.location?.toLowerCase().includes(term)
      )
      .map((event) => ({
        type: "Event",
        id: event.id,
        title: event.title,
        subtitle: event.location,
        postedAt: event.eventDate,
        onRestore: () => askRestoreEvent(event),
        onDeleteForever: () => askPermanentDeleteEvent(event),
      }));

    let combined = [];
    if (typeFilter === "all") combined = [...jobItems, ...newsItems, ...eventItems];
    else if (typeFilter === "jobs") combined = jobItems;
    else if (typeFilter === "news") combined = newsItems;
    else if (typeFilter === "events") combined = eventItems;

    return combined.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
  }, [deletedJobs, deletedNews, deletedEvents, typeFilter, searchTerm]);

  return (
    <div>
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <ConfirmDialog
        message={confirmAction?.message}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      <div style={{ ...toolbar, justifyContent: "flex-end" }}>
        <button
          style={btnDanger}
          onClick={askEmptyTrash}
          disabled={loading || trashCount === 0}
          title={trashCount === 0 ? "Trash is empty" : `Permanently delete all ${trashCount} items`}
        >
          <Trash2 size={15} />
          Empty Trash{trashCount > 0 ? ` (${trashCount})` : ""}
        </button>
      </div>

      <div style={filterRow}>
        <SearchBox
          placeholder="Search deleted jobs, news, or events..."
          value={searchTerm}
          onChange={setSearchTerm}
          onReset={() => setSearchTerm("")}
        />
      </div>

      <div style={{ ...filterRow, marginTop: -4 }}>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...selectStyle, width: "auto" }}>
          <option value="all">All Types</option>
          <option value="jobs">Jobs Only</option>
          <option value="news">News Only</option>
          <option value="events">Events Only</option>
        </select>

        <button
          style={btn}
          onClick={() => {
            setSearchTerm("");
            setTypeFilter("all");
          }}
        >
          Reset Filters
        </button>
      </div>

      {loading ? (
        <GridSkeleton count={6} />
      ) : combinedItems.length === 0 ? (
        <p>Nothing in trash{searchTerm ? " matching your search." : "."}</p>
      ) : (
        <div style={cardGrid}>
          {combinedItems.map((item) => (
            <div key={`${item.type}-${item.id}`} style={card}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <h3 style={{ ...cardTitle, margin: 0 }}>{item.title}</h3>
                  {item.type === "Job" ? (
                    <p style={{ ...cardMeta, margin: 0 }}>{item.subtitle || "—"}</p>
                  ) : item.type === "Event" ? (
                    item.subtitle && (
                      <p style={{ ...cardMeta, margin: 0 }}>{item.subtitle}</p>
                    )
                  ) : (
                    item.subtitle && (
                      <p style={{ ...cardMeta, margin: 0 }}>Posted by {item.subtitle}</p>
                    )
                  )}
                  <p style={{ ...cardMeta, margin: 0 }}>
                    {item.type === "Event" ? "Event date" : "Posted"} {new Date(item.postedAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  style={{
                    marginLeft: "auto", flexShrink: 0,
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                    background: item.type === "Job" ? "#e3f2fd" : item.type === "Event" ? "#e0f2f1" : "#f3e5f5",
                    color: item.type === "Job" ? "#1565c0" : item.type === "Event" ? "#00796b" : "#6a1b9a",
                  }}
                >
                  {item.type === "Job" ? <Briefcase size={13} /> : item.type === "Event" ? <CalendarDays size={13} /> : <Newspaper size={13} />}
                  {item.type}
                </span>
              </div>

              <div
                style={{
                  borderTop: "1px solid var(--border)",
                  paddingTop: 12,
                  marginTop: 8,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {iconButton("Restore", RotateCcw)(item.onRestore)}
                {iconButton("Delete Forever", Trash2)(item.onDeleteForever, {
                  color: "var(--danger)",
                  borderColor: "var(--danger)",
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
