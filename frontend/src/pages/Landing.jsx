import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api";

export default function Landing() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.publicStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#090d14", color: "#ffffff", minHeight: "100vh" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* NAVBAR */
        .nav-root {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px; height: 60px;
          background: rgba(9, 13, 20, 0.88);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .nav-logo-icon {
          width: 32px; height: 32px; border-radius: 9px;
          background: linear-gradient(135deg, #00d4aa, #0284c7);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 900; color: #090d14;
          box-shadow: 0 2px 10px rgba(0, 212, 170, 0.3);
        }
        .nav-logo-text { display: flex; flex-direction: column; }
        .nav-logo-name { font-size: 16px; font-weight: 800; color: #fff; line-height: 1.1; }
        .nav-logo-name span { color: #00d4aa; }
        .nav-logo-tagline { font-size: 10px; color: #64748b; font-weight: 400; }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .nav-signin {
          padding: 7px 18px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px;
          background: rgba(255, 255, 255, 0.03); color: #e5e7eb; font-size: 13px; font-weight: 600;
          cursor: pointer; text-decoration: none; transition: all 0.18s;
        }
        .nav-signin:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
        .nav-getstarted {
          padding: 8px 20px; border-radius: 8px; background: #00d4aa;
          color: #090d14; font-size: 13px; font-weight: 700; border: none;
          cursor: pointer; text-decoration: none; display: flex; align-items: center; gap: 6px;
          transition: all 0.2s; box-shadow: 0 4px 14px rgba(0, 212, 170, 0.3);
        }
        .nav-getstarted:hover { background: #00bfa0; transform: translateY(-1px); }

        /* HERO */
        .hero-section {
          min-height: 100vh; padding-top: 60px;
          background: linear-gradient(160deg, #090d14 0%, #0d121c 50%, #090d14 100%);
          position: relative; overflow: hidden;
          display: flex; align-items: center;
        }
        .hero-bg-glow {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 50% at 60% 50%, rgba(0, 212, 170, 0.07) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 80% 20%, rgba(14, 165, 233, 0.05) 0%, transparent 60%);
        }
        .hero-grid-dots {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.08;
          background-image: radial-gradient(circle, #00d4aa 1px, transparent 1px);
          background-size: 36px 36px;
        }
        .hero-inner {
          position: relative; z-index: 2; width: 100%; max-width: 1240px;
          margin: 0 auto; padding: 50px 32px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center;
        }
        @media (max-width: 960px) {
          .hero-inner { grid-template-columns: 1fr; padding-top: 40px; }
        }
        .hero-left { max-width: 520px; }
        .hero-pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(0, 212, 170, 0.1); border: 1px solid rgba(0, 212, 170, 0.25);
          border-radius: 100px; padding: 5px 14px; margin-bottom: 20px;
          font-size: 12.5px; font-weight: 600; color: #00d4aa;
        }
        .hero-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: #00d4aa; }
        .hero-h1 { font-size: 52px; font-weight: 900; line-height: 1.08; color: #fff; margin-bottom: 18px; letter-spacing: -0.025em; }
        .hero-h1 span { color: #00d4aa; }
        .hero-subtitle { font-size: 15.5px; line-height: 1.65; color: #94a3b8; margin-bottom: 28px; max-width: 460px; }
        .hero-cta-row { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
        .hero-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; border-radius: 9px; background: #00d4aa;
          color: #090d14; font-size: 14px; font-weight: 700; border: none;
          cursor: pointer; text-decoration: none; transition: all 0.2s;
          box-shadow: 0 4px 16px rgba(0, 212, 170, 0.3);
        }
        .hero-btn-primary:hover { transform: translateY(-1px); background: #00bfa0; }
        .hero-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 22px; border-radius: 9px;
          border: 1px solid rgba(255, 255, 255, 0.14); background: rgba(255, 255, 255, 0.03);
          color: #e2e8f0; font-size: 14px; font-weight: 600; cursor: pointer;
          text-decoration: none; transition: all 0.2s;
        }
        .hero-btn-secondary:hover { background: rgba(255, 255, 255, 0.06); }

        .hero-trust-row { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; font-size: 12px; color: #64748b; }
        .hero-trust-item { display: flex; align-items: center; gap: 5px; }
        .hero-trust-check { color: #00d4aa; font-weight: 700; }

        /* HERO RIGHT */
        .hero-right {
          position: relative; display: flex; justify-content: center; align-items: center;
        }
        .hero-student-img {
          height: 480px; object-fit: cover; object-position: top; border-radius: 20px;
          position: relative; z-index: 2; filter: drop-shadow(0 20px 40px rgba(0,0,0,0.6));
          border: 1px solid rgba(255,255,255,0.08);
        }
        /* Floating cards */
        .float-card {
          position: absolute; border-radius: 12px;
          background: rgba(13, 18, 28, 0.94); backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.09); z-index: 10;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
        }
        .ats-card { left: -16px; top: 40px; padding: 14px 18px; min-width: 160px; }
        .ats-card-label { font-size: 11px; color: #94a3b8; font-weight: 600; margin-bottom: 8px; }
        .ats-gauge {
          display: flex; align-items: center; justify-content: center;
          position: relative; margin: 0 auto 6px; width: 72px; height: 72px;
        }
        .ats-gauge svg { width: 72px; height: 72px; transform: rotate(-90deg); }
        .ats-gauge-track { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 5; }
        .ats-gauge-fill { fill: none; stroke: #00d4aa; stroke-width: 5; stroke-linecap: round; stroke-dasharray: 188; stroke-dashoffset: 25; }
        .ats-gauge-num { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #fff; line-height: 1; }
        .ats-gauge-num span { font-size: 8.5px; color: #00d4aa; font-weight: 600; margin-top: 1px; }
        .ats-card-sublabel { text-align: center; font-size: 10.5px; color: #00d4aa; font-weight: 700; }

        .jobs-card { right: -24px; top: 20px; padding: 14px 16px; min-width: 230px; }
        .jobs-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .jobs-card-title { font-size: 11.5px; font-weight: 700; color: #fff; }
        .jobs-card-viewall { font-size: 11px; color: #00d4aa; font-weight: 600; }
        .job-row { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; }
        .job-row:last-child { margin-bottom: 0; }
        .job-logo {
          width: 26px; height: 26px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 800; flex-shrink: 0;
        }
        .job-info { flex: 1; min-width: 0; }
        .job-info-title { font-size: 11px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .job-info-sub { font-size: 9.5px; color: #64748b; }
        .job-match { font-size: 10.5px; font-weight: 700; color: #00d4aa; }

        .notif-card { left: 10px; bottom: 40px; padding: 12px 16px; min-width: 200px; }
        .notif-row { display: flex; align-items: center; gap: 10px; }
        .notif-bell { font-size: 16px; }
        .notif-text { font-size: 11px; color: #94a3b8; line-height: 1.4; }
        .notif-text strong { color: #fff; font-size: 11.5px; display: block; }

        /* TRUSTED SOURCES BAR */
        .trust-bar {
          background: #0d121c; border-top: 1px solid rgba(255,255,255,0.06);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding: 16px 40px; display: flex; align-items: center; gap: 32px;
          overflow-x: auto;
        }
        .trust-bar-label { font-size: 11.5px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; white-space: nowrap; flex-shrink: 0; }
        .trust-logos { display: flex; align-items: center; gap: 24px; flex: 1; }
        .trust-logo { font-size: 13px; font-weight: 700; color: #94a3b8; white-space: nowrap; }
        .trust-divider { width: 1px; height: 16px; background: rgba(255,255,255,0.08); flex-shrink: 0; }

        /* FEATURES SECTION (DARK MODERN GLASS) */
        .features-section {
          background: #090d14; padding: 70px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .features-inner { max-width: 1240px; margin: 0 auto; }
        .features-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
        .features-title { font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 6px; }
        .features-subtitle { font-size: 13.5px; color: #94a3b8; }
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;
        }
        @media (max-width: 900px) {
          .features-grid { grid-template-columns: 1fr; }
        }
        .feature-card {
          padding: 22px 20px; border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07); background: #0d121c;
          transition: all 0.2s ease;
        }
        .feature-card:hover {
          border-color: rgba(0, 212, 170, 0.3);
          background: #111827;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }
        .feature-icon-wrap {
          width: 42px; height: 42px; border-radius: 10px; margin-bottom: 14px;
          display: flex; align-items: center; justify-content: center; font-size: 20px;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
        }
        .feature-name { font-size: 14.5px; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .feature-desc { font-size: 12.5px; color: #94a3b8; line-height: 1.55; }

        /* STATS SECTION */
        .stats-section {
          background: #0d121c; padding: 40px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .stats-inner {
          max-width: 1240px; margin: 0 auto;
          display: flex; align-items: center; gap: 0;
        }
        @media (max-width: 860px) {
          .stats-inner { flex-direction: column; gap: 20px; }
        }
        .stat-item { flex: 1; display: flex; align-items: center; gap: 14px; padding: 0 20px; }
        .stat-item:not(:last-child) { border-right: 1px solid rgba(255,255,255,0.07); }
        .stat-num { font-size: 28px; font-weight: 900; color: #fff; line-height: 1; margin-bottom: 2px; }
        .stat-label { font-size: 12px; color: #64748b; font-weight: 500; }

        /* FOOTER */
        .landing-footer {
          background: #090d14; padding: 24px 40px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 20px; font-size: 12.5px; color: #64748b;
        }
        .footer-logo-name { font-size: 15px; font-weight: 800; color: #fff; }
        .footer-logo-name span { color: #00d4aa; }
      `}</style>

      {/* ─────────── NAVBAR ─────────── */}
      <nav className="nav-root">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">⚡</div>
          <div className="nav-logo-text">
            <span className="nav-logo-name">Career<span>AI</span></span>
            <span className="nav-logo-tagline">Smarter Careers. Brighter Futures.</span>
          </div>
        </Link>

        <div className="nav-right">
          <Link to="/login" className="nav-signin">Sign In</Link>
          <Link to="/register" className="nav-getstarted">Get Started →</Link>
        </div>
      </nav>

      {/* ─────────── HERO ─────────── */}
      <section className="hero-section">
        <div className="hero-bg-glow" />
        <div className="hero-grid-dots" />

        <div className="hero-inner">
          {/* LEFT CONTENT */}
          <div className="hero-left">
            <div className="hero-pill">
              <span className="hero-pill-dot" />
              ⚡ Placement Intelligence Engine
            </div>

            <h1 className="hero-h1">
              From Resume<br />
              to <span>Real Opportunities</span>
            </h1>

            <p className="hero-subtitle">
              Upload your resume for real-time ATS scoring, verified skill alignment,
              and automated matchmaking across verified opportunities.
            </p>

            <div className="hero-cta-row">
              <Link to="/register" className="hero-btn-primary">
                Check Your Resume Free →
              </Link>
              <Link to="/login" className="hero-btn-secondary">
                Sign In to Platform →
              </Link>
            </div>

            <div className="hero-trust-row">
              <span className="hero-trust-item"><span className="hero-trust-check">✓</span> 100% Free Candidate Access</span>
              <span className="hero-trust-item"><span className="hero-trust-check">✓</span> Real-Time ATS Scoring</span>
              <span className="hero-trust-item"><span className="hero-trust-check">✓</span> Live Verified Job Index</span>
            </div>
          </div>

          {/* RIGHT: IMAGE + FLOATING CARDS */}
          <div className="hero-right">
            {/* ATS Score Card */}
            <div className="float-card ats-card">
              <div className="ats-card-label">ATS Match Score</div>
              <div className="ats-gauge">
                <svg viewBox="0 0 72 72">
                  <circle className="ats-gauge-track" cx="36" cy="36" r="28" />
                  <circle className="ats-gauge-fill" cx="36" cy="36" r="28" />
                </svg>
                <div className="ats-gauge-num">88<span>ATS</span></div>
              </div>
              <div className="ats-card-sublabel">Optimal Profile</div>
            </div>

            {/* Top Job Matches card */}
            <div className="float-card jobs-card">
              <div className="jobs-card-header">
                <span className="jobs-card-title">Top Opportunities</span>
                <Link to="/login" className="jobs-card-viewall" style={{ textDecoration: "none" }}>View All →</Link>
              </div>
              {(stats?.sampleJobs && stats.sampleJobs.length > 0
                ? stats.sampleJobs.slice(0, 3).map((j, idx) => ({
                    logo: (j.company || "T")[0].toUpperCase(),
                    bg: ["rgba(0,212,170,0.15)", "rgba(56,189,248,0.15)", "rgba(168,85,247,0.15)"][idx % 3],
                    color: ["#00d4aa", "#38bdf8", "#a855f7"][idx % 3],
                    title: j.title,
                    sub: `${j.company} • ${j.location}`,
                    match: `${94 - idx * 3}% Match`,
                  }))
                : [
                    { logo: "G", bg: "rgba(66,133,244,0.15)", color: "#4285f4", title: "Software Engineer", sub: "Google • Remote", match: "92% Match" },
                    { logo: "M", bg: "rgba(16,124,16,0.15)", color: "#107c10", title: "Full Stack Developer", sub: "Microsoft • Hybrid", match: "89% Match" },
                    { logo: "A", bg: "rgba(255,153,0,0.15)", color: "#ff9900", title: "Backend Developer", sub: "Amazon • On-site", match: "86% Match" },
                  ]
              ).map((j) => (
                <div className="job-row" key={j.title}>
                  <div className="job-logo" style={{ background: j.bg, color: j.color, fontWeight: 800 }}>{j.logo}</div>
                  <div className="job-info">
                    <div className="job-info-title">{j.title}</div>
                    <div className="job-info-sub">{j.sub}</div>
                  </div>
                  <span className="job-match">{j.match}</span>
                </div>
              ))}
            </div>

            {/* Live Database card */}
            <div className="float-card notif-card">
              <div className="notif-row">
                <span className="notif-bell">⚡</span>
                <div className="notif-text">
                  <strong>Live Index Synced</strong>
                  {stats?.totalJobs || 305}+ active market postings.
                </div>
              </div>
            </div>

            {/* Student Image */}
            <img
              src="/hero_student.jpg"
              alt="CareerAI Platform Candidate"
              className="hero-student-img"
            />
          </div>
        </div>
      </section>

      {/* ─────────── TRUSTED SOURCES BAR ─────────── */}
      <div className="trust-bar">
        <span className="trust-bar-label">Live Ingestion Feeds:</span>
        <div className="trust-logos">
          <span className="trust-logo">Arbeitnow</span>
          <div className="trust-divider" />
          <span className="trust-logo">Remotive</span>
          <div className="trust-divider" />
          <span className="trust-logo">Verified Direct Feed</span>
          <div className="trust-divider" />
          <span className="trust-logo">Adzuna Sync</span>
        </div>
      </div>

      {/* ─────────── FEATURES SECTION ─────────── */}
      <section className="features-section">
        <div className="features-inner">
          <div className="features-header">
            <div>
              <h2 className="features-title">Intelligent Placement Infrastructure</h2>
              <p className="features-subtitle">
                Everything required to evaluate, improve, and match candidate capabilities with modern industry roles.
              </p>
            </div>
          </div>

          <div className="features-grid">
            {[
              {
                icon: "📄", name: "Real ATS Resume Parsing",
                desc: "Evaluates exact skill coverage, experience structure, and rule-based diagnostic breakdowns."
              },
              {
                icon: "🎯", name: "High-Precision Matchmaking",
                desc: "Calculates mathematical cosine and weighted skill overlap against live corporate requirements."
              },
              {
                icon: "📈", name: "Skill Gap Diagnostics",
                desc: "Detects missing competencies separating candidates from high-probability interview selection."
              },
              {
                icon: "📋", name: "Application Funnel Tracking",
                desc: "Integrated Kanban pipeline moving submissions smoothly from Applied to Offer."
              },
              {
                icon: "💬", name: "AI Placement Copilot",
                desc: "Conversational guidance analyzing market demand, resume strengths, and daily application targets."
              },
              {
                icon: "🛡️", name: "Employer & Recruiter Pipeline",
                desc: "Automated candidate ranking engine with skill matching and posting controls."
              },
            ].map((f) => (
              <div className="feature-card" key={f.name}>
                <div className="feature-icon-wrap">{f.icon}</div>
                <div className="feature-name">{f.name}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── STATS SECTION ─────────── */}
      <section className="stats-section">
        <div className="stats-inner">
          <div className="stat-item">
            <div>
              <div className="stat-num">{stats?.totalJobs ? `${stats.totalJobs}+` : "305+"}</div>
              <div className="stat-label">Live Verified Tech Positions</div>
            </div>
          </div>
          <div className="stat-item">
            <div>
              <div className="stat-num">88%</div>
              <div className="stat-label">ATS Match Diagnostic Precision</div>
            </div>
          </div>
          <div className="stat-item">
            <div>
              <div className="stat-num">{stats?.totalApplications ? `${stats.totalApplications}+` : "30+"}</div>
              <div className="stat-label">Applications Active in Pipeline</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="landing-footer">
        <div>
          <span className="footer-logo-name">Career<span>AI</span></span>
          <span style={{ marginLeft: 12 }}>© 2026 CareerAI. All rights reserved.</span>
        </div>
        <div>
          <span>Enterprise Placement Intelligence</span>
        </div>
      </footer>
    </div>
  );
}
