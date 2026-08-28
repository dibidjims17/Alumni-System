export default function ConfirmDialog({ message, onConfirm, onCancel }) {
    if (!message) return null;
  
    return (
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 2000,
        }}
        onClick={onCancel}
      >
        <div
          style={{
            background: "#fff", padding: 24, borderRadius: 8,
            maxWidth: 380, width: "90%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ marginTop: 0 }}>{message}</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button onClick={onCancel}>Cancel</button>
            <button onClick={onConfirm} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 4 }}>
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }