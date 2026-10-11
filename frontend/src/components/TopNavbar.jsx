import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function TopNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const searchInputRef = useRef(null);

  const initials = (user?.name || "User")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const isRecruiter = user?.role === "recruiter";
  const displayName = user?.name || (isRecruiter ? "Recruiter" : "Student");
  const roleBadge = isRecruiter ? "💼 Recruiter" : "🎓 Student";
  const roleColor = isRecruiter ? "#38bdf8" : "#00d4aa";

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    }

    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearch = (e) => {
    if (e.key === "Enter" && query.trim()) {
      navigate(`/jobs?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <>
      <style>{`
        .tn-header {
          position: fixed; top: 0; left: 0; right: 0; height: 60px;
          background: rgba(9, 13, 20, 0.88); backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px 0 20px; z-index: 100;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        /* BRAND */
        .tn-brand {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none; flex-shrink: 0;
        }
        .tn-logo-icon {
          width: 32px; height: 32px; border-radius: 9px;
          background: linear-gradient(135deg, #00d4aa 0%, #0284c7 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 10px rgba(0, 212, 170, 0.3);
          color: #090d14; font-weight: 900; font-size: 14px;
        }
        .tn-brand-name {
          font-size: 16px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;
        }
        .tn-brand-name span { color: #00d4aa; }

        /* SEARCH BAR */
        .tn-search-wrap {
          flex: 1; max-width: 420px; margin: 0 20px;
          display: flex; align-items: center; gap: 9px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 9px; padding: 7px 12px;
          transition: all 0.18s ease;
        }
        .tn-search-wrap:focus-within {
          border-color: rgba(0, 212, 170, 0.45);
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 0 14px rgba(0, 212, 170, 0.12);
        }
        .tn-search-input {
          background: none; border: none; outline: none;
          color: #fff; font-size: 13px; font-family: 'Inter', sans-serif;
          width: 100%;
        }
        .tn-search-input::placeholder { color: #64748b; }
        .tn-search-kbd {
          font-size: 10.5px; font-weight: 600; color: #64748b;
          background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2px 5px; border-radius: 4px; line-height: 1;
        }

        /* RIGHT ACTIONS */
        .tn-right {
          display: flex; align-items: center; gap: 12px; flex-shrink: 0;
        }
        .tn-notif-btn {
          position: relative; width: 34px; height: 34px; border-radius: 8px;
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.16s ease; color: #94a3b8;
        }
        .tn-notif-btn:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
        .tn-notif-dot {
          position: absolute; top: 6px; right: 6px; width: 6px; height: 6px;
          border-radius: 50%; background: #00d4aa;
          box-shadow: 0 0 6px rgba(0, 212, 170, 0.8);
        }

        /* USER PROFILE CHIP */
        .tn-user-chip {
          display: flex; align-items: center; gap: 9px;
          padding: 3px 10px 3px 3px; border-radius: 100px;
          cursor: pointer; transition: all 0.16s ease;
          background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .tn-user-chip:hover { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.12); }
        .tn-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #0ea5e9, #0284c7);
          color: #ffffff; display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0;
        }
        .tn-user-name { font-size: 12px; font-weight: 600; color: #f1f5f9; line-height: 1.2; }
        .tn-user-role { font-size: 10px; color: #64748b; }
        .tn-chevron { color: #64748b; font-size: 11px; }

        /* DROPDOWNS */
        .tn-dropdown {
          position: absolute; top: 46px; right: 0; width: 220px;
          background: #0f1623; border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 12px; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
          padding: 6px 0; z-index: 150; animation: tnFadeIn 0.15s ease;
        }
        @keyframes tnFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tn-dropdown-item {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 14px; font-size: 12.5px; color: #cbd5e1;
          text-decoration: none; cursor: pointer; transition: background 0.15s;
          border: none; background: none; width: 100%; text-align: left;
        }
        .tn-dropdown-item:hover { background: rgba(255, 255, 255, 0.05); color: #fff; }
        .tn-dropdown-item.danger:hover { color: #f87171; background: rgba(239, 68, 68, 0.1); }
        .tn-divider { height: 1px; background: rgba(255, 255, 255, 0.06); margin: 5px 0; }
      `}</style>

      <header className="tn-header">
        {/* Brand */}
        <Link to="/" className="tn-brand">
          <div className="tn-logo-icon">⚡</div>
          <div className="tn-brand-name">
            Career<span>AI</span>
          </div>
        </Link>

        {/* Global Search */}
        <div className="tn-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchInputRef}
            className="tn-search-input"
            type="text"
            placeholder="Quick search jobs, skills, or companies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
          />
          <span className="tn-search-kbd">⌘K</span>
        </div>

        {/* Right Nav */}
        <div className="tn-right">
          {/* Notifications */}
          <div style={{ position: "relative" }} ref={notifRef}>
            <button
              className="tn-notif-btn"
              onClick={() => setShowNotifications((p) => !p)}
              title="Notifications"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            {showNotifications && (
              <div className="tn-dropdown" style={{ width: 260, right: 0 }}>
                <div style={{ padding: "8px 14px 6px", fontSize: 11.5, fontWeight: 700, color: "#fff", display: "flex", justifyContent: "space-between" }}>
                  <span>Notifications</span>
                  <span style={{ color: "#64748b", fontSize: 10.5 }}>Real-time</span>
                </div>
                <div className="tn-divider" />
                <div style={{ padding: "16px 14px", fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                  All alerts up to date. Zero unread notifications.
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div style={{ position: "relative" }} ref={menuRef}>
            <div className="tn-user-chip" onClick={() => setShowUserMenu((p) => !p)}>
              <div className="tn-avatar" style={{
                background: isRecruiter ? "linear-gradient(135deg, #0284c7, #38bdf8)" : "linear-gradient(135deg, #00d4aa, #0284c7)"
              }}>{initials}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="tn-user-name">{displayName}</span>
                <span className="tn-user-role" style={{ color: roleColor, fontWeight: 700 }}>{roleBadge}</span>
              </div>
              <span className="tn-chevron">▾</span>
            </div>

            {showUserMenu && (
              <div className="tn-dropdown">
                <div style={{ padding: "8px 14px 4px", fontSize: 11, color: "#64748b" }}>
                  Active Session • {roleBadge}
                </div>
                <div style={{ padding: "0 14px 8px", fontSize: 12.5, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user?.email}
                </div>
                <div className="tn-divider" />
                {isRecruiter ? (
                  <>
                    <Link to="/" className="tn-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
                      Recruiter Dashboard
                    </Link>
                    <Link to="/jobs" className="tn-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      Manage Job Postings
                    </Link>
                    <Link to="/applications" className="tn-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      Candidate Funnel
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/" className="tn-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
                      Student Dashboard
                    </Link>
                    <Link to="/resume" className="tn-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Resume & ATS
                    </Link>
                    <Link to="/jobs" className="tn-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      Job Matcher
                    </Link>
                    <Link to="/applications" className="tn-dropdown-item" onClick={() => setShowUserMenu(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      My Applications
                    </Link>
                  </>
                )}
                <div className="tn-divider" />
                <button
                  className="tn-dropdown-item danger"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
