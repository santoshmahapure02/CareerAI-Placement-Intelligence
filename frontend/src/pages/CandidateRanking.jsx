import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import PageHero from "../components/PageHero";

export default function CandidateRanking() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.jobs().then((jobs) => setJob(jobs.find((j) => String(j.id) === jobId)));
    api.candidatesForJob(jobId).then(setCandidates).catch((e) => setError(e.message));
  }, [jobId]);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#f0f3f6" }}>
      <PageHero
        tag="MULTI-CANDIDATE RANKING ENGINE"
        tagIcon="🏆"
        title="Candidate Ranking for"
        highlight={job?.title || "Position"}
        subtitle={job ? `${job.company} • Ranked by multi-dimensional weighted matching across verified technical skills.` : "Ranked candidate applicants."}
        rightWidget={
          <Link
            to="/jobs"
            style={{
              padding: "10px 18px", borderRadius: 10, background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 13,
              fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6
            }}
          >
            ← Back to Jobs
          </Link>
        }
      />

      {error && (
        <div style={{
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#ef4444", padding: "12px 18px", borderRadius: 10, marginBottom: 18, fontSize: 13
        }}>
          {error}
        </div>
      )}

      {!candidates ? (
        <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
          Loading candidate profiles…
        </div>
      ) : candidates.length === 0 ? (
        <div style={{
          background: "#0d121c", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, textAlign: "center", padding: "40px 20px", color: "#9ca3af"
        }}>
          No student resumes have been matched yet.
        </div>
      ) : (
        <div style={{
          background: "#0d121c", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "20px 22px", boxShadow: "0 4px 20px rgba(0,0,0,0.25)"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {candidates.map((c, i) => (
              <div
                key={i}
                style={{
                  background: "#111827", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.05)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#9ca3af", fontWeight: 700, fontSize: 12
                    }}>
                      #{i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{c.candidateName}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                        Skill: {c.breakdown.skill}% • Experience: {c.breakdown.experience}% • Education: {c.breakdown.education}%
                      </div>
                    </div>
                  </div>
                  <div style={{
                    padding: "4px 12px", borderRadius: 100, fontSize: 13, fontWeight: 800,
                    background: c.overallMatch >= 70 ? "rgba(0,212,170,0.15)" : "rgba(245,158,11,0.15)",
                    color: c.overallMatch >= 70 ? "#00d4aa" : "#f59e0b",
                    border: `1px solid ${c.overallMatch >= 70 ? "rgba(0,212,170,0.3)" : "rgba(245,158,11,0.3)"}`
                  }}>
                    {c.overallMatch}% Match
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {c.matchedSkills.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: "3px 9px", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                        background: "rgba(0,212,170,0.12)", color: "#00d4aa", border: "1px solid rgba(0,212,170,0.25)"
                      }}
                    >
                      ✓ {s}
                    </span>
                  ))}
                  {c.missingSkills.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: "3px 9px", borderRadius: 6, fontSize: 11.5, fontWeight: 600,
                        background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)"
                      }}
                    >
                      Gap: {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
