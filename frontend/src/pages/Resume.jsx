import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";


/* ─── Circular ATS Radial Gauge ─── */
function ScoreGauge({ score = 0, hasResume = false }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const strokeVal = hasResume ? c - (score / 100) * c : c;

  const color = !hasResume
    ? "#64748b"
    : score >= 75
    ? "#00d4aa"
    : score >= 55
    ? "#38bdf8"
    : "#f59e0b";

  const label = !hasResume
    ? "No Document"
    : score >= 75
    ? "Optimal ATS Fit"
    : score >= 55
    ? "Competitive"
    : "Needs Attention";

  return (
    <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto 10px" }}>
      <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255, 255, 255, 0.07)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={strokeVal}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", lineHeight: 1 }}>
          {hasResume ? score : "—"}
        </div>
        <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 3, fontWeight: 600 }}>
          OUT OF 100
        </div>
        <div style={{
          marginTop: 6, padding: "2px 10px", borderRadius: 100,
          background: `${color}18`, color: color,
          fontSize: 10.5, fontWeight: 700, border: `1px solid ${color}35`,
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}

export default function Resume() {
  const { user } = useAuth();
  const [resume, setResume] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [showIngestionTray, setShowIngestionTray] = useState(false);
  const [ingestMode, setIngestMode] = useState("file"); // "file" | "text"
  const [textInput, setTextInput] = useState("");
  const [copiedSkills, setCopiedSkills] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.myResumes()
      .then((resumes) => {
        if (resumes && resumes.length > 0) {
          setResume(resumes[0]);
        } else {
          // If candidate doesn't have a resume yet, open the ingestion tray automatically
          setShowIngestionTray(true);
        }
      })
      .catch(() => {
        setShowIngestionTray(true);
      });
  }, []);

  const handleFileUpload = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const res = await api.uploadResume(file);
      setResume(res);
      setShowIngestionTray(false);
    } catch (err) {
      setError(err.message || "Failed to process resume file");
    } finally {
      setUploading(false);
    }
  };

  const handleTextAnalyze = async () => {
    if (!textInput.trim() || textInput.trim().length < 30) {
      setError("Please paste a resume snippet with at least 30 characters.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const res = await api.analyzeResumeText({
        text: textInput.trim(),
        title: `${user?.name || "Candidate"}_Resume.txt`,
      });
      setResume(res);
      setShowIngestionTray(false);
    } catch (err) {
      setError(err.message || "Failed to analyze resume text");
    } finally {
      setUploading(false);
    }
  };

  const copySkillsToClipboard = () => {
    if (!resume?.skills?.length) return;
    const text = resume.skills.join(", ");
    navigator.clipboard?.writeText(text);
    setCopiedSkills(true);
    setTimeout(() => setCopiedSkills(false), 2000);
  };


  const hasResume = !!resume;
  const atsScore = resume?.score ?? 0;
  const skills = resume?.skills ?? [];
  const filename = resume?.filename || "Active Resume";
  const parsedDate = resume?.createdAt ? new Date(resume.createdAt).toLocaleDateString() : "Live Profile";

  const breakdown = resume?.scoreBreakdown ? [
    { label: "Technical Skills Coverage", score: Math.round(((resume.scoreBreakdown.skills || 0) / 20) * 100), color: "#00d4aa" },
    { label: "Experience & Relevance", score: Math.round(((resume.scoreBreakdown.experience || 0) / 20) * 100), color: "#38bdf8" },
    { label: "Project & Architecture Scope", score: Math.round(((resume.scoreBreakdown.projects || 0) / 20) * 100), color: "#a855f7" },
    { label: "Education & Degree Credentials", score: Math.round(((resume.scoreBreakdown.education || 0) / 10) * 100), color: "#f59e0b" },
    { label: "Quantifiable Impact & Metrics", score: Math.round(((resume.scoreBreakdown.achievements || 0) / 10) * 100), color: "#10b981" },
  ] : [
    { label: "Technical Skills Coverage", score: 0, color: "#64748b" },
    { label: "Experience & Relevance", score: 0, color: "#64748b" },
    { label: "Project & Architecture Scope", score: 0, color: "#64748b" },
    { label: "Education & Degree Credentials", score: 0, color: "#64748b" },
    { label: "Quantifiable Impact & Metrics", score: 0, color: "#64748b" },
  ];

  const warnings = resume?.warnings || [];
  const strengths = resume?.strengths || [];
  const metrics = resume?.metrics || [];
  const links = resume?.links || {};

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: "#f0f3f6", maxWidth: 1240, margin: "0 auto" }}>
      <style>{`
        .ats-card {
          background: rgba(13, 18, 28, 0.85);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
          position: relative;
        }

        .ats-header-bar {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(56, 189, 248, 0.06) 50%, rgba(13, 18, 28, 0.95) 100%);
          border: 1px solid rgba(0, 212, 170, 0.2);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
        }

        .ats-grid-top {
          display: grid;
          grid-template-columns: 280px 1fr 280px;
          gap: 18px;
          margin-bottom: 20px;
        }
        @media (max-width: 1080px) {
          .ats-grid-top { grid-template-columns: 1fr; }
        }

        .ats-grid-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 20px;
        }
        @media (max-width: 900px) {
          .ats-grid-bottom { grid-template-columns: 1fr; }
        }

        .ats-dropzone {
          border: 2px dashed rgba(255, 255, 255, 0.14);
          border-radius: 14px;
          padding: 28px 20px;
          text-align: center;
          background: rgba(255, 255, 255, 0.015);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .ats-dropzone.active {
          border-color: #00d4aa;
          background: rgba(0, 212, 170, 0.06);
        }

        .ats-pill-btn {
          padding: 7px 14px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }

        .ats-skill-chip {
          padding: 5px 11px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          background: rgba(0, 212, 170, 0.06);
          border: 1px solid rgba(0, 212, 170, 0.22);
          color: #a7f3d0;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .ats-skill-chip:hover {
          background: rgba(0, 212, 170, 0.14);
          transform: translateY(-1px);
        }
      `}</style>

      {/* ─── 1. Command Header Bar ─── */}
      <div className="ats-header-bar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#00d4aa", boxShadow: "0 0 10px #00d4aa"
            }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#00d4aa", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              ATS INTELLIGENCE & AUDIT ENGINE
            </span>
          </div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: "#fff", margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
            Resume Scoring & ATS Readability
          </h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {hasResume
              ? `Active File: ${filename} • Parsed ${parsedDate} • ${skills.length} Technical Keywords Found`
              : "No resume profile detected. Upload or paste below to evaluate ATS pass rate."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="ats-pill-btn"
            onClick={() => setShowIngestionTray(!showIngestionTray)}
            style={{
              background: showIngestionTray ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.05)",
              borderColor: showIngestionTray ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.12)",
              color: showIngestionTray ? "#38bdf8" : "#e2e8f0",
            }}
          >
            {showIngestionTray ? "▲ Hide Ingestion Box" : "+ Upload / Rescan Resume"}
          </button>

          {hasResume && (
            <Link
              to="/jobs"
              className="ats-pill-btn"
              style={{
                background: "#00d4aa",
                color: "#090d14",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(0, 212, 170, 0.25)",
              }}
            >
              View Matching Jobs →
            </Link>
          )}
        </div>
      </div>

      {/* ─── Error Alert Banner ─── */}
      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#fca5a5", padding: "12px 16px", borderRadius: 12,
          marginBottom: 18, fontSize: 13, display: "flex", alignItems: "center", gap: 10
        }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ─── 2. Ingestion Tray (Collapsible & Clutter-Free) ─── */}
      {showIngestionTray && (
        <div className="ats-card" style={{ marginBottom: 20, border: "1px solid rgba(0, 212, 170, 0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                Ingest Document for ATS Evaluation
              </span>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0 0" }}>
                Accepts PDF or Word (.docx) files or raw resume text. Max file size: 5MB.
              </p>
            </div>

            <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.03)", padding: 3, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.07)" }}>
              <button
                type="button"
                className={`ats-pill-btn ${ingestMode === "file" ? "active" : ""}`}
                onClick={() => setIngestMode("file")}
                style={{
                  background: ingestMode === "file" ? "rgba(0, 212, 170, 0.15)" : "transparent",
                  color: ingestMode === "file" ? "#00d4aa" : "#9ca3af",
                  border: ingestMode === "file" ? "1px solid rgba(0, 212, 170, 0.3)" : "none",
                }}
              >
                Upload File (.pdf / .docx)
              </button>
              <button
                type="button"
                className={`ats-pill-btn ${ingestMode === "text" ? "active" : ""}`}
                onClick={() => setIngestMode("text")}
                style={{
                  background: ingestMode === "text" ? "rgba(0, 212, 170, 0.15)" : "transparent",
                  color: ingestMode === "text" ? "#00d4aa" : "#9ca3af",
                  border: ingestMode === "text" ? "1px solid rgba(0, 212, 170, 0.3)" : "none",
                }}
              >
                Direct Text Paste
              </button>
            </div>
          </div>

          {ingestMode === "file" ? (
            <div
              className={`ats-dropzone ${dragOver ? "active" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
              }}
            >
              <div style={{ fontSize: 34, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", marginBottom: 3 }}>
                {uploading ? "Parsing Document with ATS Scanner…" : "Drag and drop your resume file here"}
              </div>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 14px 0" }}>
                Auto-extracts contact info, technical skills, bullet metrics, and sections.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: "9px 22px", borderRadius: 8,
                  background: "#00d4aa", color: "#090d14",
                  fontSize: 13, fontWeight: 700, border: "none",
                  cursor: uploading ? "wait" : "pointer",
                  boxShadow: "0 4px 14px rgba(0, 212, 170, 0.25)"
                }}
              >
                {uploading ? "Analyzing…" : "Choose File from Computer"}
              </button>
            </div>
          ) : (
            <div>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste raw resume text (experience, skills, projects, education)…"
                style={{
                  width: "100%", height: 160,
                  background: "#080c14", border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 10, padding: "12px 14px", color: "#fff",
                  fontSize: 13, fontFamily: "inherit", outline: "none",
                  boxSizing: "border-box", resize: "vertical"
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 10 }}>
                <span style={{ fontSize: 12, color: textInput.trim().length >= 30 ? "#00d4aa" : "#64748b" }}>
                  {textInput.trim().length} characters {textInput.trim().length < 30 ? "(minimum 30 required)" : "✓ ready"}
                </span>
                <button
                  type="button"
                  onClick={handleTextAnalyze}
                  disabled={uploading || textInput.trim().length < 30}
                  style={{
                    padding: "8px 20px", borderRadius: 8,
                    background: "#00d4aa", color: "#090d14",
                    fontSize: 13, fontWeight: 700, border: "none",
                    cursor: uploading ? "wait" : "pointer"
                  }}
                >
                  {uploading ? "Parsing…" : "Run ATS Analysis →"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 3. Top Command Grid: Dial + 5 Pillars + Document Telemetry ─── */}
      <div className="ats-grid-top">
        {/* Pillar 1: ATS Radial Gauge */}
        <div className="ats-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Overall ATS Readability
          </div>

          <ScoreGauge score={atsScore} hasResume={hasResume} />

          <p style={{ fontSize: 12, color: "#94a3b8", margin: "8px 0 0 0", lineHeight: 1.45 }}>
            {atsScore >= 75
              ? "High pass probability. Structured cleanly with recognized keyword ontologies."
              : atsScore >= 55
              ? "Good foundation. Add more quantifiable metrics and skill keywords to reach 80+."
              : "Significant ATS blockers detected. Check recommendations below to improve."}
          </p>
        </div>

        {/* Pillar 2: 5-Dimension Meters */}
        <div className="ats-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>
              ATS Dimension Breakdown
            </span>
            <span style={{ fontSize: 11.5, color: "#64748b" }}>
              5 Core Evaluation Pillars
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {breakdown.map((item) => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, color: "#cbd5e1", fontWeight: 500 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: item.color }}>
                    {item.score}%
                  </span>
                </div>
                <div style={{ height: 6, background: "rgba(255, 255, 255, 0.06)", borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${item.score}%`,
                      background: item.color,
                      borderRadius: 3,
                      transition: "width 0.8s ease"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pillar 3: Document Telemetry & Quality Checks */}
        <div className="ats-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              Document Telemetry
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: 12.5, color: "#9ca3af" }}>Technical Keywords</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: skills.length >= 6 ? "#00d4aa" : "#f59e0b" }}>
                  {skills.length} Detected
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: 12.5, color: "#9ca3af" }}>Quantifiable Metrics</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: metrics.length > 0 ? "#00d4aa" : "#f59e0b" }}>
                  {metrics.length} Statements
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: 12.5, color: "#9ca3af" }}>GitHub Link</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: links?.github ? "#00d4aa" : "#64748b" }}>
                  {links?.github ? "✓ Verified" : "Not Found"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: 12.5, color: "#9ca3af" }}>LinkedIn Link</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: links?.linkedin ? "#00d4aa" : "#64748b" }}>
                  {links?.linkedin ? "✓ Verified" : "Not Found"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ─── 5. Skills Cloud & Keyword Alignment ─── */}
      <div className="ats-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
              Extracted Technical Skills & Keyword Index ({skills.length})
            </span>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0 0" }}>
              Keywords recognized by recruitment parsers & search ranking algorithms.
            </p>
          </div>

          {skills.length > 0 && (
            <button
              type="button"
              onClick={copySkillsToClipboard}
              style={{
                padding: "6px 12px", borderRadius: 7,
                background: copiedSkills ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${copiedSkills ? "#10b981" : "rgba(255, 255, 255, 0.1)"}`,
                color: copiedSkills ? "#34d399" : "#cbd5e1",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              {copiedSkills ? "✓ Copied All Skills" : "Copy Skills List"}
            </button>
          )}
        </div>

        {skills.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {skills.map((skill) => (
              <span key={skill} className="ats-skill-chip">
                <span style={{ color: "#00d4aa", fontSize: 11 }}>✓</span>
                <span>{skill}</span>
              </span>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#64748b", fontSize: 13 }}>
            No technical skills detected yet. Upload or scan your resume to populate the keyword index.
          </div>
        )}
      </div>

      {/* ─── 6. ATS Audit Findings (Strengths vs Optimization Fixes) ─── */}
      <div className="ats-grid-bottom">
        {/* Verified Strengths */}
        <div className="ats-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>🛡️</span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>
              Verified ATS Strengths ({strengths.length})
            </span>
          </div>

          {strengths.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {strengths.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(0, 212, 170, 0.04)",
                    border: "1px solid rgba(0, 212, 170, 0.18)",
                    fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.45
                  }}
                >
                  <span style={{ color: "#00d4aa", fontWeight: 700, fontSize: 13 }}>✓</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "18px 0", color: "#64748b", fontSize: 12.5 }}>
              Upload your document to evaluate parser strengths.
            </div>
          )}
        </div>

        {/* ATS Optimization Fixes */}
        <div className="ats-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: "#fff" }}>
              ATS Optimization Recommendations ({warnings.length})
            </span>
          </div>

          {warnings.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {warnings.map((w, idx) => {
                const isClean = w.includes("No major issues");
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      padding: "10px 12px", borderRadius: 10,
                      background: isClean ? "rgba(0, 212, 170, 0.04)" : "rgba(245, 158, 11, 0.05)",
                      border: `1px solid ${isClean ? "rgba(0, 212, 170, 0.18)" : "rgba(245, 158, 11, 0.22)"}`,
                      fontSize: 12.5, color: isClean ? "#cbd5e1" : "#fde68a", lineHeight: 1.45
                    }}
                  >
                    <span>{isClean ? "✓" : "⚡"}</span>
                    <span>{w}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "18px 0", color: "#64748b", fontSize: 12.5 }}>
              No critical issues detected. Document passes standard parser filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
