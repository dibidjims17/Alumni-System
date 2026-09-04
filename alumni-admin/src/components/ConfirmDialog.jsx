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
            background: "var(--surface)", color: "var(--text)", padding: 24, borderRadius: 10,
            maxWidth: 380, width: "90%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p style={{ marginTop: 0 }}>{message}</p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button
              onClick={onCancel}
              style={{ padding: "7px 14px", borderRadius: 8, background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "var(--danger)", color: "#fff", cursor: "pointer" }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }
