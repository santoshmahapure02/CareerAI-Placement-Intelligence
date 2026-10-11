import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState("student");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [emailTypoSuggestion, setEmailTypoSuggestion] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

  // Real-time password criteria evaluation
  const passwordCriteria = useMemo(() => {
    return {
      length: password.length >= 8,
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^a-zA-Z0-9]/.test(password),
    };
  }, [password]);

  // Overall password strength calculation
  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordCriteria.length) score += 25;
    if (passwordCriteria.hasLetter) score += 25;
    if (passwordCriteria.hasNumber) score += 25;
    if (passwordCriteria.hasSpecial) score += 25;
    return score;
  }, [passwordCriteria]);

  const strengthMeta = useMemo(() => {
    if (strengthScore <= 25) return { label: "Weak", color: "#ef4444" };
    if (strengthScore <= 50) return { label: "Fair", color: "#f59e0b" };
    if (strengthScore <= 75) return { label: "Good", color: "#38bdf8" };
    return { label: "Strong & Secure", color: "#00d4aa" };
  }, [strengthScore]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const submit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your entries.");
      return;
    }

    setError("");
    setBusy(true);

    try {
      await register(name.trim(), email.trim(), password, role);
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to create account. Please check your details.");
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
      padding: "36px 20px",
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
        maxWidth: 480,
        background: "rgba(13, 18, 28, 0.9)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 20,
        padding: "38px 34px",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 212, 170, 0.04)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Top ambient line */}
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
            <span>END-TO-END ENCRYPTED • ZERO PLAIN STORAGE</span>
          </div>
        </div>

        {/* Header Branding */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
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
            ✨
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 6px 0", letterSpacing: "-0.02em" }}>
            Create Your Account
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#9ca3af", lineHeight: 1.45 }}>
            Join CareerAI to unlock real-time ATS scoring, skill diagnostics, and verified tech roles
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#fca5a5",
            padding: "11px 14px",
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 12.5,
            lineHeight: 1.45,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Account Role Dual-Card Selector */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Select Your Role
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => setRole("student")}
                style={{
                  background: role === "student" ? "rgba(0, 212, 170, 0.12)" : "rgba(255, 255, 255, 0.03)",
                  border: role === "student" ? "1px solid #00d4aa" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 11,
                  padding: "12px 10px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
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
                onClick={() => setRole("recruiter")}
                style={{
                  background: role === "recruiter" ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.03)",
                  border: role === "recruiter" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 11,
                  padding: "12px 10px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
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

          {/* Full Name */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
              Full Name
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="input-glow"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Santosh Sharma"
                required
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
                👤
              </span>
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
              <span>Email Address</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>Unique Login ID</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="input-glow"
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="you@domain.com"
                required
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

          {/* Password with entropy bar and live checks */}
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
              <span>Security Password</span>
              {password && (
                <span style={{ fontSize: 11, fontWeight: 700, color: strengthMeta.color }}>
                  {strengthMeta.label}
                </span>
              )}
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="input-glow"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters…"
                required
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

            {/* Password Strength Meter Bar */}
            {password && (
              <div style={{ marginTop: 8 }}>
                <div style={{
                  height: 4,
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 4,
                  overflow: "hidden"
                }}>
                  <div style={{
                    height: "100%",
                    width: `${strengthScore}%`,
                    background: strengthMeta.color,
                    transition: "width 0.3s ease, background-color 0.3s ease"
                  }} />
                </div>

                {/* 4 Security Criteria checks */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", marginTop: 8, fontSize: 11 }}>
                  <div style={{ color: passwordCriteria.length ? "#00d4aa" : "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>{passwordCriteria.length ? "✓" : "○"}</span>
                    <span>8+ Characters</span>
                  </div>
                  <div style={{ color: passwordCriteria.hasLetter ? "#00d4aa" : "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>{passwordCriteria.hasLetter ? "✓" : "○"}</span>
                    <span>Includes Letters</span>
                  </div>
                  <div style={{ color: passwordCriteria.hasNumber ? "#00d4aa" : "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>{passwordCriteria.hasNumber ? "✓" : "○"}</span>
                    <span>Includes Numbers</span>
                  </div>
                  <div style={{ color: passwordCriteria.hasSpecial ? "#00d4aa" : "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <span>{passwordCriteria.hasSpecial ? "✓" : "○"}</span>
                    <span>Special Symbols</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
              <span>Confirm Password</span>
              {passwordsMatch && (
                <span style={{ fontSize: 11, color: "#00d4aa", fontWeight: 700 }}>✓ Passwords Match</span>
              )}
              {passwordsMismatch && (
                <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 700 }}>Mismatch</span>
              )}
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="input-glow"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type your password…"
                required
                style={{
                  width: "100%",
                  background: "#090d14",
                  border: passwordsMismatch
                    ? "1px solid rgba(239, 68, 68, 0.5)"
                    : passwordsMatch
                    ? "1px solid rgba(0, 212, 170, 0.5)"
                    : "1px solid rgba(255, 255, 255, 0.12)",
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
                🔒
              </span>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Terms & Privacy Consent */}
          <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer", fontSize: 12, color: "#9ca3af", lineHeight: 1.45 }}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              style={{ marginTop: 2, accentColor: "#00d4aa" }}
            />
            <span>
              I agree to CareerAI's <span style={{ color: "#00d4aa", fontWeight: 600 }}>Privacy Policy</span> & Terms of Service.
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy || !name || !email || !password || passwordsMismatch}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 11,
              background: passwordsMismatch
                ? "rgba(255, 255, 255, 0.08)"
                : role === "recruiter"
                ? "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)"
                : "linear-gradient(135deg, #00d4aa 0%, #0284c7 100%)",
              color: passwordsMismatch ? "#64748b" : (role === "recruiter" ? "#fff" : "#090d14"),
              border: "none",
              fontSize: 14,
              fontWeight: 800,
              cursor: passwordsMismatch || busy ? "not-allowed" : "pointer",
              boxShadow: passwordsMismatch
                ? "none"
                : role === "recruiter"
                ? "0 6px 20px rgba(56, 189, 248, 0.35)"
                : "0 6px 20px rgba(0, 212, 170, 0.35)",
              transition: "all 0.2s",
              marginTop: 4
            }}
          >
            {busy
              ? "Creating Account…"
              : role === "recruiter"
              ? "Create Recruiter Account →"
              : "Create Student Account →"}
          </button>
        </form>

        {/* Sign in link */}
        <p style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginTop: 22, marginBottom: 18 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#00d4aa", fontWeight: 700, textDecoration: "none" }}>
            Sign in
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
            <span>🔒</span> BCRYPT 10-ROUNDS
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>🛡️</span> ROLE-ISOLATED
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>⚡</span> ZERO PLAIN STORAGE
          </span>
        </div>
      </div>
    </div>
  );
}
