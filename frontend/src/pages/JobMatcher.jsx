import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

/* ─── Company Avatar Badge with Gradient Initials ─── */
function CompanyAvatar({ company = "", size = 44 }) {
  const name = company.trim();
  const initials = name.slice(0, 2).toUpperCase() || "JB";
  
  const gradients = [
    "linear-gradient(135deg, #00d4aa 0%, #0284c7 100%)",
    "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    "linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)",
    "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  const bg = gradients[Math.abs(hash) % gradients.length];

  return (
    <div style={{
      width: size, height: size, borderRadius: 12, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#080c14", fontSize: 15, fontWeight: 900, flexShrink: 0,
      letterSpacing: "-0.02em", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }}>
      {initials}
    </div>
  );
}

/* ─── Compact Circular ATS Match Ring ─── */
function MatchRing({ pct = null, size = 46 }) {
  const hasScore = pct != null && pct > 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const fill = hasScore ? ((pct / 100) * circ).toFixed(1) : 0;
  const color = !hasScore ? "#64748b" : pct >= 80 ? "#00d4aa" : pct >= 60 ? "#38bdf8" : "#f59e0b";

  return (
    <div style={{ position: "relative", width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center", lineHeight: 1 }}>
        <span style={{ fontSize: hasScore ? 12 : 11, fontWeight: 800, color: hasScore ? "#ffffff" : "#64748b" }}>
          {hasScore ? `${pct}%` : "—"}
        </span>
      </div>
    </div>
  );
}

function formatJobTimeAgo(dateString) {
  if (!dateString) return "Recently";
  const ms = Date.now() - new Date(dateString).getTime();
  if (Number.isNaN(ms) || ms < 0) return "Recently";
  const days = Math.floor(ms / (1000 * 3600 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const POPULAR_KEYWORDS = ["React", "Java", "Python", "Node.js", "AWS", "SQL", "Docker", "TypeScript"];
const TABS = ["Best Fit", "All Roles", "Saved", "Applied"];

export default function JobMatcher() {
  const { user } = useAuth();
  const location = useLocation();
  const isRecruiter = user?.role === "recruiter";

  const [jobs, setJobs] = useState([]);
  const [matches, setMatches] = useState({});
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [savedIds, setSavedIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState("Best Fit");
  const [showPostModal, setShowPostModal] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [activeDetailId, setActiveDetailId] = useState(null);
  const [newJob, setNewJob] = useState({
    title: "",
    company: "",
    description: "",
    skills: "React, Node.js, TypeScript",
    location: "Bengaluru, India",
    workplaceType: "remote",
    experienceLevel: "mid",
    salary: "₹18L – ₹30L",
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [workplace, setWorkplace] = useState("all"); // "all" | "remote" | "hybrid" | "on-site"
  const [experience, setExperience] = useState("all"); // "all" | "entry" | "mid" | "senior"
  const [onlyHighMatch, setOnlyHighMatch] = useState(false);

  // Sync URL query if navigated with ?q=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q) setSearchQuery(q);
  }, [location.search]);

  // Load jobs and match recommendations
  const loadJobs = useCallback(() => {
    const params = {
      q: searchQuery || undefined,
      workplaceType: workplace !== "all" ? workplace : undefined,
      experienceLevel: experience !== "all" ? experience : undefined,
    };

    api.jobs(params)
      .then((data) => setJobs(data || []))
      .catch((e) => setError(e.message || "Failed to load jobs"));

    if (!isRecruiter) {
      api.recommendations()
        .then((res) => {
          const map = {};
          (res || []).forEach((r) => (map[r.jobId] = r));
          setMatches(map);
        })
        .catch(() => {});
    }

    api.applications()
      .then((apps) => {
        setAppliedIds(new Set((apps || []).map((a) => a.jobId)));
      })
      .catch(() => {});
  }, [searchQuery, workplace, experience, isRecruiter]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    try {
      await api.syncJobs();
      loadJobs();
    } catch (e) {
      setError(e.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const apply = async (jobId) => {
    try {
      await api.applyToJob(jobId);
      setAppliedIds((prev) => new Set(prev).add(jobId));
    } catch (e) {
      setError(e.message || "Failed to apply");
    }
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!newJob.title || !newJob.company || !newJob.description) {
      setError("Please fill in role title, company, and job description.");
      return;
    }
    setCreatingJob(true);
    setError("");
    try {
      const skillsArr = newJob.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.createJob({
        title: newJob.title.trim(),
        company: newJob.company.trim(),
        description: newJob.description.trim(),
        requiredSkills: skillsArr.length > 0 ? skillsArr : ["React", "JavaScript"],
        location: newJob.location.trim() || "Remote",
        workplaceType: newJob.workplaceType,
        experienceLevel: newJob.experienceLevel,
        salary: newJob.salary.trim() || "Competitive",
      });
      setShowPostModal(false);
      setNewJob({
        title: "",
        company: "",
        description: "",
        skills: "React, Node.js, TypeScript",
        location: "Bengaluru, India",
        workplaceType: "remote",
        experienceLevel: "mid",
        salary: "₹18L – ₹30L",
      });
      loadJobs();
    } catch (err) {
      setError(err.message || "Failed to post job");
    } finally {
      setCreatingJob(false);
    }
  };

  const toggleSave = (jobId) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  // Helper to extract match info
  const getJobMatchData = useCallback((job) => {
    if (matches[job.id]) {
      return {
        pct: matches[job.id].overallMatch || 0,
        matchedSkills: matches[job.id].matchedSkills || [],
        missingSkills: matches[job.id].missingSkills || [],
        explanation: matches[job.id].explanation || {},
        hasMatch: true,
      };
    }
    return {
      pct: null,
      matchedSkills: [],
      missingSkills: job.requiredSkills || [],
      explanation: { summary: "Scan your resume to compute real-time compatibility." },
      hasMatch: false,
    };
  }, [matches]);

  // Market Intelligence (Top Skills from currently active jobs)
  const topDemandSkills = useMemo(() => {
    const map = {};
    for (const j of jobs) {
      for (const sk of j.requiredSkills || []) {
        map[sk] = (map[sk] || 0) + 1;
      }
    }
    const colors = ["#00d4aa", "#38bdf8", "#818cf8", "#f59e0b", "#10b981"];
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, count], i) => ({
        skill,
        count,
        color: colors[i % colors.length],
      }));
  }, [jobs]);

  // Match statistics for candidate
  const matchStats = useMemo(() => {
    let high = 0, good = 0, moderate = 0;
    jobs.forEach((j) => {
      const s = matches[j.id]?.overallMatch || 0;
      if (s >= 80) high++;
      else if (s >= 60) good++;
      else if (s > 0) moderate++;
    });
    return { high, good, moderate, total: jobs.length };
  }, [jobs, matches]);

  // Filter & sort jobs based on tab and high match checkbox
  const displayJobs = useMemo(() => {
    let list = [...jobs];

    if (onlyHighMatch) {
      list = list.filter((j) => (matches[j.id]?.overallMatch || 0) >= 80);
    }

    if (activeTab === "Saved") {
      list = list.filter((j) => savedIds.has(j.id));
    } else if (activeTab === "Applied") {
      list = list.filter((j) => appliedIds.has(j.id));
    } else if (activeTab === "Best Fit") {
      list.sort((a, b) => {
        const aScore = matches[a.id]?.overallMatch ?? -1;
        const bScore = matches[b.id]?.overallMatch ?? -1;
        if (aScore !== bScore) return bScore - aScore;
        return new Date(b.postedAt || b.createdAt) - new Date(a.postedAt || a.createdAt);
      });
    } else {
      // "All Roles" - recent first
      list.sort((a, b) => new Date(b.postedAt || b.createdAt) - new Date(a.postedAt || a.createdAt));
    }

    return list;
  }, [jobs, matches, savedIds, appliedIds, activeTab, onlyHighMatch]);

  const hasAnyFilter = searchQuery || workplace !== "all" || experience !== "all" || onlyHighMatch;

  const resetFilters = () => {
    setSearchQuery("");
    setWorkplace("all");
    setExperience("all");
    setOnlyHighMatch(false);
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: "#f0f3f6", maxWidth: 1240, margin: "0 auto" }}>
      <style>{`
        .jm-header-bar {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(56, 189, 248, 0.05) 50%, rgba(13, 18, 28, 0.95) 100%);
          border: 1px solid rgba(0, 212, 170, 0.2);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .jm-search-row {
          background: rgba(13, 18, 28, 0.85);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px 18px;
          margin-bottom: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .jm-input-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 10px;
          padding: 9px 14px;
          flex: 1;
        }

        .jm-pill {
          padding: 6px 13px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .jm-pill:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }
        .jm-pill.active {
          background: rgba(0, 212, 170, 0.12);
          border-color: rgba(0, 212, 170, 0.35);
          color: #00d4aa;
        }

        .jm-tag-chip {
          padding: 4px 11px;
          border-radius: 100px;
          font-size: 11.5px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .jm-tag-chip:hover, .jm-tag-chip.active {
          background: rgba(56, 189, 248, 0.12);
          border-color: rgba(56, 189, 248, 0.3);
          color: #38bdf8;
        }

        .jm-main-grid {
          display: grid;
          grid-template-columns: 1fr 310px;
          gap: 18px;
          align-items: start;
        }
        @media (max-width: 1040px) {
          .jm-main-grid { grid-template-columns: 1fr; }
        }

        .jm-card {
          background: rgba(13, 18, 28, 0.85);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 12px;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
        }
        .jm-card:hover {
          border-color: rgba(0, 212, 170, 0.25);
          box-shadow: 0 6px 22px rgba(0, 0, 0, 0.3);
        }

        .jm-badge {
          padding: 2.5px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .jm-badge-remote { background: rgba(0, 212, 170, 0.09); color: #00d4aa; border: 1px solid rgba(0, 212, 170, 0.2); }
        .jm-badge-hybrid { background: rgba(56, 189, 248, 0.09); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); }
        .jm-badge-onsite { background: rgba(245, 158, 11, 0.09); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }

        .jm-apply-btn {
          height: 35px;
          padding: 0 16px;
          border-radius: 8px;
          background: #00d4aa;
          color: #090d14;
          font-size: 12.5px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .jm-apply-btn:hover {
          background: #00bfa0;
          transform: translateY(-1px);
        }
        .jm-apply-btn:disabled {
          background: rgba(0, 212, 170, 0.12);
          color: #00d4aa;
          border: 1px solid rgba(0, 212, 170, 0.25);
          cursor: default;
          transform: none;
        }

        .jm-ext-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #38bdf8;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .jm-ext-link:hover {
          background: rgba(56, 189, 248, 0.18);
          border-color: rgba(56, 189, 248, 0.5);
          color: #ffffff;
          transform: translateY(-1px);
        }

        .jm-save-btn {
          width: 35px;
          height: 35px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.15s ease;
        }
        .jm-save-btn:hover, .jm-save-btn.saved {
          color: #00d4aa;
          background: rgba(0, 212, 170, 0.1);
          border-color: rgba(0, 212, 170, 0.3);
        }

        .jm-side-card {
          background: rgba(13, 18, 28, 0.85);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 16px;
        }
      `}</style>

      {/* ─── 1. Header Bar ─── */}
      <div className="jm-header-bar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#00d4aa", boxShadow: "0 0 10px #00d4aa"
            }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#00d4aa", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              LIVE MARKET MATCHING ENGINE
            </span>
          </div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: "#fff", margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
            Precision Role Compatibility
          </h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {jobs.length} active opportunities evaluated against candidate skill profiles & ATS parameters.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#e2e8f0", fontSize: 12.5, fontWeight: 600,
              cursor: syncing ? "wait" : "pointer", transition: "all 0.15s"
            }}
          >
            {syncing ? "⟳ Syncing Jobs…" : "⚡ Refresh Live Index"}
          </button>

          {isRecruiter ? (
            <button
              type="button"
              onClick={() => setShowPostModal(true)}
              style={{
                padding: "8px 16px", borderRadius: 8,
                background: "#00d4aa", color: "#090d14",
                fontSize: 12.5, fontWeight: 700,
                border: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5,
                boxShadow: "0 4px 14px rgba(0, 212, 170, 0.25)"
              }}
            >
              <span>+ Post New Job</span>
            </button>
          ) : (
            <Link
              to="/resume"
              style={{
                padding: "8px 16px", borderRadius: 8,
                background: "rgba(0, 212, 170, 0.12)",
                border: "1px solid rgba(0, 212, 170, 0.3)",
                color: "#00d4aa", fontSize: 12.5, fontWeight: 700,
                textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5
              }}
            >
              <span>Audit Resume ATS</span> →
            </Link>
          )}
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#fca5a5", padding: "10px 14px", borderRadius: 10,
          marginBottom: 16, fontSize: 13
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ─── 2. Search & Interactive Filter Row ─── */}
      <div className="jm-search-row">
        {/* Top search input & workplace buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div className="jm-input-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by role title, tech stack, or company name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 13.5, width: "100%", fontFamily: "inherit"
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Workplace type filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Formats" },
              { id: "remote", label: "Remote" },
              { id: "hybrid", label: "Hybrid" },
              { id: "on-site", label: "On-site" },
            ].map((w) => (
              <button
                key={w.id}
                type="button"
                className={`jm-pill ${workplace === w.id ? "active" : ""}`}
                onClick={() => setWorkplace(w.id)}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* Experience level filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Experience" },
              { id: "entry", label: "Entry (0–2y)" },
              { id: "mid", label: "Mid (2–5y)" },
              { id: "senior", label: "Senior (5y+)" },
            ].map((exp) => (
              <button
                key={exp.id}
                type="button"
                className={`jm-pill ${experience === exp.id ? "active" : ""}`}
                onClick={() => setExperience(exp.id)}
              >
                {exp.label}
              </button>
            ))}
          </div>

          {/* 80%+ High match toggle */}
          {!isRecruiter && (
            <button
              type="button"
              className={`jm-pill ${onlyHighMatch ? "active" : ""}`}
              onClick={() => setOnlyHighMatch(!onlyHighMatch)}
              style={{
                borderColor: onlyHighMatch ? "#00d4aa" : "rgba(255, 255, 255, 0.1)",
              }}
            >
              <span>★</span>
              <span>80%+ Match</span>
            </button>
          )}

          {hasAnyFilter && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                background: "none", border: "none", color: "#9ca3af",
                fontSize: 12, cursor: "pointer", textDecoration: "underline", padding: "4px 8px"
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Popular keyword tags row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 8, borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
          <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>Quick Filter:</span>
          {POPULAR_KEYWORDS.map((kw) => (
            <button
              key={kw}
              type="button"
              className={`jm-tag-chip ${searchQuery.toLowerCase() === kw.toLowerCase() ? "active" : ""}`}
              onClick={() => setSearchQuery(searchQuery.toLowerCase() === kw.toLowerCase() ? "" : kw)}
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* ─── 3. Main Split Grid: Feed + Right Intelligence ─── */}
      <div className="jm-main-grid">
        {/* Left Column: Job Feed */}
        <div>
          {/* Tabs bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: 6 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                    background: activeTab === tab ? "rgba(0, 212, 170, 0.12)" : "transparent",
                    border: `1px solid ${activeTab === tab ? "rgba(0, 212, 170, 0.3)" : "transparent"}`,
                    color: activeTab === tab ? "#00d4aa" : "#94a3b8",
                    cursor: "pointer", transition: "all 0.15s"
                  }}
                >
                  {tab === "Best Fit" && "★ "}
                  {tab === "Saved" && "🔖 "}
                  {tab === "Applied" && "✓ "}
                  {tab}
                  {tab === "Saved" && savedIds.size > 0 && ` (${savedIds.size})`}
                  {tab === "Applied" && appliedIds.size > 0 && ` (${appliedIds.size})`}
                </button>
              ))}
            </div>

            <span style={{ fontSize: 12, color: "#64748b" }}>
              Showing {displayJobs.length} roles
            </span>
          </div>

          {/* Job cards list */}
          {displayJobs.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "48px 20px",
              background: "rgba(13, 18, 28, 0.85)", borderRadius: 14,
              border: "1px solid rgba(255, 255, 255, 0.07)"
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                No postings match your criteria
              </div>
              <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "0 0 16px 0" }}>
                Try adjusting keyword filters or switching to "All Roles".
              </p>
              <button
                type="button"
                className="jm-pill active"
                onClick={resetFilters}
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            displayJobs.map((job) => {
              const match = getJobMatchData(job);
              const isApplied = appliedIds.has(job.id);
              const isSaved = savedIds.has(job.id);
              const isDetailOpen = activeDetailId === job.id;
              const wp = (job.workplaceType || "remote").toLowerCase();
              const timeAgo = formatJobTimeAgo(job.postedAt || job.createdAt);

              let expText = "2–5 yrs";
              if (job.experienceLevel === "entry") expText = "0–2 yrs";
              else if (job.experienceLevel === "senior") expText = "5+ yrs";
              else if (job.experienceLevel === "intern") expText = "Intern";

              return (
                <div key={job.id} className="jm-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
                    {/* Left: Avatar + Role Info */}
                    <div style={{ display: "flex", gap: 14, flex: 1, minWidth: 0 }}>
                      <CompanyAvatar company={job.company} size={44} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>
                            {job.title}
                          </span>
                          <span className={`jm-badge ${wp === "hybrid" ? "jm-badge-hybrid" : wp === "on-site" ? "jm-badge-onsite" : "jm-badge-remote"}`}>
                            {job.workplaceType ? (job.workplaceType.charAt(0).toUpperCase() + job.workplaceType.slice(1)) : "Remote"}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12.5, color: "#94a3b8", marginBottom: 8 }}>
                          <span style={{ color: "#cbd5e1", fontWeight: 600 }}>{job.company}</span>
                          <span>•</span>
                          <span>📍 {job.location || "Remote / Global"}</span>
                          <span>•</span>
                          <span>🎓 {expText}</span>
                          <span>•</span>
                          <span style={{ color: "#00d4aa", fontWeight: 700 }}>💰 {job.salary || "Competitive"}</span>
                          {job.source && job.source !== "platform" && (
                            <>
                              <span>•</span>
                              <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 5, background: "rgba(56, 189, 248, 0.1)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                                Live: {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Direct Skill Overlap Chips */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          {/* Matched skills */}
                          {match.matchedSkills.slice(0, 3).map((s) => (
                            <span key={s} style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: "rgba(0, 212, 170, 0.08)", border: "1px solid rgba(0, 212, 170, 0.22)", color: "#a7f3d0"
                            }}>
                              ✓ {s}
                            </span>
                          ))}
                          {/* Missing skills */}
                          {match.missingSkills.slice(0, 2).map((s) => (
                            <span key={s} style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                              background: "rgba(244, 63, 94, 0.06)", border: "1px solid rgba(244, 63, 94, 0.18)", color: "#fda4af"
                            }}>
                              ✕ {s}
                            </span>
                          ))}
                          {/* Fallback required skills if no match data */}
                          {!match.hasMatch && (job.requiredSkills || []).slice(0, 4).map((s) => (
                            <span key={s} style={{
                              padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                              background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", color: "#cbd5e1"
                            }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Match Ring + Action CTAs */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {/* Match Indicator */}
                        {!isRecruiter && (
                          <div
                            onClick={() => setActiveDetailId(isDetailOpen ? null : job.id)}
                            style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                            title="Click for compatibility breakdown"
                          >
                            <MatchRing pct={match.pct} size={44} />
                          </div>
                        )}

                        {/* Save Bookmark Button */}
                        <button
                          type="button"
                          className={`jm-save-btn ${isSaved ? "saved" : ""}`}
                          onClick={() => toggleSave(job.id)}
                          title={isSaved ? "Saved" : "Save Job"}
                        >
                          🔖
                        </button>

                        {/* External Real Job Link */}
                        {job.url && (
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="jm-ext-link"
                            title="Open verified real employer posting"
                          >
                            Live Post ↗
                          </a>
                        )}

                        {/* Apply CTA */}
                        {!isRecruiter ? (
                          <button
                            type="button"
                            className="jm-apply-btn"
                            disabled={isApplied}
                            onClick={() => apply(job.id)}
                          >
                            {isApplied ? "✓ Applied" : "Apply Now →"}
                          </button>
                        ) : (
                          <Link
                            to={`/jobs/${job.id}/candidates`}
                            className="jm-apply-btn"
                            style={{ textDecoration: "none" }}
                          >
                            Candidates →
                          </Link>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#64748b" }}>
                        <span>🕐 {timeAgo}</span>
                        {!isRecruiter && (
                          <button
                            type="button"
                            onClick={() => setActiveDetailId(isDetailOpen ? null : job.id)}
                            style={{
                              background: "none", border: "none", color: "#38bdf8",
                              fontSize: 11.5, cursor: "pointer", padding: 0
                            }}
                          >
                            {isDetailOpen ? "Hide Breakdown ▲" : "Fit Breakdown ▼"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Match Drawer */}
                  {isDetailOpen && (
                    <div style={{
                      marginTop: 12, paddingTop: 12,
                      borderTop: "1px solid rgba(255, 255, 255, 0.07)",
                      fontSize: 12.5, color: "#cbd5e1"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: "#00d4aa", fontSize: 12 }}>
                          ATS COMPATIBILITY AUDIT
                        </span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>
                          {match.matchedSkills.length} matched • {match.missingSkills.length} missing
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, marginBottom: 8 }}>
                        {match.explanation?.summary || "Direct algorithmic match between your active resume keywords and employer job requirements."}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {match.matchedSkills.map((s) => (
                          <span key={s} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, background: "rgba(0, 212, 170, 0.1)", color: "#00d4aa" }}>
                            ✓ {s} (In Resume)
                          </span>
                        ))}
                        {match.missingSkills.map((s) => (
                          <span key={s} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, background: "rgba(244, 63, 94, 0.1)", color: "#f43f5e" }}>
                            ✕ {s} (Missing Keyword)
                          </span>
                        ))}
                      </div>

                      {job.description && (
                        <div style={{ marginTop: 10, padding: 10, background: "rgba(0,0,0,0.25)", borderRadius: 8, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>
                          <div style={{ fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>Role Overview:</div>
                          {job.description.slice(0, 320)}…
                          {job.url && (
                            <div style={{ marginTop: 8 }}>
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#38bdf8", textDecoration: "underline", fontSize: 11.5, fontWeight: 600 }}
                              >
                                View full job specifications on {job.company} portal →
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Market Intelligence & Alignment */}
        <div>
          {/* Card 1: Match Distribution Overview */}
          {!isRecruiter && (
            <div className="jm-side-card">
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                <span>Match Distribution</span>
                <span style={{ fontSize: 11, color: "#00d4aa" }}>Live Index</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4aa" }} />
                    <span style={{ fontSize: 12, color: "#cbd5e1" }}>High Match (≥80%)</span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#00d4aa" }}>{matchStats.high} roles</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8" }} />
                    <span style={{ fontSize: 12, color: "#cbd5e1" }}>Good Match (60–79%)</span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#38bdf8" }}>{matchStats.good} roles</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                    <span style={{ fontSize: 12, color: "#cbd5e1" }}>Moderate Match (&lt;60%)</span>
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#f59e0b" }}>{matchStats.moderate} roles</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Market Skills in Demand */}
          <div className="jm-side-card">
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
              <span>Market Skill Demand</span>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>385 Postings</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topDemandSkills.map((sk) => {
                const max = topDemandSkills[0]?.count || 1;
                const pct = Math.round((sk.count / max) * 100);
                return (
                  <div key={sk.skill}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: "#cbd5e1", fontWeight: 500 }}>{sk.skill}</span>
                      <span style={{ color: "#9ca3af" }}>{sk.count} roles</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(255, 255, 255, 0.06)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: sk.color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Quick Pro-Tip Bridge to Resume */}
          {!isRecruiter && (
            <div className="jm-side-card" style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#38bdf8", marginBottom: 6 }}>
                💡 Boost Match Compatibility
              </div>
              <p style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.45, margin: "0 0 12px 0" }}>
                Add 2–3 missing skills to your active resume using the AI Bullet Polisher to jump into the 80%+ tier.
              </p>
              <Link
                to="/resume"
                style={{
                  display: "inline-block", padding: "6px 12px", borderRadius: 7,
                  background: "#38bdf8", color: "#080c14", fontSize: 11.5, fontWeight: 700,
                  textDecoration: "none"
                }}
              >
                Open Resume Optimizer →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recruiter Post Job Modal */}
      {showPostModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 100, padding: 16
        }}>
          <div style={{
            background: "#0d121c", border: "1px solid rgba(0, 212, 170, 0.3)",
            borderRadius: 18, width: "100%", maxWidth: 540, padding: 24,
            boxShadow: "0 24px 60px rgba(0,0,0,0.8)", maxHeight: "90vh", overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <span>💼</span> Post New Verified Job
              </h2>
              <button
                type="button"
                onClick={() => setShowPostModal(false)}
                style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Full Stack Engineer"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  style={{
                    width: "100%", background: "#090d14", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 9, padding: "10px 12px", color: "#fff", fontSize: 13, boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google India"
                    value={newJob.company}
                    onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                    style={{
                      width: "100%", background: "#090d14", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 9, padding: "10px 12px", color: "#fff", fontSize: 13, boxSizing: "border-box"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru / Remote"
                    value={newJob.location}
                    onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                    style={{
                      width: "100%", background: "#090d14", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 9, padding: "10px 12px", color: "#fff", fontSize: 13, boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>
                    Workplace
                  </label>
                  <select
                    value={newJob.workplaceType}
                    onChange={(e) => setNewJob({ ...newJob, workplaceType: e.target.value })}
                    style={{
                      width: "100%", background: "#090d14", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 9, padding: "10px 8px", color: "#fff", fontSize: 12.5, boxSizing: "border-box"
                    }}
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="on-site">On-site</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>
                    Experience
                  </label>
                  <select
                    value={newJob.experienceLevel}
                    onChange={(e) => setNewJob({ ...newJob, experienceLevel: e.target.value })}
                    style={{
                      width: "100%", background: "#090d14", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 9, padding: "10px 8px", color: "#fff", fontSize: 12.5, boxSizing: "border-box"
                    }}
                  >
                    <option value="entry">Entry (0-2y)</option>
                    <option value="mid">Mid (2-5y)</option>
                    <option value="senior">Senior (5y+)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>
                    Salary Range
                  </label>
                  <input
                    type="text"
                    placeholder="₹20L – ₹35L"
                    value={newJob.salary}
                    onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
                    style={{
                      width: "100%", background: "#090d14", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 9, padding: "10px 8px", color: "#fff", fontSize: 12.5, boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>
                  Required Skills (comma-separated) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, Node.js, Python, PostgreSQL, AWS"
                  value={newJob.skills}
                  onChange={(e) => setNewJob({ ...newJob, skills: e.target.value })}
                  style={{
                    width: "100%", background: "#090d14", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 9, padding: "10px 12px", color: "#fff", fontSize: 13, boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 5 }}>
                  Job Description & Qualifications *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Outline key responsibilities, tech stack, and ideal candidate profile…"
                  value={newJob.description}
                  onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                  style={{
                    width: "100%", background: "#090d14", border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 9, padding: "10px 12px", color: "#fff", fontSize: 13, boxSizing: "border-box",
                    fontFamily: "inherit", resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  style={{
                    padding: "9px 16px", borderRadius: 8, background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)", color: "#9ca3af", fontSize: 13, cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingJob}
                  style={{
                    padding: "9px 20px", borderRadius: 8, background: "#00d4aa",
                    border: "none", color: "#090d14", fontSize: 13, fontWeight: 700,
                    cursor: creatingJob ? "wait" : "pointer"
                  }}
                >
                  {creatingJob ? "Publishing Job…" : "Publish Job Listing →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
