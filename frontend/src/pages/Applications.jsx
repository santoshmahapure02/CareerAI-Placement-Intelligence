import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

const STATUSES = ["Applied", "Assessment", "Interview", "Offer", "Rejected"];

const STATUS_CONFIG = {
  Applied: {
    color: "#38bdf8",
    accent: "rgba(56, 189, 248, 1)",
    border: "rgba(56, 189, 248, 0.35)",
    bg: "rgba(56, 189, 248, 0.08)",
    glow: "rgba(56, 189, 248, 0.2)",
    icon: "📤",
    desc: "Submitted & awaiting screening"
  },
  Assessment: {
    color: "#c084fc",
    accent: "rgba(192, 132, 252, 1)",
    border: "rgba(192, 132, 252, 0.35)",
    bg: "rgba(192, 132, 252, 0.08)",
    glow: "rgba(192, 132, 252, 0.2)",
    icon: "⚡",
    desc: "Online tests & coding rounds"
  },
  Interview: {
    color: "#fbbf24",
    accent: "rgba(251, 191, 36, 1)",
    border: "rgba(251, 191, 36, 0.35)",
    bg: "rgba(251, 191, 36, 0.08)",
    glow: "rgba(251, 191, 36, 0.2)",
    icon: "💬",
    desc: "Technical & managerial loops"
  },
  Offer: {
    color: "#00d4aa",
    accent: "rgba(0, 212, 170, 1)",
    border: "rgba(0, 212, 170, 0.35)",
    bg: "rgba(0, 212, 170, 0.08)",
    glow: "rgba(0, 212, 170, 0.25)",
    icon: "🎉",
    desc: "Verifiable offers received"
  },
  Rejected: {
    color: "#94a3b8",
    accent: "rgba(148, 163, 184, 1)",
    border: "rgba(148, 163, 184, 0.2)",
    bg: "rgba(148, 163, 184, 0.05)",
    glow: "rgba(148, 163, 184, 0.1)",
    icon: "📁",
    desc: "Archived submissions"
  },
};

function timeAgo(dateString) {
  if (!dateString) return "Recently";
  const ms = Date.now() - new Date(dateString).getTime();
  if (Number.isNaN(ms) || ms < 0) return "Recently";
  const days = Math.floor(ms / (1000 * 3600 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getCompanyMonogram(company = "") {
  return (company.trim().slice(0, 2) || "CO").toUpperCase();
}

export default function Applications() {
  const { user } = useAuth();
  const isRecruiter = user?.role === "recruiter";

  const [apps, setApps] = useState([]);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStageFilter, setActiveStageFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const load = () => api.applications().then(setApps).catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const changeStatus = async (id, status) => {
    setBusyId(id);
    try {
      await api.updateApplicationStatus(id, status);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const nextStage = (current) => {
    const idx = STATUSES.indexOf(current);
    if (idx >= 0 && idx < STATUSES.length - 2) {
      return STATUSES[idx + 1];
    }
    return null;
  };

  const filteredApps = apps.filter((a) => {
    if (activeStageFilter !== "all" && a.status !== activeStageFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const candidateMatch = a.applicant && (
      (a.applicant.name || "").toLowerCase().includes(q) ||
      (a.applicant.email || "").toLowerCase().includes(q)
    );
    return (
      candidateMatch ||
      (a.job?.title || "").toLowerCase().includes(q) ||
      (a.job?.company || "").toLowerCase().includes(q) ||
      (a.job?.location || "").toLowerCase().includes(q)
    );
  });

  const countsByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = apps.filter((a) => a.status === status).length;
    return acc;
  }, {});

  const offerCount = countsByStatus.Offer || 0;
  const inProgressCount = (countsByStatus.Applied || 0) + (countsByStatus.Assessment || 0) + (countsByStatus.Interview || 0);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: "#f0f3f6", maxWidth: 1300, margin: "0 auto" }}>
      <style>{`
        .ap-header-bar {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.09) 0%, rgba(56, 189, 248, 0.06) 45%, rgba(13, 18, 28, 0.96) 100%);
          border: 1px solid rgba(0, 212, 170, 0.22);
          border-radius: 16px;
          padding: 22px 26px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
          position: relative;
          overflow: hidden;
        }
        .ap-header-bar::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #00d4aa, #38bdf8, transparent);
        }
        .ap-stats-strip {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }
        .ap-stat-tile {
          background: rgba(13, 18, 28, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s ease;
        }
        .ap-stat-tile:hover {
          border-color: rgba(255, 255, 255, 0.16);
          transform: translateY(-1px);
        }
        .ap-kanban-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(230px, 1fr));
          gap: 16px;
          align-items: flex-start;
          overflow-x: auto;
          padding-bottom: 16px;
        }
        @media (max-width: 1200px) {
          .ap-kanban-grid { grid-template-columns: repeat(3, minmax(240px, 1fr)); }
        }
        @media (max-width: 768px) {
          .ap-kanban-grid { grid-template-columns: 1fr; }
        }
        .ap-col {
          background: rgba(13, 18, 28, 0.75);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-height: 480px;
          transition: border-color 0.2s;
        }
        .ap-col:hover {
          border-color: rgba(255, 255, 255, 0.12);
        }
        .ap-card {
          background: rgba(17, 24, 39, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px;
          transition: all 0.2s ease;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ap-card:hover {
          border-color: rgba(0, 212, 170, 0.35);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(0, 212, 170, 0.08);
          transform: translateY(-2px);
        }
        .ap-pill-btn {
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.04);
          color: #94a3b8;
        }
        .ap-pill-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .ap-pill-btn.active {
          background: rgba(0, 212, 170, 0.15);
          border-color: rgba(0, 212, 170, 0.35);
          color: #00d4aa;
        }
        .ap-tag {
          font-size: 10.5px;
          padding: 2px 7px;
          border-radius: 5px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
      `}</style>

      {/* ─── 1. Pipeline Command Header ─── */}
      <div className="ap-header-bar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#00d4aa", boxShadow: "0 0 10px #00d4aa"
            }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#00d4aa", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {isRecruiter ? "RECRUITER APPLICANT FUNNEL & TALENT PIPELINE" : "CANDIDATE FUNNEL & PLACEMENT CONTROL"}
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
            {isRecruiter ? "Candidate Screening & Pipeline" : "Application Pipeline Tracker"}
          </h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {apps.length === 0
              ? (isRecruiter ? "No applicant submissions found yet. Post new jobs to receive live candidate applications." : "Track your applications end-to-end through screening, assessments, and interview offers.")
              : `${apps.length} active candidate submissions • ${inProgressCount} in screening/interviews • ${offerCount} offer${offerCount === 1 ? "" : "s"} earned`}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link
            to="/jobs"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 8, background: "#00d4aa",
              color: "#090d14", fontSize: 13, fontWeight: 700, textDecoration: "none",
              boxShadow: "0 4px 14px rgba(0, 212, 170, 0.25)", transition: "all 0.15s ease"
            }}
          >
            <span>{isRecruiter ? "Manage Job Postings" : "Match & Apply to Roles"}</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#fca5a5", padding: "12px 16px", borderRadius: 10, marginBottom: 18, fontSize: 13,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ─── 2. Metric Overview Strip ─── */}
      <div className="ap-stats-strip">
        <div className="ap-stat-tile">
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "rgba(56, 189, 248, 0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
          }}>
            📤
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>Applied</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#38bdf8" }}>{countsByStatus.Applied || 0}</div>
          </div>
        </div>

        <div className="ap-stat-tile">
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "rgba(192, 132, 252, 0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
          }}>
            ⚡
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>Assessments</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#c084fc" }}>{countsByStatus.Assessment || 0}</div>
          </div>
        </div>

        <div className="ap-stat-tile">
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "rgba(251, 191, 36, 0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
          }}>
            💬
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>Interviews</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fbbf24" }}>{countsByStatus.Interview || 0}</div>
          </div>
        </div>

        <div className="ap-stat-tile">
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: "rgba(0, 212, 170, 0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16
          }}>
            🎉
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>Offers</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#00d4aa" }}>{countsByStatus.Offer || 0}</div>
          </div>
        </div>
      </div>

      {/* ─── 3. Toolbar: Search & Stage Filtering ─── */}
      <div style={{
        background: "rgba(13, 18, 28, 0.8)", backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.07)", borderRadius: 14,
        padding: "12px 16px", marginBottom: 18, display: "flex",
        alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
          <span style={{ color: "#64748b", fontSize: 15 }}>🔍</span>
          <input
            type="text"
            placeholder="Search submitted roles by title, company, or location…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "none", border: "none", outline: "none", color: "#fff",
              fontSize: 13, width: "100%", fontFamily: "inherit"
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 14, padding: "0 4px" }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Stage Filter Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className={`ap-pill-btn ${activeStageFilter === "all" ? "active" : ""}`}
            onClick={() => setActiveStageFilter("all")}
          >
            All ({apps.length})
          </button>
          {STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              className={`ap-pill-btn ${activeStageFilter === st ? "active" : ""}`}
              onClick={() => setActiveStageFilter(st)}
            >
              {st} ({countsByStatus[st] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* ─── 4. Kanban Pipeline Grid ─── */}
      {apps.length === 0 ? (
        <div style={{
          background: "rgba(13, 18, 28, 0.8)", border: "1px solid rgba(255, 255, 255, 0.07)",
          borderRadius: 16, textAlign: "center", padding: "60px 24px"
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "rgba(0, 212, 170, 0.08)",
            border: "1px solid rgba(0, 212, 170, 0.25)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 28, margin: "0 auto 16px"
          }}>
            📋
          </div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700, color: "#fff" }}>
            No Active Applications Yet
          </h3>
          <p style={{ color: "#9ca3af", maxWidth: 440, margin: "0 auto 20px", fontSize: 13.5, lineHeight: 1.5 }}>
            Explore tailored listings in the Job Matcher and apply with your verified resume profile to start tracking your recruitment stages here.
          </p>
          <Link
            to="/jobs"
            style={{
              display: "inline-block", padding: "10px 22px", borderRadius: 8,
              background: "#00d4aa", color: "#090d14", fontSize: 13, fontWeight: 700,
              textDecoration: "none", boxShadow: "0 4px 14px rgba(0, 212, 170, 0.25)"
            }}
          >
            Browse Matched Jobs →
          </Link>
        </div>
      ) : (
        <div className="ap-kanban-grid">
          {STATUSES.map((status) => {
            const inStatus = filteredApps.filter((a) => a.status === status);
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Applied;

            return (
              <div className="ap-col" key={status} style={{ borderTop: `3px solid ${cfg.accent}` }}>
                {/* Column Header */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  paddingBottom: 10, borderBottom: "1px solid rgba(255, 255, 255, 0.06)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>
                      {status}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
                    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
                  }}>
                    {inStatus.length}
                  </span>
                </div>

                {/* Subtitle / Stage hint */}
                <div style={{ fontSize: 11, color: "#64748b", margin: "-4px 0 2px 0" }}>
                  {cfg.desc}
                </div>

                {/* Cards List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {inStatus.map((app) => {
                    const job = app.job || {};
                    const next = nextStage(status);
                    const isBusy = busyId === app.id;
                    const monogram = getCompanyMonogram(job.company);

                    return (
                      <div className="ap-card" key={app.id}>
                        {/* Card Header & Content */}
                        {isRecruiter ? (
                          /* Recruiter View: Highlight Applicant Profile */
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                background: "linear-gradient(135deg, rgba(0,212,170,0.18), rgba(56,189,248,0.15))",
                                border: "1px solid rgba(0,212,170,0.3)", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                fontSize: 15, fontWeight: 800, color: "#00d4aa"
                              }}>
                                🎓
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 13.5, fontWeight: 800, color: "#fff",
                                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6
                                }}>
                                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {app.applicant?.name || "Candidate Applicant"}
                                  </span>
                                  {app.applicant?.score != null && (
                                    <span style={{
                                      fontSize: 10, padding: "2px 6px", borderRadius: 100,
                                      background: app.applicant.score >= 70 ? "rgba(0,212,170,0.15)" : "rgba(245,158,11,0.15)",
                                      color: app.applicant.score >= 70 ? "#00d4aa" : "#f59e0b",
                                      border: `1px solid ${app.applicant.score >= 70 ? "rgba(0,212,170,0.3)" : "rgba(245,158,11,0.3)"}`,
                                      fontWeight: 800, flexShrink: 0
                                    }}>
                                      {app.applicant.score}% ATS
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                                  ✉️ {app.applicant?.email || "candidate@careerai.dev"}
                                </div>
                              </div>
                            </div>

                            {/* Applied Job Info Pill */}
                            <div style={{
                              padding: "6px 8px", borderRadius: 8,
                              background: "rgba(255, 255, 255, 0.03)",
                              border: "1px solid rgba(255, 255, 255, 0.06)",
                              fontSize: 11.5, color: "#cbd5e1"
                            }}>
                              <span style={{ color: "#64748b" }}>Role: </span>
                              <strong style={{ color: "#38bdf8" }}>{job.title || "Software Engineer"}</strong>
                              <span style={{ color: "#9ca3af" }}> • {job.company || "Employer"}</span>
                            </div>

                            {/* Applicant Verified Skills */}
                            {app.applicant?.skills && app.applicant.skills.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {app.applicant.skills.slice(0, 3).map((sk) => (
                                  <span key={sk} style={{
                                    fontSize: 10, padding: "1px 5px", borderRadius: 4,
                                    background: "rgba(56, 189, 248, 0.08)", color: "#7dd3fc",
                                    border: "1px solid rgba(56, 189, 248, 0.2)"
                                  }}>
                                    {sk}
                                  </span>
                                ))}
                                {app.applicant.skills.length > 3 && (
                                  <span style={{ fontSize: 9.5, color: "#64748b", alignSelf: "center" }}>
                                    +{app.applicant.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Candidate View: Target Job Details */
                          <>
                            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                                border: "1px solid rgba(255,255,255,0.1)", display: "flex",
                                alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: "0.05em"
                              }}>
                                {monogram}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 13, fontWeight: 700, color: "#fff",
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                }}>
                                  {job.title || "Software Engineer"}
                                </div>
                                <div style={{
                                  fontSize: 11.5, color: "#9ca3af",
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                }}>
                                  {job.company || "Employer"}
                                </div>
                              </div>
                            </div>

                            {/* Metadata badges (Workplace, Salary, Location) */}
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "2px 0" }}>
                              {job.workplaceType && (
                                <span className="ap-tag" style={{
                                  background: "rgba(56, 189, 248, 0.08)", color: "#38bdf8",
                                  border: "1px solid rgba(56, 189, 248, 0.2)"
                                }}>
                                  {job.workplaceType}
                                </span>
                              )}
                              {job.salary && (
                                <span className="ap-tag" style={{
                                  background: "rgba(0, 212, 170, 0.08)", color: "#00d4aa",
                                  border: "1px solid rgba(0, 212, 170, 0.2)"
                                }}>
                                  {job.salary}
                                </span>
                              )}
                              {job.location && (
                                <span className="ap-tag" style={{
                                  background: "rgba(255, 255, 255, 0.04)", color: "#94a3b8",
                                  border: "1px solid rgba(255, 255, 255, 0.08)"
                                }}>
                                  📍 {job.location}
                                </span>
                              )}
                            </div>

                            {/* Required skills preview if available */}
                            {job.requiredSkills && job.requiredSkills.length > 0 && (
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {job.requiredSkills.slice(0, 3).map((sk) => (
                                  <span key={sk} style={{
                                    fontSize: 10, padding: "1px 5px", borderRadius: 4,
                                    background: "rgba(255, 255, 255, 0.03)", color: "#cbd5e1",
                                    border: "1px solid rgba(255, 255, 255, 0.06)"
                                  }}>
                                    {sk}
                                  </span>
                                ))}
                                {job.requiredSkills.length > 3 && (
                                  <span style={{ fontSize: 9.5, color: "#64748b", alignSelf: "center" }}>
                                    +{job.requiredSkills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Card Footer: Timestamp & Stage Advancement */}
                        <div style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          paddingTop: 8, borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                          marginTop: 2, fontSize: 11, color: "#64748b"
                        }}>
                          <span title={app.createdAt ? new Date(app.createdAt).toLocaleString() : ""}>
                            🕒 {timeAgo(app.createdAt)}
                          </span>

                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {/* Advance stage button */}
                            {next && (
                              <button
                                type="button"
                                onClick={() => changeStatus(app.id, next)}
                                disabled={isBusy}
                                style={{
                                  padding: "3px 9px", borderRadius: 6,
                                  background: "rgba(0, 212, 170, 0.1)",
                                  border: "1px solid rgba(0, 212, 170, 0.3)",
                                  color: "#00d4aa", fontSize: 10.5, fontWeight: 700,
                                  cursor: isBusy ? "wait" : "pointer", transition: "all 0.15s"
                                }}
                                title={`Advance application to ${next}`}
                              >
                                {isBusy ? "…" : `→ ${next}`}
                              </button>
                            )}

                            {/* Mark rejected/archive if in active stage */}
                            {status !== "Rejected" && status !== "Offer" && (
                              <button
                                type="button"
                                onClick={() => changeStatus(app.id, "Rejected")}
                                disabled={isBusy}
                                style={{
                                  padding: "3px 6px", borderRadius: 6,
                                  background: "rgba(255, 255, 255, 0.03)",
                                  border: "1px solid rgba(255, 255, 255, 0.08)",
                                  color: "#64748b", fontSize: 10.5,
                                  cursor: isBusy ? "wait" : "pointer", transition: "all 0.15s"
                                }}
                                title="Archive / Mark rejected"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {inStatus.length === 0 && (
                  <div style={{
                    color: "#475569", fontSize: 12, textAlign: "center",
                    padding: "36px 10px", fontStyle: "italic",
                    background: "rgba(255, 255, 255, 0.01)", borderRadius: 8,
                    border: "1px dashed rgba(255, 255, 255, 0.05)"
                  }}>
                    No applications in this stage
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
