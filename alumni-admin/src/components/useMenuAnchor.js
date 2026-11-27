// Shared open-state geometry for the admin's floating menus — KebabMenu (⋮)
// and ToneSelect (themed status dropdown) are the same pattern, so they must
// flip and lift identically. Extracted from KebabMenu so a fix applied to one
// automatically applies to the other (the original fix shipped to KebabMenu
// only and silently did nothing on most pages — see owner note below).
//
// Two jobs while a menu is open:
//   1. Flip upward when the owner leaves too little room below, so a menu in
//      a card footer stops spilling onto the neighbouring card.
//   2. Lift the owning card's z-index, so a hover transform cannot form a
//      stacking context that traps the menu and lets the next card paint
//      over it.
//
// Both jobs measure against the nearest POSITIONED ancestor of the trigger.
// The shared `card` style is position:relative for exactly this reason —
// without it the walk runs to <body>, and body's rect covers the whole
// document, so the flip never triggers and the lift early-returns.
// Menus outside cards (e.g. Tracer's filter row) fall back to the viewport,
// which is the right boundary there: <main> is the scroll container, so the
// visible area is what the menu must stay inside.
import { useEffect, useLayoutEffect, useState } from "react";

function nearestPositionedOwner(root) {
  let owner = root.parentElement;
  while (owner && owner !== document.body) {
    if (window.getComputedStyle(owner).position !== "static") break;
    owner = owner.parentElement;
  }
  // body itself is not a useful owner: its rect spans the whole document,
  // which makes "room below" meaningless for the flip and pointless for the
  // lift (nothing to raise above siblings).
  return owner && owner !== document.body ? owner : null;
}

export function useMenuAnchor({ open, rootRef, menuRef }) {
  const [flipped, setFlipped] = useState(false);

  useLayoutEffect(() => {
    if (!open) {
      setFlipped(false);
      return;
    }
    const menu = menuRef.current;
    const root = rootRef.current;
    if (!menu || !root) return;

    const owner = nearestPositionedOwner(root);
    const roomBelow =
      (owner ? owner.getBoundingClientRect().bottom : window.innerHeight) -
      root.getBoundingClientRect().bottom;

    // One-directional on purpose: the same two numbers decide it every time,
    // so the menu cannot oscillate between orientations.
    setFlipped(menu.offsetHeight > roomBelow - 6);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = rootRef.current;
    if (!root) return;

    const owner = nearestPositionedOwner(root);
    if (!owner) return;

    const previous = owner.style.zIndex;
    owner.style.zIndex = "5";
    return () => {
      owner.style.zIndex = previous;
    };
  }, [open]);

  return flipped;
}
