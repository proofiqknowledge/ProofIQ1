import React, { useState, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import { COLORS } from "./constants/designSystem";

// ⭐ Rewatch Request Pages
import RewatchRequests from "./pages/trainer/RewatchRequests";
import AdminRewatchRequests from "./pages/Admin/AdminRewatchRequests";
import AdminReExamRequests from "./pages/Admin/AdminReExamRequests";

// ⭐ Community Blogs
import CreateBlog from "./pages/Community/CreateBlog";
import MyBlogs from "./pages/Community/MyBlogs";
import BlogFeed from "./pages/Community/BlogFeed";
import AdminBlogReviews from "./pages/Admin/AdminBlogReviews";
import BlogDetail from "./pages/Community/BlogDetail";
import EditBlog from "./pages/Community/EditBlog";
import StudyGroupsPage from './pages/Community/StudyGroupsPage';
import AdminStudyGroups from './pages/Admin/AdminStudyGroups';

// ⭐ Auth Pages
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import LogoutPage from "./pages/Auth/LogoutPage";

// Exams Pages
import AdminExamsPage from './pages/Exams/AdminExamsPage';
import StudentExamsPage from './pages/Exams/StudentExamsPage';
import ExamPage from './pages/ExamPage';
import ExamResultPage from './pages/Exams/ExamResultPage';
import AdminExamDetails from './pages/Admin/ExamDetails';
import StudentReportPage from './pages/StudentReportPage';
import StudentPerformancePage from './pages/StudentPerformancePage';
import BulkExamUploadPage from './pages/Exams/BulkExamUploadPage';

// ⭐ Dashboard Pages
import MasterDashboard from "./pages/Dashboard/MasterDashboard";
import AdminDashboard from "./pages/Dashboard/AdminDashboard";
import AdminCoursesOverview from "./pages/Dashboard/AdminCoursesOverview";
import ManageUsers from "./pages/Admin/ManageUsers";
import TrainerDashboard from "./pages/Dashboard/TrainerDashboard";
import StudentDashboard from "./pages/Dashboard/StudentDashboard";
import BatchProgressDashboard from "./pages/trainer/BatchProgressDashboard";
import BatchDetail from "./pages/trainer/BatchDetails";
import TrainerExamAnalyticsPage from './pages/trainer/ExamAnalyticsPage';
import TrainerEvaluationPage from './pages/trainer/TrainerEvaluationPage';
import TrainerExamEvaluationsPage from './pages/trainer/TrainerExamEvaluationsPage';
import BatchStudentScores from './pages/trainer/BatchStudentScores';



// ⭐ Course Pages
import CourseList from "./pages/Courses/CourseList";
import CourseDetail from "./pages/Courses/CourseDetail";
import WeekView from "./pages/Courses/WeekView";
import DayView from "./pages/Courses/DayView";
import WeeklyExam from "./pages/Courses/WeeklyExam";
import FinalExam from "./pages/Courses/FinalExam";



// ⭐ Other Pages
import LeaderboardPage from "./pages/Leaderboard/LeaderboardPage";
import CertificatePage from "./pages/Certificates/CertificatePage";
import PointsConfigPage from "./pages/Admin/PointsConfigPage";
import Home from "./pages/Home/Home";
import NotFound from "./pages/NotFound";
import MindMapGenerator from "./pages/Courses/MindMapGenerator";
import CodePlayground from "./components/CodePlayground/CodePlayground";
import NavigationBot from "./components/NavigationBot";


function App() {
  const { token } = useSelector((state) => state.auth);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const location = useLocation();

  // Hide sidebar + navbar on exam taking screen
  const isExamRoute =
    (location.pathname.startsWith("/exams/") &&
      (location.pathname.includes("/take") ||
        location.pathname.includes("/result"))) ||
    // Also hide for Weekly and Final exams within courses
    (location.pathname.includes("/courses/") && location.pathname.endsWith("/exam")) ||
    (location.pathname.includes("/courses/") && location.pathname.endsWith("/final-exam"));

  const showSidebar = token && !isExamRoute;
  const showNavbar = !isExamRoute;

  // Ensure non-authenticated users are redirected back to login
  useEffect(() => {
    const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/', '/auth/callback', '/logout'];
    if (!token && !publicRoutes.includes(location.pathname)) {
      console.log('🛡 Security redirect: No token found, moving to login');
      // Use window.location.replace for logout to ensure clean state
      window.location.replace('/login');
    }
  }, [token, location.pathname]);
  useEffect(() => {
    const apiBase =
      import.meta.env?.VITE_API_URL || "http://localhost:5000/api";

    const handler = (e) => {
      const a = e.target.closest?.("a[href]");
      if (!a) return;

      const href = a.getAttribute("href");
      if (href?.startsWith(apiBase) || href?.includes("/api/")) {
        e.preventDefault();
        toast.warning("Blocked navigation to backend API endpoint.");
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, []);

  // Sync logout across tabs
  useEffect(() => {
    const syncLogout = (e) => {
      if (e.key === 'token' && !e.newValue) {
        window.location.replace('/login');
      }
    };
    window.addEventListener('storage', syncLogout);
    return () => window.removeEventListener('storage', syncLogout);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: COLORS.offWhite,
      }}
    >
      <ToastContainer position="top-center" autoClose={3000} />

      {/* Top Navbar */}
      {showNavbar && <Navbar />}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        {showSidebar && (
          <Sidebar
            isHovered={sidebarHovered}
            onHoverChange={setSidebarHovered}
          />
        )}

        {/* MAIN CONTENT AREA */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            marginLeft: showSidebar ? (sidebarHovered ? "250px" : "70px") : "0",
            transition: "margin-left 0.3s ease",
            ...(isExamRoute && {
              marginLeft: "0",
              width: "100%",
              height: "100vh",
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: 9999,
            }),
          }}
        >
          <Routes>
            {/*    Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<Login />} /> {/* Handle MSAL Redirect */}
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/logout" element={<LogoutPage />} />

            {/*  Course Pages */}
            <Route
              path="/courses"
              element={
                <ProtectedRoute>
                  <CourseList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id"
              element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id/week/:weekNumber"
              element={
                <ProtectedRoute>
                  <WeekView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id/week/:weekNumber/day/:dayNumber"
              element={
                <ProtectedRoute>
                  <DayView />
                </ProtectedRoute>
              }
            />
            <Route path="/mindmap" element={<MindMapGenerator />} />
            <Route
              path="/playground"
              element={
                <ProtectedRoute>
                  <CodePlayground />
                </ProtectedRoute>
              }
            />

            <Route
              path="/courses/:id/week/:weekNumber/exam"
              element={
                <ProtectedRoute>
                  <WeeklyExam />
                </ProtectedRoute>
              }
            />
            <Route
              path="/courses/:id/final-exam"
              element={
                <ProtectedRoute>
                  <FinalExam />
                </ProtectedRoute>
              }
            />

            {/* 🛠 Admin Pages */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute role={["Admin", "Master"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/master/dashboard"
              element={
                <ProtectedRoute role="Master">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/manage-users"
              element={
                <ProtectedRoute role="Admin">
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <ProtectedRoute role="Admin">
                  <AdminCoursesOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/rewatch-requests"
              element={
                <ProtectedRoute role="Admin">
                  <AdminRewatchRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reexam-requests"
              element={
                <ProtectedRoute role="Admin">
                  <AdminReExamRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exams"
              element={
                <ProtectedRoute role="Admin">
                  <AdminExamsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exams/:examId"
              element={
                <ProtectedRoute role="Admin">
                  <AdminExamDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/blogs/reviews"
              element={
                <ProtectedRoute role="Master">
                  <AdminBlogReviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/points-config"
              element={
                <ProtectedRoute role={["Admin", "Master"]}>
                  <PointsConfigPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/study-groups"
              element={
                <ProtectedRoute role={["Admin", "Master"]}>
                  <AdminStudyGroups />
                </ProtectedRoute>
              }
            />

            {/*  Trainer Pages */}
            <Route
              path="/trainer"
              element={
                <ProtectedRoute role="Trainer">
                  <TrainerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/rewatch-requests"
              element={
                <ProtectedRoute role="Trainer">
                  <RewatchRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/batches/progress"
              element={
                <ProtectedRoute role={["Trainer", "Admin", "Master"]}>
                  <BatchProgressDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/batch/:id"
              element={
                <ProtectedRoute role={["Trainer", "Admin", "Master"]}>
                  <BatchDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/batch/:id/student/:studentId/scores"
              element={
                <ProtectedRoute role={["Trainer", "Admin"]}>
                  <BatchStudentScores />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/exams/:examId/analytics"
              element={
                <ProtectedRoute role="Trainer">
                  <TrainerExamAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/submission/:submissionId/evaluate"
              element={
                <ProtectedRoute role="Trainer">
                  <TrainerEvaluationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trainer/exam-evaluations"
              element={
                <ProtectedRoute role="Trainer">
                  <TrainerExamEvaluationsPage />
                </ProtectedRoute>
              }
            />



            {/*  Student Dashboard */}
            <Route
              path="/student"
              element={
                <ProtectedRoute role="Student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/performance"
              element={
                <ProtectedRoute role="Student">
                  <StudentPerformancePage />
                </ProtectedRoute>
              }
            />

            {/* ===== OTHER PROTECTED ROUTES ===== */}
            <Route
              path="/admin/exams"
              element={
                <ProtectedRoute>
                  <AdminExamsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exams/bulk-upload"
              element={
                <ProtectedRoute>
                  <BulkExamUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/exams/:examId"
              element={
                <ProtectedRoute>
                  <AdminExamDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams"
              element={
                <ProtectedRoute>
                  <StudentExamsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams/:examId/take"
              element={
                <ProtectedRoute>
                  <ExamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams/:examId/result"
              element={
                <ProtectedRoute>
                  <ExamResultPage />
                </ProtectedRoute>
              }
            />

            {/*  Misc Pages */}
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <LeaderboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/certificates/my"
              element={
                <ProtectedRoute>
                  <CertificatePage />
                </ProtectedRoute>
              }
            />
            <Route path="/admin/exams/:examId/report/:submissionId" element={<StudentReportPage />} />

            {/*  Blog Pages */}
            <Route
              path="/community/blogs"
              element={
                <ProtectedRoute>
                  <BlogFeed />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community/blogs/:id"
              element={
                <ProtectedRoute>
                  <BlogDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community/blogs/create"
              element={
                <ProtectedRoute>
                  <CreateBlog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community/blogs/:id/edit"
              element={
                <ProtectedRoute>
                  <EditBlog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community/blogs/my"
              element={
                <ProtectedRoute>
                  <MyBlogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community/study-groups"
              element={
                <ProtectedRoute>
                  <StudyGroupsPage />
                </ProtectedRoute>
              }
            />

            {/*  404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>

      {/* MENTYX Navigation Bot - Global Component */}
      <NavigationBot />
    </div>
  );
}

export default App;
