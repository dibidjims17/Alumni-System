import { useState, useEffect } from "react";
import Toast from "./Toast";
import { subscribeToasts } from "./toastBus";

// Mount once (e.g., in Layout) to display any toast raised via the bus.
export default function ToastHost() {
  const [toast, setToast] = useState(null);

  useEffect(() => subscribeToasts((t) => setToast(t)), []);

  return <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />;
}
