import { useEffect, useState } from "react";
import { getStudentStats } from "../services/studentsApi";
import { getNews } from "../services/newsApi";
import { getJobs } from "../services/jobsApi";
import { notifyError } from "../components/toastBus";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [newsCount, setNewsCount] = useState(null);
  const [activeJobsCount, setActiveJobsCount] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [studentStats, news, jobs] = await Promise.all([
          getStudentStats(),
          getNews(),
          getJobs(),
        ]);
        setStats(studentStats);
        setNewsCount(news.length);
        setActiveJobsCount(jobs.filter((j) => j.isActive).length);
      } catch (err) {
        notifyError(err.message);
      }
    }
    load();
  }, []);

  const cardStyle = {
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: 20,
    minWidth: 160,
  };

  return (
    <div>
      <h2>Dashboard</h2>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 20 }}>
        <div style={cardStyle}>
          <p>Total Students</p>
          <h3>{stats?.totalStudents ?? "—"}</h3>
        </div>
        <div style={cardStyle}>
          <p>Graduate Alumni</p>
          <h3>{stats?.graduateStudents ?? "—"}</h3>
        </div>
        <div style={cardStyle}>
          <p>Active Accounts</p>
          <h3>{stats?.activeStudents ?? "—"}</h3>
        </div>
        <div style={cardStyle}>
          <p>News Posts</p>
          <h3>{newsCount ?? "—"}</h3>
        </div>
        <div style={cardStyle}>
          <p>Active Jobs</p>
          <h3>{activeJobsCount ?? "—"}</h3>
        </div>
      </div>
    </div>
  );
}