import { useRef, useState } from "react";
import { ImageUp, X } from "lucide-react";

// Mirrors the API's SaveNewsImageAsync limits so a bad file is rejected in
// the browser instead of costing a round trip.
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.gif,.webp,.bmp";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"];

// Google-Drive-style image target: drop a file on it, or click to browse.
// The preview URL is owned by the caller (created on pick, revoked when the
// modal closes) so no object URL is ever created during render.
export default function ImageDropZone({ previewUrl, fileName, onPick, onRemove, hint }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  function accept(file) {
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("That file isn't a supported image.");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setError("Images must be 5 MB or smaller.");
      return;
    }
    setError("");
    onPick(file);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          // Only leave when the pointer really exits the zone — otherwise
          // hovering a child element makes the highlight flicker.
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          minHeight: previewUrl ? 150 : 132,
          padding: previewUrl ? 8 : 18,
          borderRadius: 10,
          cursor: "pointer",
          textAlign: "center",
          overflow: "hidden",
          border: `2px dashed ${dragging ? "var(--primary)" : "var(--border)"}`,
          background: dragging ? "var(--success-tint)" : "var(--surface-alt)",
          color: "var(--muted)",
          transition: "border-color 140ms ease, background-color 140ms ease",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_ACCEPT}
          style={{ display: "none" }}
          onChange={(e) => {
            accept(e.target.files?.[0]);
            // Reset so picking the same file twice still fires a change event.
            e.target.value = "";
          }}
        />

        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt={fileName ? `Preview of ${fileName}` : "Image preview"}
              style={{ maxWidth: "100%", maxHeight: 190, borderRadius: 8, objectFit: "contain" }}
            />
            <span style={{ fontSize: 12 }}>
              {fileName || "Current image"} — click or drop to replace
            </span>
          </>
        ) : (
          <>
            <ImageUp size={26} color={dragging ? "var(--primary)" : "var(--muted)"} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>
              {dragging ? "Drop it right here" : "Drag an image here"}
            </span>
            <span style={{ fontSize: 12.5 }}>
              or <span style={{ color: "var(--info)", fontWeight: 600 }}>click to browse</span>
            </span>
            {hint && <span style={{ fontSize: 11.5 }}>{hint}</span>}
          </>
        )}

        {previewUrl && onRemove && (
          <button
            type="button"
            aria-label="Remove image"
            title="Remove image"
            onClick={(e) => {
              e.stopPropagation();
              setError("");
              onRemove();
            }}
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 26,
              padding: 0,
              borderRadius: 999,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--danger)",
              cursor: "pointer",
              "--btn-variant": "danger",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</div>
      )}
    </div>
  );
}
