// Shared admin UI bits: styled icon search box and an unsaved-changes guard.
// All colors read CSS variables set by the theme provider so both light and
// dark modes work without touching every call site.
import { useEffect, useState, useRef } from "react";
import { Search, X } from "lucide-react";
import { requestDiscardConfirm } from "./discardBus";

// Icon search input with a clear (X) button.
export function SearchBox({ placeholder, value, onChange, onSubmit, onReset }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: "2px 6px", minWidth: 280, background: "var(--surface)" }}>
      <Search size={16} color="var(--muted)" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit && onSubmit()}
        style={{ border: "none", outline: "none", flex: 1, padding: "8px 4px", fontSize: 14, background: "transparent", color: "var(--text)" }}
      />
      {value && (
        <button
          type="button"
          onClick={onReset}
          style={{ border: "none", background: "none", cursor: "pointer", display: "flex", color: "var(--muted)" }}
          aria-label="Clear search"
        >
          <X size={16} />
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
      requestDiscardConfirm(() => {
        setDirty(false);
        action();
      });
      return;
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
  gap: 18,
  marginTop: 16,
};

export const card = {
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: "16px 18px",
  background: "var(--surface)",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

export const cardTitle = {
  fontSize: 15,
  fontWeight: 600,
  margin: 0,
  color: "var(--text)",
};

export const cardMeta = {
  fontSize: 13,
  color: "var(--muted)",
  margin: 0,
};

export const actionsRow = {
  display: "flex",
  gap: 8,
  marginTop: 10,
  alignItems: "center",
};

// iconButton factory — usable BOTH ways:
//   const EditBtn = iconButton("Edit", Pencil); <EditBtn onClick={fn} />
//   or inline: iconButton("Edit", Pencil)(fn)
export function iconButton(label, Icon) {
  return (first, second) => {
    const isProps = first && typeof first === "object" && !Array.isArray(first);
    const onClick = isProps ? first.onClick : first;
    const style = isProps ? first.style : second;
    return (
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
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--surface)",
          color: "var(--text)",
          cursor: "pointer",
          fontSize: 13,
          ...style,
        }}
      >
        <Icon size={15} />
        {label}
      </button>
    );
  };
}

// Clean modal shell: overlay + titled panel. Caller supplies the body.
export function ModalShell({ title, onClose, width = 500, zIndex = 1000, children }) {
  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.5)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)", padding: 22, borderRadius: 10,
          maxWidth: width, width: "92%", maxHeight: "88vh", overflowY: "auto",
          color: "var(--text)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: "var(--text)" }}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: "var(--muted)" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Form field: label + control, consistent spacing.
export function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--text)" }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export const textInput = {
  width: "100%",
  padding: "9px 10px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
  background: "var(--surface-alt)",
  color: "var(--text)",
};

export const selectStyle = { ...textInput };

// Consistent controls & buttons (mirrors the bordered look of Documents'
// search box and the Manage Admins / Trash icon buttons).
export const control = {
  padding: "8px 10px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  background: "var(--surface-alt)",
  color: "var(--text)",
  fontSize: 14,
  width: "100%",
};

export const btn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

export const btnPrimary = {
  ...btn,
  background: "var(--primary)",
  borderColor: "var(--primary)",
  color: "var(--on-primary)",
  fontWeight: 600,
};

export const btnDanger = {
  ...btn,
  color: "var(--danger)",
  borderColor: "var(--danger)",
};
