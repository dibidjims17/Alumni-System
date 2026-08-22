import { useEffect } from "react";

export default function Toast({ message, type = "error", onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  if (!message) return null;

  const bgColor = type === "error" ? "#fee2e2" : "#dcfce7";
  const textColor = type === "error" ? "#991b1b" : "#166534";
  const borderColor = type === "error" ? "#fca5a5" : "#86efac";

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        background: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        padding: "12px 16px",
        maxWidth: 360,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        zIndex: 2000,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", cursor: "pointer", color: textColor, fontWeight: "bold" }}
      >
        ✕
      </button>
    </div>
  );
}