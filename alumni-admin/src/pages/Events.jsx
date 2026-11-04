import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Users, Download, CalendarDays } from "lucide-react";
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventAttendees, eventImageUrl } from "../services/eventsApi";
import { getSession } from "../services/api";
import { cardGrid, card, cardTitle, cardMeta, pill, statusTone, SearchBox, useDirtyGuard, iconButton, ModalShell, Field, textInput, btn, btnPrimary, toolbar, filterRow, EmptyState, pageWrap } from "../components/kit";
import ImageDropZone from "../components/ImageDropZone";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";
import KebabMenu from "../components/KebabMenu";

const AttendeesButton = iconButton("Attendees", Users);

// Themed attendees-table cells (the old raw border=1 table rendered
// unstyled — invisible borders — once dark mode landed).
const attendeeTh = {
  background: "var(--surface-alt)",
  color: "var(--text)",
  textAlign: "left",
  fontWeight: 650,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
};

const attendeeTd = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--border)",
  color: "var(--text)",
};

const emptyForm = {
  title: "",
  description: "",
  location: "",
  eventDate: "",
  mode: "now",
  publishAt: "",
  imageFile: null,
  removeImage: false,
};

const modeChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  padding: "8px 13px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface-alt)",
  color: "var(--text)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const modeChipOn = {
  border: "1px solid var(--primary)",
  background: "var(--success-tint)",
  color: "var(--primary-strong)",
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // The preview URL and the stored flyer live outside `form`: an object URL
  // is an unstable string that would defeat the dirty-guard's pristine
  // comparison, and we must revoke the blob ourselves when the modal
  // closes. The chosen `File` itself rides in `form` so picking one marks
  // the form dirty.
  const [existingImage, setExistingImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const objectUrlRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [attendeeEvent, setAttendeeEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const { withGuard, setDirty } = useDirtyGuard();
  const pristineRef = useRef("");
  const modalFormRef = useRef(null);

  const isSuperAdmin = getSession()?.role === "SuperAdmin";

  async function loadEvents(activeSearch = "", activeStatus = "") {
    setLoading(true);
    try {
      const data = await getAllEvents(activeSearch, activeStatus);
      setEvents(data);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getAllEvents();
        if (active) setEvents(data);
      } catch (err) {
        if (active) notifyError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function submitSearch(e) {
    e?.preventDefault?.();
    loadEvents(searchTerm, statusFilter);
  }

  function resetSearch() {
    setSearchTerm("");
    loadEvents("", statusFilter);
  }

  function changeStatusFilter(e) {
    const next = e.target.value;
    setStatusFilter(next);
    loadEvents(searchTerm, next);
  }

  function updateForm(patch) {
    const next = { ...form, ...patch };
    setForm(next);
    setDirty(JSON.stringify(next) !== pristineRef.current);
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setExistingImage(null);
    setPreviewUrl(null);
    pristineRef.current = JSON.stringify(emptyForm);
    setDirty(false);
    setShowModal(true);
  }

  function openEditModal(event) {
    setEditingId(event.id);
    const nextForm = {
      title: event.title || "",
      description: event.description || "",
      location: event.location || "",
      eventDate: event.eventDate ? toLocalDateTimeInputValue(event.eventDate) : "",
      // Like News, non-null PublishAt always means "still waiting" because
      // due schedules are collapsed to null before they are announced.
      mode: event.publishAt ? "schedule" : "now",
      publishAt: event.publishAt ? toLocalDateTimeInputValue(event.publishAt) : "",
      imageFile: null,
      removeImage: false,
    };
    const stored = eventImageUrl(event.imagePath);
    setForm(nextForm);
    setExistingImage(stored);
    setPreviewUrl(stored);
    pristineRef.current = JSON.stringify(nextForm);
    setDirty(false);
    setShowModal(true);
  }

  const closeModalGuarded = () => withGuard(closeModal, { onSaveDraft: saveDraft });

  function closeModal() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setExistingImage(null);
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function pickImage(file) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    updateForm({ imageFile: file, removeImage: false });
  }

  function clearImage() {
    if (objectUrlRef.current) {
      // Dropping a freshly picked file falls back to the stored flyer.
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      setPreviewUrl(existingImage);
      updateForm({ imageFile: null });
      return;
    }
    setPreviewUrl(null);
    updateForm({ imageFile: null, removeImage: true });
  }

  function toLocalDateTimeInputValue(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function toIso(local) {
    const parsed = new Date(local);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  // intent: publish immediately, schedule publication, or keep as draft.
  async function save(intent) {
    const eventDate = toIso(form.eventDate);
    const publishAt = intent === "schedule" ? toIso(form.publishAt) : null;

    if (!eventDate) {
      notifyError("Pick the event date and time.");
      return false;
    }
    if (intent === "schedule" && !publishAt) {
      notifyError("Pick the date and time to publish this event.");
      return false;
    }
    if (
      intent === "schedule" &&
      new Date(publishAt).getTime() > Date.now() &&
      new Date(publishAt).getTime() >= new Date(eventDate).getTime()
    ) {
      notifyError("Publish time must be before the event date and time.");
      return false;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        eventDate,
        isPublished: intent !== "draft",
        publishAt,
        imageFile: form.imageFile,
        removeImage: form.removeImage,
      };

      if (editingId) {
        await updateEvent(editingId, payload);
      } else {
        await createEvent(payload);
      }
      setDirty(false);
      closeModal();
      loadEvents(searchTerm, statusFilter);
      return true;
    } catch (err) {
      notifyError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    save(form.mode === "schedule" ? "schedule" : "publish");
  }

  function saveDraft() {
    // type="button" does not invoke native required-field validation.
    if (!modalFormRef.current?.reportValidity()) return false;
    return save("draft");
  }

  function handleSaveDraft() {
    saveDraft();
  }

  async function handleDelete(event) {
    const ok = await askConfirm(`Move "${event.title}" to trash? You can restore it later.`, {
      confirmLabel: "Move to trash",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteEvent(event.id);
      loadEvents(searchTerm, statusFilter);
    } catch (err) {
      notifyError(err.message);
    }
  }

  async function openAttendees(event) {
    setAttendeeEvent(event);
    setAttendees([]);
    setLoadingAttendees(true);
    try {
      const data = await getEventAttendees(event.id);
      setAttendees(data);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoadingAttendees(false);
    }
  }

  function exportAttendeesCsv() {
    if (attendees.length === 0) return;
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      ["Name", "Alumni Number", "Program", "School Year", "RSVP Date"],
      ...attendees.map((a) => [
        esc(a.fullName),
        esc(a.studentNumber),
        esc(a.program),
        esc(a.schoolYear),
        esc(a.rsvpedAt ? new Date(a.rsvpedAt).toLocaleString() : ""),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = (attendeeEvent?.title || "event").replace(/[\\/:*?"<>|]+/g, "_").trim();
    link.href = url;
    link.download = `attendees_${safeTitle || "event"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={pageWrap}>
      <div style={{ ...toolbar, justifyContent: "flex-end" }}>
        <button onClick={openCreateModal} style={btnPrimary}>
          <Plus size={15} />
          Add New Event
        </button>
      </div>

      <form onSubmit={submitSearch} style={filterRow}>
        <SearchBox
          placeholder="Search title or location"
          value={searchTerm}
          onChange={setSearchTerm}
          onSubmit={submitSearch}
          onReset={resetSearch}
        />
        <select
          aria-label="Filter events by status"
          value={statusFilter}
          onChange={changeStatusFilter}
          style={{ ...textInput, width: "auto", minWidth: 160 }}
        >
          <option value="">All events</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </form>

      {loading ? (
        <GridSkeleton count={6} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          hint={searchTerm ? "Try a different search." : "Add the first event to see it here."}
        />
      ) : (
        <div style={cardGrid}>
          {events.map((event) => {
            // Existing baseline rule: this is display-only state evaluated
            // when the list renders, not a value used to drive React state.
            // eslint-disable-next-line react-hooks/purity
            const isPast = event.eventDate ? new Date(event.eventDate).getTime() < Date.now() : false;
            const publicationLabel = event.isPublished === false
              ? "Draft"
              : event.publishAt
                ? "Scheduled"
                : "Published";
            const publicationTone = event.isPublished === false
              ? statusTone("warning")
              : event.publishAt
                ? statusTone("info")
                : statusTone("success");
            return (
            <div key={event.id} style={card}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                {eventImageUrl(event.imagePath) && (
                  <img
                    src={eventImageUrl(event.imagePath)}
                    alt=""
                    style={{ width: 58, height: 58, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 style={cardTitle}>{event.title}</h3>
                    <span style={{ ...pill, ...(isPast ? statusTone("danger") : statusTone("success")) }}>
                      {isPast ? "Past" : "Upcoming"}
                    </span>
                    <span style={{ ...pill, ...publicationTone }}>{publicationLabel}</span>
                  </div>
                  <p style={{ ...cardMeta, fontWeight: 700, color: "var(--text)", fontSize: 13.5 }}>{event.eventDate ? new Date(event.eventDate).toLocaleString() : "—"}</p>
                  {event.publishAt && (
                    <p style={{ ...cardMeta, color: "var(--info)", fontWeight: 600 }}>
                      Publishes {new Date(event.publishAt).toLocaleString()}
                    </p>
                  )}
                  {event.isPublished === false && (
                    <p style={{ ...cardMeta, color: "var(--warning)", fontWeight: 600 }}>
                      Not visible to alumni
                    </p>
                  )}
                  <p style={{ ...cardMeta, fontWeight: 700, color: "var(--text)", fontSize: 13.5 }}>Location: {event.location}</p>
                  <p style={{ ...cardMeta, display: "flex", alignItems: "center", gap: 5 }}>
                    <Users size={13} />
                    {event.attendeeCount ?? 0} going
                  </p>
                </div>
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
                <AttendeesButton onClick={() => openAttendees(event)} />
                <div style={{ marginLeft: "auto" }}>
                  <KebabMenu
                    label={`More actions for ${event.title}`}
                    items={[
                      { key: "edit", label: "Edit event", icon: Pencil, onClick: () => openEditModal(event) },
                      { key: "delete", label: "Delete event", icon: Trash2, danger: true, dividerBefore: true, hidden: !isSuperAdmin, onClick: () => handleDelete(event) },
                    ]}
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <ModalShell title={editingId ? "Edit Event" : "Add New Event"} onClose={closeModalGuarded}>
          <form ref={modalFormRef} onSubmit={handleSubmit}>
            <Field label="Title">
              <input
                type="text"
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Location">
              <input
                type="text"
                value={form.location}
                onChange={(e) => updateForm({ location: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Date & Time">
              <input
                type="datetime-local"
                value={form.eventDate}
                onChange={(e) => updateForm({ eventDate: e.target.value })}
                required
                style={textInput}
              />
            </Field>

            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={6}
                required
                style={{ ...textInput, minHeight: 130, resize: "vertical" }}
              />
            </Field>

            <div style={{ marginBottom: 14 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text)" }}>
                Publishing
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <label style={{ ...modeChip, ...(form.mode === "now" ? modeChipOn : null) }}>
                  <input
                    type="radio"
                    name="event-publish-mode"
                    checked={form.mode === "now"}
                    onChange={() => updateForm({ mode: "now" })}
                  />
                  Publish now
                </label>
                <label style={{ ...modeChip, ...(form.mode === "schedule" ? modeChipOn : null) }}>
                  <input
                    type="radio"
                    name="event-publish-mode"
                    checked={form.mode === "schedule"}
                    onChange={() => updateForm({ mode: "schedule" })}
                  />
                  Schedule
                </label>
              </div>

              {form.mode === "schedule" && (
                <>
                  <input
                    type="datetime-local"
                    value={form.publishAt}
                    onChange={(e) => updateForm({ publishAt: e.target.value })}
                    required
                    style={{ ...textInput, marginTop: 8 }}
                  />
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    Alumni won&apos;t see this event until then. The publish time must be before the event starts.
                  </div>
                </>
              )}
            </div>

            <Field label={`Flyer ${editingId ? "(drop to replace)" : "(optional)"}`}>
              <ImageDropZone
                previewUrl={previewUrl}
                fileName={form.imageFile ? form.imageFile.name : null}
                onPick={pickImage}
                onRemove={previewUrl ? clearImage : null}
                hint="JPG, PNG, GIF, WebP or BMP · up to 5 MB"
              />
            </Field>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button type="button" onClick={closeModalGuarded} disabled={saving} style={btn}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveDraft} disabled={saving} style={btn}>
                Save Draft
              </button>
              <button type="submit" disabled={saving} style={btnPrimary}>
                {saving
                  ? "Saving..."
                  : form.mode === "schedule"
                    ? "Schedule Event"
                    : editingId
                      ? "Update & Publish"
                      : "Publish Event"}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {attendeeEvent && (
        <ModalShell title={`Attendees (${attendeeEvent.title})`} onClose={() => setAttendeeEvent(null)} width={620}>
          {loadingAttendees ? (
            <p>Loading attendees...</p>
          ) : attendees.length === 0 ? (
            <p>No RSVPs yet.</p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>{attendees.length} going</span>
                <button style={btn} onClick={exportAttendeesCsv}>
                  <Download size={15} />
                  Export CSV
                </button>
              </div>
              <div style={{ overflowX: "auto", margin: "0 -4px", padding: "0 4px" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  minWidth: 560,
                  border: "1px solid var(--border)",
                  fontSize: 13,
                  color: "var(--text)",
                }}
              >
                <thead>
                  <tr>
                    <th scope="col" style={attendeeTh}>Name</th>
                    <th scope="col" style={attendeeTh}>Alumni #</th>
                    <th scope="col" style={attendeeTh}>Program</th>
                    <th scope="col" style={attendeeTh}>Year</th>
                    <th scope="col" style={attendeeTh}>RSVP Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a) => (
                    <tr key={a.id}>
                      <td style={attendeeTd}>{a.fullName}</td>
                      <td style={attendeeTd}>{a.studentNumber}</td>
                      <td style={attendeeTd}>{a.program}</td>
                      <td style={attendeeTd}>{a.schoolYear}</td>
                      <td style={attendeeTd}>{a.rsvpedAt ? new Date(a.rsvpedAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </ModalShell>
      )}
    </div>
  );
}
