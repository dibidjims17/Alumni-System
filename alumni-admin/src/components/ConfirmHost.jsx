import { useState, useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { subscribeConfirm } from "./confirmBus";
import { ModalShell, btnPrimary, btnDanger, btn } from "./kit";

// Themed confirmation dialog. Handles every confirm() call raised via askConfirm.
export default function ConfirmHost() {
  const [request, setRequest] = useState(null);

  useEffect(
    () =>
      subscribeConfirm((r) => {
        setRequest({ ...r, resolve: (value) => r.resolve(value) });
      }),
    []
  );

  function answer(value) {
    const fn = request?.resolve;
    setRequest(null);
    if (fn) fn(value);
  }

  if (!request) return null;

  return (
    <ModalShell title="Please confirm" onClose={() => answer(false)} width={380} zIndex={3100}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <TriangleAlert size={20} color={request.danger ? "var(--danger)" : "var(--primary)"} style={{ marginTop: 2, flexShrink: 0 }} />
        <p style={{ margin: 0, color: "var(--text)", lineHeight: 1.5 }}>{request.message}</p>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <button style={btn} onClick={() => answer(false)}>Cancel</button>
        <button
          style={request.danger ? btnDanger : btnPrimary}
          onClick={() => answer(true)}
        >
          {request.confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}
