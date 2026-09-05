import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Users, Download } from "lucide-react";
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventAttendees } from "../services/eventsApi";
import { getSession } from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { cardGrid, card, cardTitle, cardMeta, SearchBox, useDirtyGuard, iconButton, ModalShell, Field, textInput, btn, btnPrimary, toolbar, toolbarFilters, toolbarActions } from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";
import { notifyError } from "../components/toastBus";

const EditButton = iconButton("Edit", Pencil);
const DeleteButton = iconButton("Delete", Trash2);
const AttendeesButton = iconButton("Attendees", Users);

const emptyForm = {
  title: "",
  description: "",
  location: "",
  eventDate: "",
};

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  const [attendeeEvent, setAttendeeEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const { withGuard, setDirty } = useDirtyGuard();
  const pristineRef = useRef("");

  const isSuperAdmin = getSession()?.role === "SuperAdmin";

  async function loadEvents(activeSearch = "") {
    setLoading(true);
    setError("");
    try {
      const data = await getAllEvents(activeSearch);
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
    loadEvents(searchTerm);
  }

  function resetSearch() {
    setSearchTerm("");
    loadEvents("");
  }

  function updateForm(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  }

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
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
    };
    setForm(nextForm);
    pristineRef.current = JSON.stringify(nextForm);
    setDirty(false);
    setShowModal(true);
  }

  const closeModalGuarded = () => withGuard(closeModal);

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function toLocalDateTimeInputValue(iso) {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        eventDate: new Date(form.eventDate).toISOString(),
      };

      if (editingId) {
        await updateEvent(editingId, payload);
      } else {
        await createEvent(payload);
      }
      setDirty(false);
      closeModal();
      loadEvents(searchTerm);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      await deleteEvent(confirmDeleteId);
      loadEvents(searchTerm);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setConfirmDeleteId(null);
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
      ["Name", "Student Number", "Program", "School Year", "RSVP Date"],
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
    <div>
      <div style={toolbar}>
        <form onSubmit={submitSearch} style={{ ...toolbarFilters, flex: 1 }}>
          <SearchBox
            placeholder="Search title or location"
            value={searchTerm}
            onChange={setSearchTerm}
            onSubmit={submitSearch}
            onReset={resetSearch}
          />
        </form>
        <div style={toolbarActions}>
          <button onClick={openCreateModal} style={btnPrimary}>
            <Plus size={15} />
            Add New Event
          </button>
        </div>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <GridSkeleton count={6} />
      ) : events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <div style={cardGrid}>
          {events.map((event) => (
            <div key={event.id} style={card}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <h3 style={cardTitle}>{event.title}</h3>
                  <p style={cardMeta}>{event.eventDate ? new Date(event.eventDate).toLocaleString() : "—"}</p>
                  <p style={cardMeta}>Location: {event.location}</p>
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
                <EditButton onClick={() => openEditModal(event)} />
                <AttendeesButton onClick={() => openAttendees(event)} />
                {isSuperAdmin && <DeleteButton onClick={() => setConfirmDeleteId(event.id)} style={{ color: "var(--danger)", borderColor: "var(--danger)" }} />}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ModalShell title={editingId ? "Edit Event" : "Add New Event"} onClose={closeModalGuarded}>
          <form onSubmit={handleSubmit}>
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

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving} style={btnPrimary}>
                {saving ? "Saving..." : editingId ? "Update Event" : "Add Event"}
              </button>
              <button type="button" onClick={closeModalGuarded} style={btn}>
                Cancel
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
              <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student #</th>
                    <th>Program</th>
                    <th>Year</th>
                    <th>RSVP Date</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a) => (
                    <tr key={a.id}>
                      <td>{a.fullName}</td>
                      <td>{a.studentNumber}</td>
                      <td>{a.program}</td>
                      <td>{a.schoolYear}</td>
                      <td>{a.rsvpedAt ? new Date(a.rsvpedAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )}
        </ModalShell>
      )}

      <ConfirmDialog
        message={confirmDeleteId ? "Delete this event permanently? RSVPs will also be removed." : null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
