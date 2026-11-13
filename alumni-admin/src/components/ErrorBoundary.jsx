// Crash guard for the admin app: if a page throws during render, show a
// friendly fallback with a Retry instead of a blank white screen.
//
// Why a class: error boundaries need componentDidCatch / getDerivedStateFromError,
// which have no hook equivalent. The fallback is passed in as a render prop so
// it can consume theme context (this component can't use hooks itself) —
// Layout wraps its <Outlet/> so navigation stays alive when a page crashes.
import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep a trace in the console for debugging; the fallback never exposes
    // stack traces to the user.
    console.error("Admin UI error:", error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.fallback === "function") {
      return this.props.fallback(error, this.reset);
    }

    // Token-only styles so it works in light and dark mode automatically.
    return (
      <div
        role="alert"
        style={{
          margin: 24,
          padding: "28px 24px",
          borderRadius: 14,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--text)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Something went wrong on this page
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
          The rest of the app is still running. Try again, or reload if it
          keeps happening.
        </div>
        <button
          type="button"
          onClick={this.reset}
          style={{
            minHeight: 34,
            padding: "0 16px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface-alt)",
            color: "var(--text)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
