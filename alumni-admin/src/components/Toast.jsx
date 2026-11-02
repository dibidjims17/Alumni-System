import { useEffect } from "react";

export default function Toast({ message, type = "error", onClose, duration = 4000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  if (!message) return null;

  const isError = type === "error";
  const bgColor = isError ? "var(--danger-tint)" : "var(--success-tint)";
  const textColor = isError ? "var(--danger)" : "var(--success)";
  const borderColor = isError ? "var(--danger)" : "var(--success)";

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
        boxShadow: "var(--shadow-md)",
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