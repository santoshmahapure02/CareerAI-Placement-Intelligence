import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function SkillGap() {
  const [resumeMeta, setResumeMeta] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [customSkills, setCustomSkills] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeMode, setActiveMode] = useState("auto"); // "auto" | "market" | "job" | "custom"
  const [topJob, setTopJob] = useState(null);

  // Auto-load overview on mount
  const loadOverview = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const overview = await api.skillGapOverview();
      setResumeMeta(overview.resume || null);
      setTopJob(overview.topJob || null);
      setResult(overview);
      if (overview.topJob) {
        setSelectedJobId(String(overview.topJob.id));
      }
    } catch (err) {
      if (err.message?.includes("Upload a resume first")) {
        setResumeMeta(null);
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    api.jobs().then(setJobs).catch(() => {});
    loadOverview();
  }, [loadOverview]);

  const switchMode = async (mode) => {
    setActiveMode(mode);
    setError("");
    setBusy(true);
    try {
      let payload = {};
      if (mode === "auto") {
        const overview = await api.skillGapOverview();
        setResult(overview);
        setBusy(false);
        return;
      }
      if (mode === "market") {
        payload = { mode: "market" };
      } else if (mode === "job") {
        if (!selectedJobId && jobs.length > 0) {
          setSelectedJobId(String(jobs[0].id));
          payload = { jobId: jobs[0].id };
        } else if (selectedJobId) {
          payload = { jobId: Number(selectedJobId) };
        }
      } else if (mode === "custom") {
        if (customSkills.trim()) {
          payload = { targetSkills: customSkills.split(",").map((s) => s.trim()).filter(Boolean) };
        } else {
          setBusy(false);
          return;
        }
      }
      const data = await api.skillGap(payload);
      setResult((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleJobSelect = async (jobId) => {
    setSelectedJobId(jobId);
    if (!jobId) return;
    setBusy(true);
    setError("");
    try {
      const data = await api.skillGap({ jobId: Number(jobId) });
      setResult((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCustomAnalyze = async () => {
    if (!customSkills.trim()) return;
    setBusy(true);
    setError("");
    try {
      const targetSkills = customSkills.split(",").map((s) => s.trim()).filter(Boolean);
      const data = await api.skillGap({ targetSkills });
      setResult((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const coverageScore = result?.coverage ?? 0;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: "#f0f3f6", maxWidth: 1240, margin: "0 auto" }}>
      <style>{`
        .sg-header-bar {
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
        }
        .sg-panel {
          background: rgba(13, 18, 28, 0.85);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 18px 20px;
          margin-bottom: 16px;
        }
        .sg-tab-btn {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #94a3b8;
        }
        .sg-tab-btn.active {
          background: rgba(0,212,170,0.12);
          color: #00d4aa;
          border-color: rgba(0,212,170,0.3);
        }
        .sg-pill-green {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          background: rgba(0,212,170,0.1);
          color: #00d4aa;
          border: 1px solid rgba(0,212,170,0.22);
        }
        .sg-priority-high {
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(239,68,68,0.15);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.3);
        }
        .sg-priority-med {
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(245,158,11,0.15);
          color: #f59e0b;
          border: 1px solid rgba(245,158,11,0.3);
        }
        .sg-priority-low {
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(59,130,246,0.15);
          color: #60a5fa;
          border: 1px solid rgba(59,130,246,0.3);
        }
        .sg-timeline-node {
          position: relative;
          padding-left: 24px;
          padding-bottom: 16px;
          border-left: 2px solid rgba(0,212,170,0.3);
        }
        .sg-timeline-node:last-child { border-left-color: transparent; }
        .sg-timeline-dot {
          position: absolute;
          left: -6px;
          top: 0;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #00d4aa;
        }
      `}</style>

      {/* 1. Header Bar */}
      <div className="sg-header-bar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4aa" }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#00d4aa", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              SKILL GAP ANALYTICS
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: "0 0 4px 0" }}>
            Technical Coverage & Gap Analysis
          </h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {resumeMeta
              ? `${resumeMeta.name} • ${resumeMeta.skills?.length || 0} skills on file • ${coverageScore}% target coverage`
              : "Compare your skills against employer market demand."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={loadOverview}
            disabled={busy}
            type="button"
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#e2e8f0", padding: "8px 14px", borderRadius: 8, fontSize: 12.5,
              fontWeight: 600, cursor: busy ? "wait" : "pointer"
            }}
          >
            {busy ? "⟳ Recalculating…" : "⟳ Recalculate Gaps"}
          </button>
          <Link
            to="/resume"
            style={{
              padding: "8px 14px", borderRadius: 8, background: "rgba(0,212,170,0.12)",
              border: "1px solid rgba(0,212,170,0.3)", color: "#00d4aa", fontSize: 12.5,
              fontWeight: 700, textDecoration: "none"
            }}
          >
            Resume ATS →
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          ⚠️ {error}
        </div>
      )}

      {/* No Resume State */}
      {!resumeMeta ? (
        <div className="sg-panel" style={{ textAlign: "center", padding: "36px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 6px 0" }}>No Resume Uploaded</h3>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "0 0 16px 0" }}>
            Upload your technical resume to calculate real-time skill gaps.
          </p>
          <Link
            to="/resume"
            style={{
              display: "inline-block", padding: "9px 20px", borderRadius: 8,
              background: "#00d4aa", color: "#090d14", fontSize: 13, fontWeight: 700, textDecoration: "none"
            }}
          >
            Upload Resume →
          </Link>
        </div>
      ) : (
        <>
          {/* Target Mode Selector */}
          <div className="sg-panel">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginRight: 4 }}>TARGET:</span>
              <button
                className={`sg-tab-btn ${activeMode === "auto" ? "active" : ""}`}
                onClick={() => switchMode("auto")}
                type="button"
              >
                Top Matched Role (Auto)
              </button>
              <button
                className={`sg-tab-btn ${activeMode === "market" ? "active" : ""}`}
                onClick={() => switchMode("market")}
                type="button"
              >
                Market Demand
              </button>
              <button
                className={`sg-tab-btn ${activeMode === "job" ? "active" : ""}`}
                onClick={() => switchMode("job")}
                type="button"
              >
                Pick Specific Job
              </button>
              <button
                className={`sg-tab-btn ${activeMode === "custom" ? "active" : ""}`}
                onClick={() => switchMode("custom")}
                type="button"
              >
                Custom Skills
              </button>
            </div>

            {/* Mode-specific input */}
            {activeMode === "job" && (
              <div style={{ marginTop: 12 }}>
                <select
                  value={selectedJobId}
                  onChange={(e) => handleJobSelect(e.target.value)}
                  style={{
                    width: "100%", background: "#080c14", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none"
                  }}
                >
                  <option value="">— Select a posting ({jobs.length} roles) —</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} @ {j.company} ({j.location || "Remote"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeMode === "custom" && (
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <input
                  placeholder="e.g. Docker, Redis, Kubernetes, Spring Boot"
                  value={customSkills}
                  onChange={(e) => setCustomSkills(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCustomAnalyze()}
                  style={{
                    flex: 1, minWidth: 240, background: "#080c14", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none"
                  }}
                />
                <button
                  onClick={handleCustomAnalyze}
                  disabled={busy || !customSkills.trim()}
                  type="button"
                  style={{
                    padding: "8px 16px", borderRadius: 8, background: "#00d4aa", color: "#090d14",
                    fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer"
                  }}
                >
                  Analyze →
                </button>
              </div>
            )}
          </div>

          {/* Results: 2-Column Split */}
          {result && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Coverage Meter */}
                <div className="sg-panel" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Coverage Score</span>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                      {result.have?.length || 0} / {(result.have?.length || 0) + (result.missing?.length || 0)} skills
                    </span>
                  </div>

                  <div style={{ fontSize: 36, fontWeight: 800, color: coverageScore >= 70 ? "#00d4aa" : coverageScore >= 40 ? "#f59e0b" : "#ef4444" }}>
                    {coverageScore}%
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.06)", height: 6, borderRadius: 3, overflow: "hidden", margin: "10px 0" }}>
                    <div style={{
                      width: `${coverageScore}%`, height: "100%",
                      background: coverageScore >= 70 ? "#00d4aa" : coverageScore >= 40 ? "#f59e0b" : "#ef4444",
                      transition: "width 0.6s ease"
                    }} />
                  </div>

                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {coverageScore >= 70 ? "Strong alignment with target requirements." : "Skill additions recommended to increase fit."}
                  </div>
                </div>

                {/* Verified Possessed Skills */}
                <div className="sg-panel" style={{ margin: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Verified Skills Matched</span>
                    <span style={{ fontSize: 12, color: "#00d4aa", fontWeight: 700 }}>{result.have?.length || 0}</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.have?.map((s) => (
                      <span key={s} className="sg-pill-green">✓ {s}</span>
                    ))}
                    {(!result.have || result.have.length === 0) && (
                      <span style={{ fontSize: 12.5, color: "#64748b" }}>No overlapping skills found for this target.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Missing Skills Ranked */}
              <div className="sg-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>
                    Missing Target Skills ({result.missing?.length || 0})
                  </span>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>Ranked by Employer Demand</span>
                </div>

                {result.missing?.length === 0 ? (
                  <div style={{ color: "#00d4aa", fontSize: 13, padding: "10px 0", fontWeight: 600 }}>
                    ✓ Complete coverage! Zero missing skills for this target.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.missing?.map((m, idx) => {
                      const skillName = typeof m === "string" ? m : (m?.skill || `Skill #${idx + 1}`);
                      const priority = typeof m === "string" ? "High" : (m?.priority || "Medium");
                      return (
                        <div
                          key={skillName + "-" + idx}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 12px", background: "rgba(255,255,255,0.02)",
                            borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)"
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 13.5, color: "#fff" }}>{skillName}</span>
                          <span className={priority === "High" ? "sg-priority-high" : priority === "Medium" ? "sg-priority-med" : "sg-priority-low"}>
                            {priority} Priority
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Suggested Learning Path */}
              {result.learningPath?.length > 0 && (
                <div className="sg-panel">
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
                    Suggested 4-Week Learning Roadmap
                  </div>

                  <div>
                    {result.learningPath.map((step) => (
                      <div key={step.skill} className="sg-timeline-node">
                        <div className="sg-timeline-dot" />
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "#00d4aa", fontSize: 12, fontWeight: 700 }}>
                            Week {step.weekRange || step.week}
                          </span>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>
                            {step.skill}
                          </span>
                        </div>
                        {step.reason && (
                          <div style={{ color: "#9ca3af", fontSize: 12, marginTop: 4 }}>
                            {step.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
