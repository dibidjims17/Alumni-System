import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventAttendees } from "../services/eventsApi";
import { getSession } from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { cardGrid, card, cardTitle, cardMeta, actionsRow, SearchBox, useDirtyGuard, iconButton, ModalShell, Field, textInput } from "../components/kit";

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
      setError(err.message);
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
        if (active) setError(err.message);
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
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      await deleteEvent(confirmDeleteId);
      loadEvents(searchTerm);
    } catch (err) {
      setError(err.message);
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
      setError(err.message);
    } finally {
      setLoadingAttendees(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Events</h2>
        <button onClick={openCreateModal} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={15} />
          Add New Event
        </button>
      </div>

      <form onSubmit={submitSearch} style={{ margin: "16px 0", display: "flex", gap: 8, alignItems: "center" }}>
        <SearchBox
          placeholder="Search title or location"
          value={searchTerm}
          onChange={setSearchTerm}
          onSubmit={submitSearch}
          onReset={resetSearch}
        />
        <button type="submit">Search</button>
        {searchTerm.trim() !== "" && (
          <button type="button" onClick={resetSearch}>Reset</button>
        )}
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading events...</p>
      ) : events.length === 0 ? (
        <p>No events yet.</p>
      ) : (
        <div style={cardGrid}>
          {events.map((event) => (
            <div key={event.id} style={card}>
              <h3 style={cardTitle}>{event.title}</h3>
              <p style={cardMeta}>{event.eventDate ? new Date(event.eventDate).toLocaleString() : "—"}</p>
              <p style={cardMeta}>Location: {event.location}</p>
              <p style={{ ...cardMeta, display: "flex", alignItems: "center", gap: 5 }}>
                <Users size={13} />
                {event.attendeeCount ?? 0} going
              </p>
              <div style={actionsRow}>
                <EditButton onClick={() => openEditModal(event)} />
                <AttendeesButton onClick={() => openAttendees(event)} />
                {isSuperAdmin && <DeleteButton onClick={() => setConfirmDeleteId(event.id)} />}
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
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Event" : "Add Event"}
              </button>
              <button type="button" onClick={closeModalGuarded}>
                Cancel
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {attendeeEvent && (
        <ModalShell title={`Attendees (${attendeeEvent.title})`} onClose={() => setAttendeeEvent(null)} width={600}>
          {loadingAttendees ? (
            <p>Loading attendees...</p>
          ) : attendees.length === 0 ? (
            <p>No RSVPs yet.</p>
          ) : (
            <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Student #</th>
                  <th>Program</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id}>
                    <td>{a.fullName}</td>
                    <td>{a.studentNumber}</td>
                    <td>{a.program}</td>
                    <td>{a.schoolYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
