import { useRef, useState } from "react";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";

const CSV_ACCEPT = ".csv,text/csv,application/csv,application/vnd.ms-excel";
const CSV_MAX_BYTES = 5 * 1024 * 1024;

function fileExtension(name = "") {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

// Reusable Google-Drive-style file target for bulk imports. Files can be
// dropped anywhere inside the box or selected through the system picker.
export default function FileDropZone({
  accept = CSV_ACCEPT,
  allowedExtensions = [".csv"],
  maxBytes = CSV_MAX_BYTES,
  fileName = "",
  busy = false,
  disabled = false,
  onPick,
  prompt = "Drag a CSV file here",
  dropPrompt = "Drop your CSV to import",
  hint = "CSV only, up to 5 MB",
}) {
  const inputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const unavailable = disabled || busy;

  function acceptFile(file) {
    if (!file || unavailable) return;

    const extension = fileExtension(file.name);
    if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
      setError(`Choose a ${allowedExtensions.join(" or ")} file.`);
      return;
    }
    if (maxBytes && file.size > maxBytes) {
      setError(`The file must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);
      return;
    }

    setError("");
    onPick(file);
  }

  function openPicker() {
    if (!unavailable) inputRef.current?.click();
  }

  function stopDragging() {
    dragDepthRef.current = 0;
    setDragging(false);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={unavailable ? -1 : 0}
        aria-disabled={unavailable}
        aria-busy={busy}
        aria-label={busy ? "Importing CSV" : fileName ? `Selected ${fileName}. Choose another CSV.` : prompt}
        onClick={openPicker}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !unavailable) {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          if (unavailable) return;
          dragDepthRef.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = unavailable ? "none" : "copy";
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (unavailable) return;
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (unavailable) return;
          stopDragging();

          const files = Array.from(e.dataTransfer.files || []);
          if (files.length > 1) {
            setError("Drop one file at a time.");
            return;
          }
          acceptFile(files[0]);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          minHeight: 154,
          padding: "20px 18px",
          borderRadius: 12,
          border: `2px dashed ${dragging ? "var(--primary)" : fileName ? "var(--success)" : "var(--border)"}`,
          background: dragging
            ? "var(--success-tint)"
            : fileName
              ? "var(--success-tint)"
              : "var(--surface-alt)",
          color: "var(--muted)",
          cursor: unavailable ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          textAlign: "center",
          transition: "border-color 140ms ease, background-color 140ms ease, transform 140ms ease",
          transform: dragging ? "scale(1.006)" : "none",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={unavailable}
          style={{ display: "none" }}
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            // Picking the same file again must still fire a change event.
            e.target.value = "";
          }}
        />

        {busy ? (
          <LoaderCircle
            size={30}
            color="var(--primary)"
            style={{ animation: "file-drop-spin 900ms linear infinite" }}
          />
        ) : (
          <FileSpreadsheet size={30} color={dragging ? "var(--primary)" : fileName ? "var(--success)" : "var(--muted)"} />
        )}

        <span style={{ maxWidth: "100%", overflowWrap: "anywhere", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
          {busy ? "Importing CSV..." : dragging ? dropPrompt : fileName || prompt}
        </span>
        <span style={{ fontSize: 12.5 }}>
          {busy ? (
            "Please keep this window open"
          ) : fileName ? (
            <>Drop another CSV here or <span style={{ color: "var(--info)", fontWeight: 650 }}>browse</span></>
          ) : (
            <>or <span style={{ color: "var(--info)", fontWeight: 650 }}>click to browse</span></>
          )}
        </span>
        {!busy && hint && <span style={{ fontSize: 11.5 }}>{hint}</span>}
      </div>

      {error && (
        <div role="alert" style={{ fontSize: 12, color: "var(--danger)", marginTop: 7 }}>
          {error}
        </div>
      )}

      <style>{`
        @keyframes file-drop-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
