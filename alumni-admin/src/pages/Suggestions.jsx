import { useEffect, useState, useMemo } from "react";
import {
  Lightbulb, Clock3, Check, XCircle, RotateCcw, Eye,
  ExternalLink, Search as SearchIcon,
} from "lucide-react";
import { API_BASE_URL } from "../config";
import { getSuggestions, reviewSuggestion } from "../services/suggestionsApi";
import { notifyError, notifySuccess } from "../components/toastBus";
import { askConfirm } from "../components/confirmBus";
import {
  SearchBox, cardGrid, card, cardTitle, cardMeta, pill, statusTone,
  ModalShell, Field, textInput, btn, btnPrimary, btnDanger,
  toolbar, filterRow, EmptyState, pageWrap,
} from "../components/kit";
import { GridSkeleton } from "../components/Skeleton";

const FILE_ROOT = API_BASE_URL.replace("/api", "");

const STATUS_FILTERS = ["", "Pending", "Approved", "Rejected"];

function fileUrl(path) {
  if (!path) return null;
  return `${FILE_ROOT}/${String(path).replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

function statusToneFor(status) {
  if (status === "Approved") return statusTone("success");
  if (status === "Rejected") return statusTone("danger");
  return statusTone("warning");
}

// Preview of a suggestion image — thumbnail that opens full size.
function SuggestionImage({ path }) {
  const url = fileUrl(path);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
      <img
        src={url}
        alt="Suggestion"
        style={{
          width: 84, height: 84, objectFit: "cover",
          border: "1px solid var(--border)", borderRadius: 8,
          background: "var(--surface-alt)",
        }}
      />
    </a>
  );
}

// Community post suggestions: users endorse their business / look for
// clients; approval publishes the post to the Community feed.
export default function Suggestions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await getSuggestions(statusFilter);
      setItems(res.items || []);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function openReview(item) {
    setSelected(item);
    setNote("");
  }

  async function handleReview(status) {
    if (!selected) return;

    if (status === "Rejected" && !note.trim()) {
      notifyError("A reason is required when rejecting a suggestion.");
      return;
    }

    const ok = await askConfirm(
      status === "Approved"
        ? `Publish "${selected.title}" by ${selected.fullName} to the Community feed? Everyone will see it.`
        : `Reject "${selected.title}" by ${selected.fullName}? They will see your reason and can resubmit.`,
      { confirmLabel: status === "Approved" ? "Approve" : "Reject", danger: status === "Rejected" }
    );
    if (!ok) return;

    setSaving(true);
    try {
      const res = await reviewSuggestion(selected.id, status, note.trim() || null);
      notifySuccess(res.message || "Suggestion reviewed.");
      setSelected(null);
      await load();
    } catch (err) {
      notifyError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (s) =>
        s.title?.toLowerCase().includes(term) ||
        s.content?.toLowerCase().includes(term) ||
        s.fullName?.toLowerCase().includes(term) ||
        s.studentNumber?.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  const pendingCount = items.filter((s) => s.status === "Pending").length;

  return (
    <div style={pageWrap}>
      <div style={{ ...toolbar, justifyContent: "space-between" }}>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
          Post suggestions from the mobile app — endorse a business, offer
          services, or look for clients. Approved posts publish to the Community feed.
        </p>
        <button type="button" style={btn} onClick={load}>
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      {pendingCount > 0 && statusFilter !== "Approved" && statusFilter !== "Rejected" && (
        <div
          style={{
            ...card, display: "flex", alignItems: "center", gap: 10,
            borderLeft: "4px solid var(--warning, #D4A017)", padding: "12px 16px",
          }}
        >
          <Clock3 size={16} color="var(--muted)" />
          <span style={{ fontSize: 13.5, color: "var(--text)" }}>
            <strong>{pendingCount}</strong> suggestion{pendingCount !== 1 ? "s" : ""} waiting for review
          </span>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────── */}
      <div style={filterRow}>
        <SearchBox
          placeholder="Search title, post text, name, alumni number"
          value={searchTerm}
          onChange={setSearchTerm}
          onReset={() => setSearchTerm("")}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...textInput, width: "auto", minWidth: 160 }}
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s || "all"} value={s}>
              {s ? s : "All Statuses"}
            </option>
          ))}
        </select>
      </div>

      {loading && <GridSkeleton count={6} />}

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="No suggestions found"
          hint={
            items.length === 0
              ? "No one has submitted a post suggestion yet."
              : "Try a different search or status filter."
          }
        />
      )}

      {!loading && filtered.length > 0 && (
        <>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            {filtered.length} suggestion{filtered.length !== 1 ? "s" : ""} found
          </p>
          <div style={cardGrid}>
            {filtered.map((s) => (
              <div key={s.id} style={card}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ ...cardTitle, margin: 0 }}>{s.title}</h4>
                    <p style={{ ...cardMeta, margin: "3px 0 0", fontWeight: 700, color: "var(--text)" }}>
                      {s.fullName} • {s.studentNumber}
                    </p>
                    <p style={{ ...cardMeta, margin: "2px 0 0" }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span style={{ ...pill, ...statusToneFor(s.status) }}>{s.status}</span>
                </div>

                <div style={{ display: "flex", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                  <p
                    style={{
                      ...cardMeta, margin: 0, flex: 1, minHeight: 0,
                      display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
                      overflow: "hidden", lineHeight: 1.5,
                    }}
                  >
                    {s.content}
                  </p>
                  <SuggestionImage path={s.imagePath} />
                </div>

                {s.status === "Rejected" && s.reviewNote && (
                  <div
                    style={{
                      ...cardMeta, background: "var(--danger-tint)", color: "var(--danger)",
                      padding: "7px 10px", borderRadius: 8,
                    }}
                  >
                    {s.reviewNote}
                  </div>
                )}
                {s.status === "Approved" && s.newsId && (
                  <div style={{ ...cardMeta, color: "var(--success, var(--primary))" }}>
                    Published to the Community feed
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
                  <button
                    type="button"
                    style={{ ...btn, flex: 1, justifyContent: "center" }}
                    onClick={() => openReview(s)}
                  >
                    <Eye size={15} /> {s.status === "Pending" ? "Review" : "View"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Review modal ──────────────────────────────────── */}
      {selected && (
        <ModalShell
          title={`Review — ${selected.title}`}
          onClose={() => !saving && setSelected(null)}
          width={640}
        >
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
              <span style={{ ...pill, ...statusToneFor(selected.status) }}>{selected.status}</span>
              <span style={{ ...cardMeta }}>
                {selected.fullName} • {selected.studentNumber} • {selected.email}
              </span>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--muted)", marginBottom: 8 }}>
                Post content
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                {selected.title}
              </div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--text)", whiteSpace: "pre-wrap" }}>
                {selected.content}
              </p>
              {selected.imagePath && (
                <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                  <SuggestionImage path={selected.imagePath} />
                  <a
                    href={fileUrl(selected.imagePath)}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      fontSize: 12.5, color: "var(--primary)", fontWeight: 600,
                    }}
                  >
                    <ExternalLink size={13} /> Open full size
                  </a>
                </div>
              )}
              <div style={{ ...cardMeta, marginTop: 10 }}>
                Submitted {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "—"}
              </div>
            </div>

            {selected.status !== "Pending" && (
              <div style={{ ...cardMeta, marginBottom: 12 }}>
                Reviewed by {selected.reviewedByName || "—"}
                {selected.reviewedAt ? ` on ${new Date(selected.reviewedAt).toLocaleDateString()}` : ""}
                {selected.reviewNote ? ` — ${selected.reviewNote}` : ""}
              </div>
            )}

            {selected.status === "Pending" && (
              <>
                <Field label="Note to poster" hint="Required when rejecting. Optional when approving.">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="e.g. Please remove your phone number from the post text and use direct messages instead."
                    style={{ ...textInput, resize: "vertical", fontFamily: "inherit" }}
                  />
                </Field>

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" style={btn} onClick={() => setSelected(null)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="button" style={btnDanger} onClick={() => handleReview("Rejected")} disabled={saving}>
                    <XCircle size={15} /> Reject
                  </button>
                  <button type="button" style={btnPrimary} onClick={() => handleReview("Approved")} disabled={saving}>
                    <Check size={15} /> {saving ? "Saving..." : "Approve & Publish"}
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalShell>
      )}
    </div>
  );
}
