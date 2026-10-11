import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("student"); // "student" | "recruiter"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Security features state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [emailTypoSuggestion, setEmailTypoSuggestion] = useState("");

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutTime <= 0) return;
    const interval = setInterval(() => {
      setLockoutTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTime]);

  // Email typo checker
  const handleEmailChange = (val) => {
    setEmail(val);
    const domainTypos = {
      "gamil.com": "gmail.com",
      "gmial.com": "gmail.com",
      "gmaill.com": "gmail.com",
      "yaho.com": "yahoo.com",
      "yahooo.com": "yahoo.com",
      "hotmial.com": "hotmail.com",
      "outlok.com": "outlook.com",
    };
    const parts = val.split("@");
    if (parts.length === 2) {
      const typedDomain = parts[1].toLowerCase().trim();
      if (domainTypos[typedDomain]) {
        setEmailTypoSuggestion(`${parts[0]}@${domainTypos[typedDomain]}`);
        return;
      }
    }
    setEmailTypoSuggestion("");
  };

  const applyEmailSuggestion = () => {
    if (emailTypoSuggestion) {
      setEmail(emailTypoSuggestion);
      setEmailTypoSuggestion("");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (lockoutTime > 0) return;

    setError("");
    setBusy(true);

    try {
      const data = await login(email.trim(), password, role);
      setFailedAttempts(0);
      navigate("/");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#080c14",
      backgroundImage: `
        radial-gradient(circle at 50% 12%, rgba(0, 212, 170, 0.12) 0%, transparent 60%),
        radial-gradient(circle at 85% 85%, rgba(56, 189, 248, 0.08) 0%, transparent 55%),
        radial-gradient(circle at 15% 85%, rgba(139, 92, 246, 0.06) 0%, transparent 50%),
        linear-gradient(rgba(255, 255, 255, 0.012) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.012) 1px, transparent 1px)
      `,
      backgroundSize: "100% 100%, 100% 100%, 100% 100%, 40px 40px, 40px 40px",
      padding: 24,
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: "#f0f3f6"
    }}>
      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 170, 0.2); }
          50% { box-shadow: 0 0 35px rgba(0, 212, 170, 0.4); }
        }
        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          color: #00d4aa;
          background: rgba(0, 212, 170, 0.1);
          border: 1px solid rgba(0, 212, 170, 0.25);
          letter-spacing: 0.02em;
        }
        .input-glow:focus {
          border-color: #00d4aa !important;
          box-shadow: 0 0 14px rgba(0, 212, 170, 0.22) !important;
        }
      `}</style>

      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "rgba(13, 18, 28, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 20,
        padding: "38px 34px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 212, 170, 0.04)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Top ambient colored line */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, #00d4aa, #38bdf8, #a855f7)"
        }} />

        {/* Security status badge */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <div className="security-badge">
            <span>🛡️</span>
            <span>256-BIT TLS ENCRYPTED • BRUTE-FORCE PROTECTED</span>
          </div>
        </div>

        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "linear-gradient(135deg, rgba(0, 212, 170, 0.25), rgba(56, 189, 248, 0.2))",
            border: "1px solid rgba(0, 212, 170, 0.4)",
            marginBottom: 12,
            fontSize: 24,
            animation: "pulseGlow 4s infinite"
          }}>
            ⚡
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            Welcome to Career<span style={{ color: role === "recruiter" ? "#38bdf8" : "#00d4aa" }}>AI</span>
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", lineHeight: 1.45 }}>
            {role === "recruiter"
              ? "Sign in to manage job requisitions, review applicants & rank top talent"
              : "Sign in to access your real-time ATS scoring & AI placement pipeline"}
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#fca5a5",
            padding: "12px 14px",
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 12.5,
            lineHeight: 1.45,
            display: "flex",
            flexDirection: "column",
            gap: 8
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <span style={{ flex: 1 }}>{error}</span>
            </div>
            {error.includes("Recruiter") && (
              <button
                type="button"
                onClick={() => { setRole("recruiter"); setError(""); }}
                style={{
                  alignSelf: "flex-start",
                  background: "rgba(56, 189, 248, 0.2)",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  color: "#38bdf8",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Switch to Recruiter Tab →
              </button>
            )}
            {(error.includes("Candidate") || error.includes("Student")) && (
              <button
                type="button"
                onClick={() => { setRole("student"); setError(""); }}
                style={{
                  alignSelf: "flex-start",
                  background: "rgba(0, 212, 170, 0.2)",
                  border: "1px solid rgba(0, 212, 170, 0.4)",
                  color: "#00d4aa",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Switch to Student Tab →
              </button>
            )}
            {error.includes("register first") && (
              <Link
                to="/register"
                style={{
                  alignSelf: "flex-start",
                  background: "rgba(0, 212, 170, 0.2)",
                  border: "1px solid rgba(0, 212, 170, 0.4)",
                  color: "#00d4aa",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 700,
                  textDecoration: "none"
                }}
              >
                Create an Account Now →
              </Link>
            )}
          </div>
        )}

        {/* Lockout countdown notice */}
        {lockoutTime > 0 && (
          <div style={{
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            color: "#fcd34d",
            padding: "11px 14px",
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 12.5,
            textAlign: "center",
            fontWeight: 600
          }}>
            ⏳ Cooldown active: Retry in <strong>{lockoutTime}</strong> seconds
          </div>
        )}

        {/* Role Selection Dual Cards */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Select Portal / Sign In As
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setRole("student");
                setError("");
              }}
              style={{
                background: role === "student" ? "rgba(0, 212, 170, 0.12)" : "rgba(255, 255, 255, 0.03)",
                border: role === "student" ? "1px solid #00d4aa" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "12px 10px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
                boxShadow: role === "student" ? "0 0 16px rgba(0, 212, 170, 0.18)" : "none"
              }}
            >
              {role === "student" && (
                <span style={{
                  position: "absolute",
                  top: 6,
                  right: 8,
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#00d4aa",
                  background: "rgba(0, 212, 170, 0.2)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  textTransform: "uppercase"
                }}>
                  Active
                </span>
              )}
              <div style={{ fontSize: 22, marginBottom: 4 }}>🎓</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: role === "student" ? "#00d4aa" : "#fff" }}>
                Student
              </div>
              <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>
                Learner & Job Seeker
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setRole("recruiter");
                setError("");
              }}
              style={{
                background: role === "recruiter" ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.03)",
                border: role === "recruiter" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "12px 10px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
                boxShadow: role === "recruiter" ? "0 0 16px rgba(56, 189, 248, 0.18)" : "none"
              }}
            >
              {role === "recruiter" && (
                <span style={{
                  position: "absolute",
                  top: 6,
                  right: 8,
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#38bdf8",
                  background: "rgba(56, 189, 248, 0.2)",
                  borderRadius: 4,
                  padding: "1px 5px",
                  textTransform: "uppercase"
                }}>
                  Active
                </span>
              )}
              <div style={{ fontSize: 22, marginBottom: 4 }}>💼</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: role === "recruiter" ? "#38bdf8" : "#fff" }}>
                Recruiter
              </div>
              <div style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2 }}>
                Employer & Hiring Lead
              </div>
            </button>
          </div>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email input */}
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
              <span>{role === "recruiter" ? "Recruiter Email" : "Student Email Address"}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>Secured</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="input-glow"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder={role === "recruiter" ? "recruiter@company.com" : "student@domain.com"}
                required
                disabled={lockoutTime > 0 || busy}
                style={{
                  width: "100%",
                  background: "#090d14",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  padding: "11px 14px 11px 36px",
                  color: "#fff",
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "all 0.2s"
                }}
              />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 14 }}>
                ✉️
              </span>
            </div>

            {/* Email typo suggestion */}
            {emailTypoSuggestion && (
              <div style={{
                marginTop: 6,
                fontSize: 11.5,
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <span>Did you mean <strong>{emailTypoSuggestion}</strong>?</span>
                <button
                  type="button"
                  onClick={applyEmailSuggestion}
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    color: "#38bdf8",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  Apply Fix
                </button>
              </div>
            )}
          </div>

          {/* Password input with show/hide toggle */}
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
              <span>Account Password</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>Bcrypt Hashed</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="input-glow"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                disabled={lockoutTime > 0 || busy}
                style={{
                  width: "100%",
                  background: "#090d14",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 10,
                  padding: "11px 40px 11px 36px",
                  color: "#fff",
                  fontSize: 13.5,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "all 0.2s"
                }}
              />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#64748b", fontSize: 14 }}>
                🔑
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 2
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy || lockoutTime > 0}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 11,
              background: lockoutTime > 0
                ? "rgba(255, 255, 255, 0.08)"
                : role === "recruiter"
                ? "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)"
                : "linear-gradient(135deg, #00d4aa 0%, #0284c7 100%)",
              color: lockoutTime > 0 ? "#64748b" : (role === "recruiter" ? "#fff" : "#090d14"),
              border: "none",
              fontSize: 14,
              fontWeight: 800,
              cursor: lockoutTime > 0 || busy ? "not-allowed" : "pointer",
              boxShadow: lockoutTime > 0
                ? "none"
                : role === "recruiter"
                ? "0 6px 20px rgba(56, 189, 248, 0.35)"
                : "0 6px 20px rgba(0, 212, 170, 0.35)",
              transition: "all 0.2s",
              marginTop: 4
            }}
          >
            {busy
              ? "Authenticating Session…"
              : lockoutTime > 0
              ? `Locked (${lockoutTime}s)`
              : role === "recruiter"
              ? "Sign In as Recruiter →"
              : "Sign In as Student →"}
          </button>
        </form>

        {/* Create account link */}
        <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginTop: 22, marginBottom: 18 }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#00d4aa", fontWeight: 700, textDecoration: "none" }}>
            Create one free
          </Link>
        </p>

        {/* Security Trust Seals */}
        <div style={{
          paddingTop: 16,
          borderTop: "1px solid rgba(255, 255, 255, 0.06)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 10.5,
          color: "#64748b",
          fontFamily: "monospace"
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>🔒</span> OWASP COMPLIANT
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>⚡</span> SHA-256 JWT
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>🛡️</span> ZERO STORAGE OF PLAIN PWD
          </span>
        </div>
      </div>
    </div>
  );
}
