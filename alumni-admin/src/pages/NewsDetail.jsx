import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import { getNewsDetail, deleteCommentAsAdmin, newsImageUrl } from "../services/newsApi";
import CommentRow from "../components/CommentRow";
import { card, cardTitle, cardMeta } from "../components/kit";

export default function NewsDetail() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPost() {
    setLoading(true);
    setError("");
    try {
      const detail = await getNewsDetail(id);
      setPost(detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDeleteComment(commentId) {
    try {
      await deleteCommentAsAdmin(commentId);
      await loadPost();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <Link to="/news">← Back to News</Link>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading post...</p>
      ) : !post ? (
        <p>Post not found.</p>
      ) : (
        <>
          <div style={{ ...card, marginTop: 16 }}>
            <h2 style={{ ...cardTitle, fontSize: 18, margin: "0 0 4px" }}>{post.title}</h2>
            <p style={cardMeta}>
              Posted by {post.postedByAdminName} • {new Date(post.postedAt).toLocaleString()}
              {!post.isPublished && " • Unpublished"}
            </p>

            {newsImageUrl(post.imagePath) && (
              <img
                src={newsImageUrl(post.imagePath)}
                alt=""
                style={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "cover",
                  borderRadius: 10,
                  margin: "10px 0 14px",
                  display: "block",
                  background: "var(--surface-alt)",
                }}
              />
            )}

            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, margin: "0 0 12px" }}>
              {post.content}
            </p>

            <p style={{ ...cardMeta, display: "flex", alignItems: "center", gap: 16, margin: 0 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Heart size={14} color="#d64550" />
                {post.heartCount ?? 0}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <MessageCircle size={14} color="#4574b8" />
                {(post.comments || []).length}
              </span>
            </p>
          </div>

          <div style={{ ...card, marginTop: 16 }}>
            <h3 style={{ ...cardTitle, margin: "0 0 12px" }}>Comments</h3>
            {(post.comments || []).length === 0 ? (
              <p style={cardMeta}>No comments yet.</p>
            ) : (
              <div>
                {(post.comments || []).map((c) => (
                  <div key={c.id} style={{ marginBottom: 14 }}>
                    <CommentRow data={c} onDelete={handleDeleteComment} />
                    {c.replies?.length > 0 && (
                      <div
                        style={{
                          marginLeft: 20,
                          paddingLeft: 14,
                          borderLeft: "2px solid #eee",
                          marginTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {c.replies.map((r) => (
                          <CommentRow
                            key={r.id}
                            data={r}
                            onDelete={handleDeleteComment}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
