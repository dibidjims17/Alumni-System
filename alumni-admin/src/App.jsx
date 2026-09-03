import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudentDocuments from "./pages/StudentDocuments";
import Documents from "./pages/Documents";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Layout from "./components/Layout";
import { getSession } from "./services/api";
import Jobs from "./pages/Jobs";
import JobApplicants from "./pages/JobApplicants";
import Events from "./pages/Events";
import ActivityLog from "./pages/ActivityLog";
import ManageAdmins from "./pages/ManageAdmins";
import Trash from "./pages/Trash";

function ProtectedRoute({ children }) {
  const session = getSession();
  return session ? children : <Navigate to="/login" replace />;
}

// Only SuperAdmins may access these pages; Staff get bounced to the dashboard
// even if they type the URL directly.
function SuperAdminRoute({ children }) {
  const session = getSession();
  return session?.role === "SuperAdmin" ? (
    children
  ) : (
    <Navigate to="/dashboard" replace />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/students/:id/documents" element={<StudentDocuments />} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
          <Route path="/events" element={<Events />} />
          <Route path="/manage-admins" element={<SuperAdminRoute><ManageAdmins /></SuperAdminRoute>} />
          <Route path="/trash" element={<SuperAdminRoute><Trash /></SuperAdminRoute>} />
          <Route path="/activity-log" element={<SuperAdminRoute><ActivityLog /></SuperAdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}