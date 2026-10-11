import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";

/* ─── Compact Company Badge ─── */
function CompanyBadge({ company = "" }) {
  const letter = (company.trim()[0] || "C").toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 9,
      background: "linear-gradient(135deg, rgba(0, 212, 170, 0.2), rgba(56, 189, 248, 0.2))",
      border: "1px solid rgba(0, 212, 170, 0.3)",
      color: "#00d4aa", display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 800, fontSize: 14, flexShrink: 0
    }}>
      {letter}
    </div>
  );
}

/* ─── Candidate Dashboard ─── */
function StudentDashboard({ data, user }) {
  const firstName = user?.name?.split(" ")[0] || "Student";
  const ats = data.atsScore || 0;
  const totalJobs = data.jobsAvailable || 0;
  const totalApps = data.applications?.total || 0;
  const topMatches = data.topMatches || [];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: "#f0f3f6" }}>
      <style>{`
        .dash-hero {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(56, 189, 248, 0.05) 50%, rgba(13, 18, 28, 0.95) 100%);
          border: 1px solid rgba(0, 212, 170, 0.2);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
        }
        .dash-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 20px;
        }
        @media (max-width: 860px) {
          .dash-stats-row { grid-template-columns: 1fr; }
        }
        .dash-stat-box {
          background: rgba(13, 18, 28, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 14px;
          padding: 18px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          color: inherit;
          transition: border-color 0.15s ease;
        }
        .dash-stat-box:hover {
          border-color: rgba(0, 212, 170, 0.3);
        }
        .dash-content-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 18px;
          align-items: start;
        }
        @media (max-width: 1020px) {
          .dash-content-grid { grid-template-columns: 1fr; }
        }
        .dash-panel {
          background: rgba(13, 18, 28, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 16px;
          padding: 20px;
        }
        .dash-job-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 10px;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .dash-job-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(0, 212, 170, 0.3);
        }
        .dash-job-card:last-child { margin-bottom: 0; }
        .dash-match-badge {
          padding: 3px 9px;
          border-radius: 100px;
          font-size: 11.5px;
          font-weight: 700;
          background: rgba(0, 212, 170, 0.12);
          color: #00d4aa;
          border: 1px solid rgba(0, 212, 170, 0.3);
          flex-shrink: 0;
        }
      `}</style>

      {/* 1. Header */}
      <div className="dash-hero">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px 0" }}>
            Welcome back, {firstName} 🎓
          </h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {data.hasResume
              ? `Student profile evaluated: ATS Score ${ats}/100 across ${totalJobs} verified postings.`
              : "Upload your resume to calculate your student ATS score and unlock precision matchmaking."}
          </p>
        </div>

        <div>
          {!data.hasResume ? (
            <Link
              to="/resume"
              style={{
                display: "inline-flex", padding: "8px 18px", borderRadius: 8,
                background: "#00d4aa", color: "#090d14", fontSize: 13, fontWeight: 700,
                textDecoration: "none"
              }}
            >
              Upload Resume →
            </Link>
          ) : (
            <Link
              to="/jobs"
              style={{
                display: "inline-flex", padding: "8px 18px", borderRadius: 8,
                background: "rgba(0, 212, 170, 0.12)", border: "1px solid rgba(0, 212, 170, 0.3)",
                color: "#00d4aa", fontSize: 13, fontWeight: 700, textDecoration: "none"
              }}
            >
              View Matches ({topMatches.length}) →
            </Link>
          )}
        </div>
      </div>

      {/* 2. 3 Clean Stats */}
      <div className="dash-stats-row">
        <Link to="/resume" className="dash-stat-box">
          <div style={{
            width: 42, height: 42, borderRadius: 10, background: "rgba(0, 212, 170, 0.12)",
            color: "#00d4aa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
          }}>
            📄
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>ATS Score</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 2 }}>
              {data.hasResume ? `${ats}/100` : "—"}
            </div>
          </div>
        </Link>

        <Link to="/jobs" className="dash-stat-box">
          <div style={{
            width: 42, height: 42, borderRadius: 10, background: "rgba(56, 189, 248, 0.12)",
            color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
          }}>
            💼
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Active Roles</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 2 }}>
              {totalJobs}
            </div>
          </div>
        </Link>

        <Link to="/applications" className="dash-stat-box">
          <div style={{
            width: 42, height: 42, borderRadius: 10, background: "rgba(168, 85, 247, 0.12)",
            color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
          }}>
            📋
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Applications</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 2 }}>
              {totalApps}
            </div>
          </div>
        </Link>
      </div>

      {/* 3. 2-Column Grid */}
      <div className="dash-content-grid">
        {/* Left: Top Matches */}
        <div className="dash-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
              Top Matching Roles
            </span>
            <Link to="/jobs" style={{ fontSize: 12.5, color: "#00d4aa", textDecoration: "none", fontWeight: 600 }}>
              All Jobs →
            </Link>
          </div>

          {topMatches.length > 0 ? (
            topMatches.slice(0, 5).map((m) => (
              <Link to="/jobs" className="dash-job-card" key={m.jobId || m.jobTitle}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <CompanyBadge company={m.company} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {m.jobTitle}
                    </div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                      <strong style={{ color: "#cbd5e1" }}>{m.company}</strong> • {m.location || "Remote"}
                    </div>
                  </div>
                </div>

                <span className="dash-match-badge">
                  {m.overallMatch}% Match
                </span>
              </Link>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "28px 16px", color: "#64748b", fontSize: 13 }}>
              Upload your resume to calculate personalized job compatibility.
            </div>
          )}
        </div>

        {/* Right: Placement Hub Actions */}
        <div className="dash-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
              Placement Hub
            </span>
            <span style={{ fontSize: 11, color: data.hasResume ? "#00d4aa" : "#f59e0b", fontWeight: 700, background: data.hasResume ? "rgba(0, 212, 170, 0.12)" : "rgba(245, 158, 11, 0.12)", padding: "2px 8px", borderRadius: 100, border: `1px solid ${data.hasResume ? "rgba(0, 212, 170, 0.25)" : "rgba(245, 158, 11, 0.25)"}` }}>
              {data.hasResume ? "Active" : "Upload Needed"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link
              to="/resume"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "inherit",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>ATS Resume Optimization</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{data.hasResume ? `Score: ${ats}/100 verified` : "Upload resume file or text"}</div>
                </div>
              </div>
              <span style={{ color: "#00d4aa", fontSize: 13, fontWeight: 700 }}>→</span>
            </Link>

            <Link
              to="/skill-gap"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "inherit",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>📊</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Market Skill Analytics</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Compare skills against market demand</div>
                </div>
              </div>
              <span style={{ color: "#38bdf8", fontSize: 13, fontWeight: 700 }}>→</span>
            </Link>

            <Link
              to="/assistant"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", color: "inherit",
                transition: "all 0.15s ease"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>AI Placement Copilot</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Instant ATS & interview strategies</div>
                </div>
              </div>
              <span style={{ color: "#c084fc", fontSize: 13, fontWeight: 700 }}>→</span>
            </Link>
          </div>

          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>
              {totalJobs} Live verified positions
            </span>
            <Link to="/jobs" style={{ fontSize: 12, color: "#00d4aa", textDecoration: "none", fontWeight: 700 }}>
              Browse Jobs →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Recruiter Dashboard ─── */
function RecruiterDashboard({ data, user }) {
  const firstName = user?.name?.split(" ")[0] || "Employer";
  const jobsList = data.jobs || [];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: "#f0f3f6" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>
            Welcome back, {firstName} 👋
          </h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: "4px 0 0" }}>
            Recruiter pipeline and candidate ranking command center
          </p>
        </div>
        <Link
          to="/jobs"
          style={{
            padding: "8px 16px", borderRadius: 8, background: "#00d4aa",
            color: "#090d14", fontSize: 12.5, fontWeight: 700, textDecoration: "none"
          }}
        >
          + Post New Job
        </Link>
      </div>

      {/* 3 Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
        <div style={{ background: "rgba(13, 18, 28, 0.85)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Active Postings</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 2 }}>{data.jobsPosted || 0}</div>
        </div>

        <div style={{ background: "rgba(13, 18, 28, 0.85)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Total Applicants</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 2 }}>{data.totalApplications || 0}</div>
        </div>

        <div style={{ background: "rgba(13, 18, 28, 0.85)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>Shortlisted / Offers</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginTop: 2 }}>{data.hired || 0}</div>
        </div>
      </div>

      {/* Postings Table */}
      <div style={{ background: "rgba(13, 18, 28, 0.85)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
            Active Listings
          </span>
          <Link to="/jobs" style={{ fontSize: 12.5, color: "#00d4aa", textDecoration: "none", fontWeight: 600 }}>
            Manage Postings →
          </Link>
        </div>

        {jobsList.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13, margin: 0, padding: "20px 0", textAlign: "center" }}>
            No active postings found.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left", color: "#64748b" }}>
                  <th style={{ padding: "8px 10px" }}>Job Title</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Applicants</th>
                  <th style={{ padding: "8px 10px", textAlign: "center" }}>Shortlisted</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobsList.map((job) => (
                  <tr key={job.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td style={{ padding: "10px" }}>
                      <div style={{ fontWeight: 600, color: "#fff" }}>{job.title}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{job.company}</div>
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#fff" }}>
                      {job.applications}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center", fontWeight: 700, color: "#00d4aa" }}>
                      {job.shortlisted}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <Link
                        to={`/jobs/${job.id}/candidates`}
                        style={{
                          padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
                          color: "#e2e8f0", fontSize: 12, textDecoration: "none", background: "rgba(255,255,255,0.04)"
                        }}
                      >
                        Candidates →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Export ─── */
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  const isRecruiter = user?.role === "recruiter";

  return (
    <div>
      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#fca5a5", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13
        }}>
          ⚠️ {error}
        </div>
      )}
      {!data ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "#64748b", fontSize: 13 }}>
          Loading dashboard metrics…
        </div>
      ) : isRecruiter ? (
        <RecruiterDashboard data={data} user={user} />
      ) : (
        <StudentDashboard data={data} user={user} />
      )}
    </div>
  );
}
