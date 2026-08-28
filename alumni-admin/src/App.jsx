import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import StudentDocuments from "./pages/StudentDocuments";
import Documents from "./pages/Documents";
import News from "./pages/News";
import Layout from "./components/Layout";
import { getSession } from "./services/api";
import Jobs from "./pages/Jobs";
import JobApplicants from "./pages/JobApplicants";
import ActivityLog from "./pages/ActivityLog";
import ManageAdmins from "./pages/ManageAdmins";
import Trash from "./pages/Trash";

function ProtectedRoute({ children }) {
  const session = getSession();
  return session ? children : <Navigate to="/login" replace />;
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
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id/applicants" element={<JobApplicants />} />
          <Route path="/manage-admins" element={<ManageAdmins />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/activity-log" element={<ActivityLog />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}