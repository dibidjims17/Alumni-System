// Global themed confirm dialogs (Promise-based).
const listeners = new Set();

export function subscribeConfirm(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Resolves true/false once the user answers.
export function askConfirm(message, options = {}) {
  return new Promise((resolve) => {
    listeners.forEach((cb) =>
      cb({ message, confirmLabel: options.confirmLabel || "Confirm", danger: options.danger === true, resolve })
    );
  });
}
