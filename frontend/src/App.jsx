import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import JobMatcher from "./pages/JobMatcher";
import SkillGap from "./pages/SkillGap";
import Applications from "./pages/Applications";
import CandidateRanking from "./pages/CandidateRanking";
import AiAssistant from "./pages/AiAssistant";
import TopNavbar from "./components/TopNavbar";

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, color: "#9ca3af", fontFamily: "Inter,sans-serif" }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div style={{ minHeight: "100vh", background: "#090d14", color: "#f8fafc" }}>
      <TopNavbar />
      <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
        <Sidebar />
        <main style={{ marginLeft: 210, marginTop: 60, flex: 1, padding: "24px 32px 40px", minWidth: 0, background: "#090d14" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-text" style={{ padding: 40 }}>Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-text" style={{ padding: 40 }}>Loading…</div>;
  if (!user) return <Landing />;
  return (
    <ProtectedLayout>
      <Dashboard />
    </ProtectedLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/resume" element={<ProtectedLayout><Resume /></ProtectedLayout>} />
          <Route path="/jobs" element={<ProtectedLayout><JobMatcher /></ProtectedLayout>} />
          <Route path="/jobs/:jobId/candidates" element={<ProtectedLayout><CandidateRanking /></ProtectedLayout>} />
          <Route path="/skill-gap" element={<ProtectedLayout><SkillGap /></ProtectedLayout>} />
          <Route path="/applications" element={<ProtectedLayout><Applications /></ProtectedLayout>} />
          <Route path="/assistant" element={<ProtectedLayout><AiAssistant /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
