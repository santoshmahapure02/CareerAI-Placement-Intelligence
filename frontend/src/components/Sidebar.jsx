import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ICONS = {
  dashboard: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  resume: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  jobs: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  skills: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="18" cy="10" r="1.5" />
      <circle cx="6" cy="14" r="1.5" />
    </svg>
  ),
  applications: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  assistant: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

const STUDENT_LINKS = [
  { to: "/",            label: "Student Dashboard", icon: ICONS.dashboard,    end: true },
  { to: "/resume",      label: "Resume & ATS",    icon: ICONS.resume,       end: false },
  { to: "/jobs",        label: "Job Matcher",     icon: ICONS.jobs,         end: false },
  { to: "/skill-gap",   label: "Skill Analytics", icon: ICONS.skills,       end: false },
  { to: "/applications",label: "Applications",    icon: ICONS.applications, end: false },
  { to: "/assistant",   label: "AI Copilot",      icon: ICONS.assistant,    end: false, badge: "AI" },
];

const RECRUITER_LINKS = [
  { to: "/",            label: "Recruiter Dashboard", icon: ICONS.dashboard,    end: true },
  { to: "/jobs",        label: "Manage Postings", icon: ICONS.jobs,         end: false },
  { to: "/applications",label: "Candidate Funnel",icon: ICONS.applications, end: false },
];

export default function Sidebar() {
  const { user } = useAuth();
  const links = user?.role === "recruiter" ? RECRUITER_LINKS : STUDENT_LINKS;

  return (
    <>
      <style>{`
        .sb-root {
          width: 210px; min-width: 210px; height: calc(100vh - 60px);
          background: #090d14; border-right: 1px solid rgba(255,255,255,0.06);
          display: flex; flex-direction: column; justify-content: space-between;
          font-family: 'Inter', -apple-system, sans-serif; position: fixed; top: 60px; left: 0; z-index: 40;
          overflow-y: auto; overflow-x: hidden;
        }

        .sb-section-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #475569; padding: 14px 16px 6px;
        }

        .sb-nav {
          padding: 8px 10px; display: flex; flex-direction: column; gap: 3px;
        }

        .sb-nav-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 12px; border-radius: 9px;
          font-size: 13px; font-weight: 500; color: #94a3b8;
          text-decoration: none; transition: all 0.16s ease;
          position: relative;
        }

        .sb-nav-item-left {
          display: flex; align-items: center; gap: 11px;
        }

        .sb-nav-item:hover {
          background: rgba(255,255,255,0.04); color: #f8fafc;
        }

        .sb-nav-item.active {
          background: rgba(0, 212, 170, 0.09);
          color: #00d4aa;
          font-weight: 600;
        }

        .sb-nav-item.active::before {
          content: ''; position: absolute; left: 0; top: 6px; bottom: 6px;
          width: 3px; border-radius: 0 4px 4px 0;
          background: #00d4aa;
          box-shadow: 0 0 10px rgba(0, 212, 170, 0.6);
        }

        .sb-nav-icon {
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: transform 0.16s ease;
        }

        .sb-nav-item:hover .sb-nav-icon {
          transform: translateX(1px);
        }

        .sb-nav-badge {
          font-size: 9.5px; font-weight: 700; padding: 2px 6px;
          border-radius: 6px; background: rgba(0, 212, 170, 0.16);
          color: #00d4aa; letter-spacing: 0.04em;
          border: 1px solid rgba(0, 212, 170, 0.3);
        }

        .sb-footer {
          padding: 12px 14px 16px; border-top: 1px solid rgba(255,255,255,0.05);
        }

        .sb-status-card {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px; border-radius: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
        }

        .sb-status-left {
          display: flex; align-items: center; gap: 8px;
        }

        .sb-status-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #00d4aa;
          box-shadow: 0 0 8px rgba(0, 212, 170, 0.7);
          position: relative;
        }

        .sb-status-dot::after {
          content: ''; position: absolute; inset: -2px;
          border-radius: 50%; border: 1px solid #00d4aa;
          animation: sb-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          opacity: 0.6;
        }

        @keyframes sb-ping {
          75%, 100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        .sb-status-text {
          font-size: 11px; font-weight: 600; color: #cbd5e1;
        }

        .sb-status-sub {
          font-size: 9.5px; color: #64748b;
        }
      `}</style>

      <aside className="sb-root">
        <div>
          <div className="sb-section-label" style={{
            color: user?.role === "recruiter" ? "#38bdf8" : "#00d4aa",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            gap: 6
          }}>
            {user?.role === "recruiter" ? "💼 Recruiter Portal" : "🎓 Student Workspace"}
          </div>
          <nav className="sb-nav">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => "sb-nav-item" + (isActive ? " active" : "")}
              >
                <div className="sb-nav-item-left">
                  <span className="sb-nav-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </div>
                {link.badge && <span className="sb-nav-badge">{link.badge}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sb-footer">
          <div className="sb-status-card">
            <div className="sb-status-left">
              <span className="sb-status-dot" style={{
                background: user?.role === "recruiter" ? "#38bdf8" : "#00d4aa"
              }} />
              <div>
                <div className="sb-status-text">
                  {user?.role === "recruiter" ? "Recruiter Active" : "Student Active"}
                </div>
                <div className="sb-status-sub">Live & Synced</div>
              </div>
            </div>
            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>PRO</span>
          </div>
        </div>
      </aside>
    </>
  );
}
