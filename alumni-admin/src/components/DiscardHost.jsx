import { useState, useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { subscribeDiscard } from "./discardBus";
import { ModalShell, btn, btnPrimary, btnDanger } from "./kit";

// Themed replacement for window.confirm on unsaved changes.
// Mount once (e.g., in Layout); useDirtyGuard triggers it via discardBus.
export default function DiscardHost() {
  const [request, setRequest] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeDiscard((r) => setRequest(r)), []);

  function close() {
    if (saving) return;
    setRequest(null);
  }

  function confirmDiscard() {
    if (saving) return;
    const fn = request?.onDiscard;
    setRequest(null);
    if (fn) fn();
  }

  async function saveDraft() {
    const fn = request?.onSaveDraft;
    if (!fn || saving) return;

    setSaving(true);
    try {
      await fn();
    } finally {
      setSaving(false);
      // Validation/save failures leave the editor itself open, where the
      // field error or toast is visible and can be corrected.
      setRequest(null);
    }
  }

  if (!request) return null;

  return (
    <ModalShell title="Unsaved changes" onClose={close} width={520} zIndex={3000}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <TriangleAlert size={20} color="var(--danger)" style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0, color: "var(--text)", lineHeight: 1.5 }}>
          You have unsaved changes. Leave without saving?
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "nowrap", marginTop: 20 }}>
        <button style={btnDanger} onClick={confirmDiscard} disabled={saving}>
          Discard changes
        </button>
        {request.onSaveDraft && (
          <button style={btn} onClick={saveDraft} disabled={saving}>
            {saving ? "Saving draft..." : "Save as draft"}
          </button>
        )}
        <button style={btnPrimary} onClick={close} disabled={saving}>
          Keep editing
        </button>
      </div>
    </ModalShell>
  );
}
