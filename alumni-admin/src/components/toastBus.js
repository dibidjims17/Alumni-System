// Tiny global toast bus so any page can raise top-right toasts
// without each page mounting its own Toast.
const listeners = new Set();

export function subscribeToasts(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(message, type = "error") {
  listeners.forEach((cb) => cb({ message, type }));
}

export function notifyError(message) {
  emit(String(message || "Something went wrong."), "error");
}

export function notifySuccess(message) {
  emit(String(message || "Done."), "success");
}
