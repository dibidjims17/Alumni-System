import { useState, useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { subscribeDiscard } from "./discardBus";
import { ModalShell, btnPrimary, btnDanger } from "./kit";

// Themed replacement for window.confirm on unsaved changes.
// Mount once (e.g., in Layout); useDirtyGuard triggers it via discardBus.
export default function DiscardHost() {
  const [request, setRequest] = useState(null);

  useEffect(() => subscribeDiscard((r) => setRequest(r)), []);

  function close() {
    setRequest(null);
  }

  function confirmDiscard() {
    const fn = request?.onDiscard;
    setRequest(null);
    if (fn) fn();
  }

  if (!request) return null;

  return (
    <ModalShell title="Unsaved changes" onClose={close} width={380}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <TriangleAlert size={20} color="var(--danger)" style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0, color: "var(--text)", lineHeight: 1.5 }}>
          You have unsaved changes. Leave without saving?
        </p>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <button style={btnDanger} onClick={confirmDiscard}>
          Discard changes
        </button>
        <button style={btnPrimary} onClick={close}>
          Keep editing
        </button>
      </div>
    </ModalShell>
  );
}
