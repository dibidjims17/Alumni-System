import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Careers from "./pages/Careers";
import StudentDocuments from "./pages/StudentDocuments";
import Documents from "./pages/Documents";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Suggestions from "./pages/Suggestions";
import Layout from "./components/Layout";
import { getSession } from "./services/api";
import Jobs from "./pages/Jobs";
import JobApplicants from "./pages/JobApplicants";
import Events from "./pages/Events";
import ActivityLog from "./pages/ActivityLog";
import ManageAdmins from "./pages/ManageAdmins";
import Trash from "./pages/Trash";
import Profile from "./pages/Profile";
import Tracer from "./pages/Tracer";
import CareerReport from "./pages/CareerReport";

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

// An unmatched URL must NOT look like a logout: keep a valid session on the
// dashboard, only send actually-logged-out users to Login.
function NotFoundRedirect() {
  const session = getSession();
  return session ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/login" replace />
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
          <Route path="/profile" element={<Profile />} />
          {/* Sensitive alumni data — registrar territory only. */}
          <Route path="/students" element={<SuperAdminRoute><Students /></SuperAdminRoute>} />
          <Route path="/careers" element={<SuperAdminRoute><Careers /></SuperAdminRoute>} />
          {/* Month-scoped career report — registrar deliverable, same
              SuperAdmin boundary as the queue it draws rows from. */}
          <Route path="/career-report" element={<SuperAdminRoute><CareerReport /></SuperAdminRoute>} />
          <Route path="/documents" element={<SuperAdminRoute><Documents /></SuperAdminRoute>} />
          <Route path="/documents/:id" element={<SuperAdminRoute><StudentDocuments /></SuperAdminRoute>} />
          <Route path="/news" element={<News />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          {/* Review queue for user-posted suggestions — API restricts it
              to SuperAdmin + Staff, so the route stays open like /news. */}
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
          <Route path="/events" element={<Events />} />
          {/* Tracer reports — SuperAdmin + Staff, enforced by the API roles. */}
          <Route path="/tracer" element={<Tracer />} />
          <Route path="/manage-admins" element={<SuperAdminRoute><ManageAdmins /></SuperAdminRoute>} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/activity-log" element={<ActivityLog />} />
        </Route>

        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}