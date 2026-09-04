// Global discard-confirmation bus for unsaved-changes prompts.
const listeners = new Set();

export function subscribeDiscard(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function requestDiscardConfirm(onDiscard) {
  listeners.forEach((cb) => cb({ onDiscard }));
}
