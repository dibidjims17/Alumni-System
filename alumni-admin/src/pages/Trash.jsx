import { useEffect, useState, useMemo } from "react";
import { RotateCcw, Trash2, Briefcase, Newspaper, CalendarDays } from "lucide-react";
import { getDeletedJobs, restoreJob, permanentlyDeleteJob } from "../services/jobsApi";
import { getDeletedNews, restoreNews, permanentlyDeleteNews } from "../services/newsApi";
import { getDeletedEvents, restoreEvent, permanentlyDeleteEvent } from "../services/eventsApi";
import { SearchBox, cardGrid, card, cardTitle, cardMeta, pill, statusTone, iconButton, selectStyle, btn, btnDanger, toolbar, filterRow, EmptyState, pageWrap } from "../components/kit";
import { notifyError, notifySuccess } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";
import { GridSkeleton } from "../components/Skeleton";
import { getSession } from "../services/api";
import KebabMenu from "../components/KebabMenu";

export default function Trash() {
  const [deletedJobs, setDeletedJobs] = useState([]);
  const [deletedNews, setDeletedNews] = useState([]);
  const [deletedEvents, setDeletedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "jobs" | "news" | "events"
  const [searchTerm, setSearchTerm] = useState("");

  // Staff monitor the trash; only SuperAdmins may restore or purge.
  const canManage = getSession()?.role === "SuperAdmin";

  async function loadTrash() {
    setLoading(true);
    try {
      const [jobs, news, events] = await Promise.all([getDeletedJobs(), getDeletedNews(), getDeletedEvents()]);
      setDeletedJobs(jobs);
      setDeletedNews(news);
      setDeletedEvents(events);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrash();
  }, []);

  async function askRestoreJob(job) {
    if (!(await askConfirm(`Restore "${job.jobTitle}"?`, { confirmLabel: "Restore" }))) return;
    try {
      await restoreJob(job.id);
      notifySuccess("Job restored.");
      loadTrash();
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function askPermanentDeleteJob(job) {
    if (!(await askConfirm(`Permanently delete "${job.jobTitle}"? This cannot be undone.`, { confirmLabel: "Delete forever", danger: true }))) return;
    try {
      await permanentlyDeleteJob(job.id);
      notifySuccess("Job permanently deleted.");
      loadTrash();
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function askRestoreNews(item) {
    if (!(await askConfirm(`Restore "${item.title}"?`, { confirmLabel: "Restore" }))) return;
    try {
      await restoreNews(item.id);
      notifySuccess("News restored.");
      loadTrash();
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function askPermanentDeleteNews(item) {
    if (!(await askConfirm(`Permanently delete "${item.title}"? This cannot be undone.`, { confirmLabel: "Delete forever", danger: true }))) return;
    try {
      await permanentlyDeleteNews(item.id);
      notifySuccess("News permanently deleted.");
      loadTrash();
    } catch (err) {
      notifyError(err.message);
    }
  }

  const trashCount = deletedJobs.length + deletedNews.length + deletedEvents.length;

  async function askRestoreEvent(event) {
    if (!(await askConfirm(`Restore "${event.title}"?`, { confirmLabel: "Restore" }))) return;
    try {
      await restoreEvent(event.id);
      notifySuccess("Event restored.");
      loadTrash();
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function askPermanentDeleteEvent(event) {
    if (!(await askConfirm(`Permanently delete "${event.title}"? This cannot be undone.`, { confirmLabel: "Delete forever", danger: true }))) return;
    try {
      await permanentlyDeleteEvent(event.id);
      notifySuccess("Event permanently deleted.");
      loadTrash();
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function askEmptyTrash() {
    if (trashCount === 0) return;
    if (!(await askConfirm(`Permanently delete all ${trashCount} item${trashCount === 1 ? "" : "s"} in trash? This cannot be undone.`, { confirmLabel: "Empty trash", danger: true }))) return;
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
      notifySuccess(`Emptied trash (${trashCount} item${trashCount === 1 ? "" : "s"} deleted).`);
      loadTrash();
    } catch (err) {
      notifyError(err.message);
    }
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
    <div style={pageWrap}>
      <div style={{ ...toolbar, justifyContent: "space-between" }}>
        <span style={{ ...cardMeta }}>
          {canManage
            ? "Restore or permanently delete items below."
            : "Read-only monitoring view — a SuperAdmin can restore or delete items."}
        </span>
        {canManage && (
          <button
            style={btnDanger}
            onClick={askEmptyTrash}
            disabled={loading || trashCount === 0}
            title={trashCount === 0 ? "Trash is empty" : `Permanently delete all ${trashCount} items`}
          >
            <Trash2 size={15} />
            Empty Trash{trashCount > 0 ? ` (${trashCount})` : ""}
          </button>
        )}
      </div>

      <div style={filterRow}>
        <SearchBox
          placeholder="Search deleted jobs, news, or events..."
          value={searchTerm}
          onChange={setSearchTerm}
          onReset={() => setSearchTerm("")}
        />

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
        <EmptyState
          icon={Trash2}
          title={searchTerm ? "Nothing matches your search" : "Trash is empty"}
          hint={
            searchTerm
              ? "Try a different search or clear the filters."
              : "Deleted jobs, news, and events will show up here."
          }
        />
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
                  <p style={{ ...cardMeta, margin: 0, fontWeight: 700, color: "var(--text)", fontSize: 13.5 }}>
                    {item.type === "Event" ? "Event date" : "Posted"} {new Date(item.postedAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  style={{
                    ...pill,
                    marginLeft: "auto", flexShrink: 0,
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999,
                    ...statusTone(item.type === "Job" ? "info" : item.type === "Event" ? "success" : "violet"),
                  }}
                >
                  {item.type === "Job" ? <Briefcase size={13} /> : item.type === "Event" ? <CalendarDays size={13} /> : <Newspaper size={13} />}
                  {item.type}
                </span>
              </div>

              {canManage && (
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
                  <div style={{ marginLeft: "auto" }}>
                    <KebabMenu
                      label={`More actions for ${item.title}`}
                      items={[
                        { key: "delete", label: "Delete forever", icon: Trash2, danger: true, onClick: item.onDeleteForever },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
