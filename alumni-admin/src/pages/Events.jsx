import { useEffect, useState } from "react";
import { getAllEvents, createEvent, updateEvent, deleteEvent, getEventAttendees } from "../services/eventsApi";
import { getSession } from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";

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

  const [attendeeEvent, setAttendeeEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  const isSuperAdmin = getSession()?.role === "SuperAdmin";

  async function loadEvents() {
    setLoading(true);
    setError("");
    try {
      const data = await getAllEvents();
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

  function openCreateModal() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(event) {
    setEditingId(event.id);
    setForm({
      title: event.title || "",
      description: event.description || "",
      location: event.location || "",
      eventDate: event.eventDate ? toLocalDateTimeInputValue(event.eventDate) : "",
    });
    setShowModal(true);
  }

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
      closeModal();
      loadEvents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      await deleteEvent(confirmDeleteId);
      loadEvents();
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
        <button onClick={openCreateModal}>+ Add New Event</button>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading events...</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Location</th>
              <th>Date</th>
              <th>Going</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan="5">No events yet.</td>
              </tr>
            )}
            {events.map((event) => (
              <tr key={event.id}>
                <td>{event.title}</td>
                <td>{event.location}</td>
                <td>{event.eventDate ? new Date(event.eventDate).toLocaleString() : "—"}</td>
                <td>{event.attendeeCount ?? 0}</td>
                <td>
                  <button onClick={() => openEditModal(event)}>Edit</button>{" "}
                  <button onClick={() => openAttendees(event)}>Attendees</button>{" "}
                  {isSuperAdmin && (
                    <button onClick={() => setConfirmDeleteId(event.id)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              maxWidth: 500,
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Event" : "Add New Event"}</h3>
              <button onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
              <div>
                <label>Title</label><br />
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Location</label><br />
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Date &amp; Time</label><br />
                <input
                  type="datetime-local"
                  value={form.eventDate}
                  onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                  required
                />
              </div>

              <div style={{ marginTop: 10 }}>
                <label>Description</label><br />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  required
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingId ? "Update Event" : "Add Event"}
                </button>
                <button type="button" onClick={closeModal} style={{ marginLeft: 8 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {attendeeEvent && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setAttendeeEvent(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              maxWidth: 600,
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>
                Attendees ({attendeeEvent.title})
              </h3>
              <button onClick={() => setAttendeeEvent(null)}>✕</button>
            </div>

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
          </div>
        </div>
      )}

      <ConfirmDialog
        message={confirmDeleteId ? "Delete this event permanently? RSVPs will also be removed." : null}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
