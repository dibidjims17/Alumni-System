import { useEffect, useState } from "react";
import { getNews, createNews, updateNews, deleteNews, getNewsDetail, deleteCommentAsAdmin } from "../services/newsApi";

const emptyForm = { title: "", content: "", isPublished: true, imageFile: null };

export default function News() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // null = creating new
  const [expandedId, setExpandedId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  async function loadNews() {
    setLoading(true);
    setError("");
    try {
        const data = await getNews();
        setNewsList(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
  }, []);

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      content: item.content,
      isPublished: item.isPublished,
      imageFile: null,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await updateNews(editingId, form);
      } else {
        await createNews(form);
      }
      cancelEdit();
      loadNews();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteNews(id);
      loadNews();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleComments(newsId) {
    if (expandedId === newsId) {
      setExpandedId(null);
      setComments([]);
      return;
    }
    setExpandedId(newsId);
    setCommentsLoading(true);
    try {
      const detail = await getNewsDetail(newsId);
      setComments(detail.comments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function handleDeleteComment(commentId, newsId) {
    try {
      await deleteCommentAsAdmin(commentId);
      const detail = await getNewsDetail(newsId);
      setComments(detail.comments || []);
      loadNews(); // refresh comment counts in the table
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h2>News</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ marginBottom: 30, maxWidth: 500 }}>
        <h3>{editingId ? "Edit Post" : "Create New Post"}</h3>

        <div>
          <label>Title</label><br />
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Content</label><br />
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            required
            rows={5}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label>
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            />{" "}
            Published
          </label>
        </div>

        <div style={{ marginTop: 10 }}>
          <label>Image {editingId ? "(leave blank to keep current)" : "(optional)"}</label><br />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] || null })}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update Post" : "Create Post"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} style={{ marginLeft: 8 }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p>Loading news...</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th>Title</th>
              <th>Posted By</th>
              <th>Posted At</th>
              <th>Hearts</th>
              <th>Comments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {newsList.map((item) => (
              <>
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.postedByAdminName}</td>
                  <td>{new Date(item.postedAt).toLocaleString()}</td>
                  <td>{item.heartCount}</td>
                  <td>{item.commentCount}</td>
                  <td>
                    <button onClick={() => startEdit(item)}>Edit</button>{" "}
                    <button onClick={() => handleDelete(item.id)}>Delete</button>{" "}
                    <button onClick={() => toggleComments(item.id)}>
                      {expandedId === item.id ? "Hide Comments" : "View Comments"}
                    </button>
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr>
                    <td colSpan={6} style={{ background: "#f9f9f9" }}>
                      {commentsLoading ? (
                        <p>Loading comments...</p>
                      ) : comments.length === 0 ? (
                        <p>No comments yet.</p>
                      ) : (
                        <ul style={{ paddingLeft: 16 }}>
                          {comments.map((c) => (
                            <li key={c.id} style={{ marginBottom: 10 }}>
                              <strong>{c.studentName}</strong>: {c.comment}{" "}
                              <span style={{ fontSize: 12, color: "#666" }}>
                                ({new Date(c.commentedAt).toLocaleString()}, {c.likeCount} likes)
                              </span>{" "}
                              <button onClick={() => handleDeleteComment(c.id, item.id)}>Delete</button>
                              {c.replies?.length > 0 && (
                                <ul style={{ paddingLeft: 20, marginTop: 6 }}>
                                  {c.replies.map((r) => (
                                    <li key={r.id} style={{ marginBottom: 6 }}>
                                      <strong>{r.studentName}</strong>: {r.comment}{" "}
                                      <span style={{ fontSize: 12, color: "#666" }}>
                                        ({new Date(r.commentedAt).toLocaleString()}, {r.likeCount} likes)
                                      </span>{" "}
                                      <button onClick={() => handleDeleteComment(r.id, item.id)}>Delete</button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}