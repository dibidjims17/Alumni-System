// Shared overflow menu for card/list row actions.
//
// The pattern: every row shows ONE obvious primary action, and everything
// secondary (or destructive) collapses behind a ⋮ button. That keeps rows
// scannable and stops the app from looking like a wall of buttons.
//
// Extracted from the Alumni page so every screen behaves the same way:
// clicking outside closes it, Escape closes it, and items get real
// menu/menuitem ARIA roles.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import { btn } from "./kit";

export default function KebabMenu({
  items,
  label = "More actions",
  align = "right",
  triggerStyle,
  menuWidth = 210,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const visible = items.filter((item) => item && !item.hidden);
  if (visible.length === 0) return null;

  function run(item) {
    setOpen(false);
    item.onClick?.();
  }

  return (
    <div ref={rootRef} data-kebab-menu style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        style={{ ...btn, width: 36, height: 34, padding: 0, justifyContent: "center", ...triggerStyle }}
        onClick={(event) => {
          // Cards are often entirely tappable (News) — without this the ⋮
          // would also fire the card's navigation.
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreVertical size={17} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            position: "absolute",
            [align]: 0,
            top: "calc(100% + 6px)",
            zIndex: 30,
            width: menuWidth,
            padding: 6,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {visible.map((item, index) => (
            <div key={item.key ?? item.label ?? index}>
              {item.dividerBefore && index > 0 && (
                <div style={{ height: 1, background: "var(--border)", margin: "4px 2px" }} />
              )}
              {item.to ? (
                <Link
                  to={item.to}
                  role="menuitem"
                  className="kebab-menu-item"
                  style={{
                    ...btn,
                    width: "100%",
                    justifyContent: "flex-start",
                    border: "none",
                    boxShadow: "none",
                    textDecoration: "none",
                    boxSizing: "border-box",
                    color: item.danger ? "var(--danger)" : undefined,
                  }}
                  onClick={() => setOpen(false)}
                >
                  {item.icon && <item.icon size={15} />}
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="kebab-menu-item"
                  style={{
                    ...btn,
                    width: "100%",
                    justifyContent: "flex-start",
                    border: "none",
                    boxShadow: "none",
                    color: item.danger ? "var(--danger)" : undefined,
                  }}
                  onClick={() => run(item)}
                >
                  {item.icon && <item.icon size={15} />}
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
