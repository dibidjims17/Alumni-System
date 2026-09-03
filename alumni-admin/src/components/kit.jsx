// Shared admin UI bits: styled icon search box and an unsaved-changes guard.
import { useEffect, useState, useRef } from "react";
import { Search, X } from "lucide-react";

// Icon search input with a clear (X) button.
export function SearchBox({ placeholder, value, onChange, onSubmit, onReset }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #ccc", borderRadius: 8, padding: "2px 6px", minWidth: 280, background: "#fff" }}>
      <Search size={16} color="#666" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit && onSubmit()}
        style={{ border: "none", outline: "none", flex: 1, padding: "8px 4px", fontSize: 14 }}
      />
      {value && (
        <button
          type="button"
          onClick={onReset}
          style={{ border: "none", background: "none", cursor: "pointer", display: "flex" }}
          aria-label="Clear search"
        >
          <X size={16} color="#888" />
        </button>
      )}
    </div>
  );
}

// Promise-style dirty guard for forms (works whether dirty or not).
// Usage: const { withGuard, setDirty } = useDirtyGuard();
export function useDirtyGuard() {
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const handler = (e) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Runs `action` only after confirming if there are unsaved changes.
  const withGuard = (action) => {
    if (dirtyRef.current) {
      if (!window.confirm("You have unsaved changes. Discard them and leave?")) return;
    }
    setDirty(false);
    action();
  };

  return { dirty, setDirty, withGuard };
}

// Card grid used by list pages in place of plain tables.
export const cardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: 16,
  marginTop: 16,
};

export const card = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: "14px 16px",
  background: "#fff",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

export const cardTitle = {
  fontSize: 15,
  fontWeight: 600,
  margin: 0,
};

export const cardMeta = {
  fontSize: 13,
  color: "#555",
  margin: 0,
};

export const actionsRow = {
  display: "flex",
  gap: 8,
  marginTop: 10,
  alignItems: "center",
};

export function iconButton(label, Icon) {
  return (onClick, extra = {}) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        border: "1px solid #ccc",
        borderRadius: 8,
        background: "#fff",
        cursor: "pointer",
        fontSize: 13,
        ...extra,
      }}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
