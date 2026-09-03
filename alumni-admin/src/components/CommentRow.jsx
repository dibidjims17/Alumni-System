import { Trash2 } from "lucide-react";

// Shared admin comment row: avatar initial, author, timestamp, body,
// like count, and an admin Delete action. Used by News list + detail.
export default function CommentRow({ data, onDelete }) {
  const initial = (data.studentName || "?").charAt(0).toUpperCase();
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div
        style={{
          flexShrink: 0,
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "#e7eefb",
          color: "#34558b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 8, alignItems: "baseline" }}>
          <strong style={{ fontSize: 13 }}>{data.studentName}</strong>
          <span style={{ fontSize: 11, color: "#888" }}>
            {new Date(data.commentedAt).toLocaleString()}
          </span>
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "#333", lineHeight: 1.4, wordBreak: "break-word" }}>
          {data.comment}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "#999" }}>{data.likeCount} likes</span>
          <button
            type="button"
            onClick={() => onDelete(data.id)}
            title="Delete comment"
            aria-label="Delete comment"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 8px",
              border: "1px solid #e0b4b4",
              borderRadius: 6,
              background: "#fff",
              color: "#c0392b",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
