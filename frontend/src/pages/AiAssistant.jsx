import { useEffect, useState, useRef } from "react";
import { api } from "../api";

const QUESTION_CATEGORIES = [
  { id: "all", label: "🔥 All Questions", count: 24 },
  { id: "ats", label: "⚡ ATS & Resume", count: 5 },
  { id: "placement", label: "💼 Applications", count: 5 },
  { id: "skills", label: "🛠️ Tech Skills", count: 5 },
  { id: "interview", label: "🎙️ Interviews", count: 5 },
  { id: "salary", label: "💰 Salary & Growth", count: 4 },
];

const QUESTION_VAULT = [
  // ATS & Resume
  {
    category: "ats",
    icon: "⚡",
    tag: "ATS Score",
    question: "How can I optimize my resume keywords to score 90%+ on ATS scanners?",
  },
  {
    category: "ats",
    icon: "📝",
    tag: "Action Verbs",
    question: "Which weak verbs should I replace on my resume with high-impact power verbs?",
  },
  {
    category: "ats",
    icon: "📐",
    tag: "Formatting",
    question: "Does modern ATS prefer single-column or multi-column layout, and why?",
  },
  {
    category: "ats",
    icon: "🎯",
    tag: "Quantification",
    question: "How do I rewrite project bullet points to include quantifiable metrics and results?",
  },
  {
    category: "ats",
    icon: "🔍",
    tag: "Keyword Density",
    question: "How do I match job description keywords without triggering keyword stuffing penalties?",
  },

  // Applications & Job Search
  {
    category: "placement",
    icon: "💼",
    tag: "Daily Priority",
    question: "Which jobs should I prioritize applying to today based on market demand?",
  },
  {
    category: "placement",
    icon: "📨",
    tag: "Cold Outreach",
    question: "What is the most effective message template for connecting with tech recruiters on LinkedIn?",
  },
  {
    category: "placement",
    icon: "🔄",
    tag: "Tailoring",
    question: "How can I quickly tailor one resume for frontend, backend, or fullstack positions?",
  },
  {
    category: "placement",
    icon: "📈",
    tag: "Hiring Momentum",
    question: "What indicators show a company has high hiring momentum rather than a stale job post?",
  },
  {
    category: "placement",
    icon: "🌐",
    tag: "Remote vs Hybrid",
    question: "How should I position my profile when competing for fully remote engineering roles?",
  },

  // Tech Skills
  {
    category: "skills",
    icon: "🛠️",
    tag: "High Demand",
    question: "What are the fastest skills to learn right now to unlock higher-tier engineering roles?",
  },
  {
    category: "skills",
    icon: "⚙️",
    tag: "Backend Stacks",
    question: "Which backend technologies (Node.js, Go, Python FastAPI, Java Spring) have the highest hiring velocity?",
  },
  {
    category: "skills",
    icon: "☁️",
    tag: "Cloud & DevOps",
    question: "How valuable are Docker, Kubernetes, and AWS skills for software engineer interviews?",
  },
  {
    category: "skills",
    icon: "🗄️",
    tag: "Databases",
    question: "What database proficiencies (PostgreSQL, MongoDB, Redis, indexing) do recruiters expect?",
  },
  {
    category: "skills",
    icon: "🤖",
    tag: "AI Integration",
    question: "How can I showcase practical AI/LLM integration skills on my developer portfolio?",
  },

  // Interviews
  {
    category: "interview",
    icon: "🎙️",
    tag: "Top Questions",
    question: "What are the most frequent behavioral and technical questions asked in initial screens?",
  },
  {
    category: "interview",
    icon: "⭐",
    tag: "STAR Method",
    question: "How do I structure behavioral answers using the STAR method without sounding rehearsed?",
  },
  {
    category: "interview",
    icon: "💻",
    tag: "Live Coding",
    question: "How should I structure my thinking during a 45-minute live coding or algorithm interview?",
  },
  {
    category: "interview",
    icon: "❓",
    tag: "Reverse Questions",
    question: "What impressive questions should I ask the engineering manager at the end of the interview?",
  },
  {
    category: "interview",
    icon: "🧱",
    tag: "System Design",
    question: "How do I approach a high-level system design question (e.g., rate limiter or URL shortener)?",
  },

  // Salary & Growth
  {
    category: "salary",
    icon: "💰",
    tag: "Negotiation",
    question: "How do I negotiate a higher base salary or sign-on bonus without risking the job offer?",
  },
  {
    category: "salary",
    icon: "⚖️",
    tag: "Multiple Offers",
    question: "How should I professionally navigate having multiple competing offers on different timelines?",
  },
  {
    category: "salary",
    icon: "🚀",
    tag: "Career Jump",
    question: "What habits differentiate engineers who get promoted from junior to mid-level within 1 year?",
  },
  {
    category: "salary",
    icon: "📑",
    tag: "Equity vs Base",
    question: "How should I evaluate equity grants (ESOPs/RSUs) versus fixed cash salary in tech packages?",
  },
];

const FOLLOW_UP_SUGGESTIONS = [
  "Can you give me a real-world example?",
  "What are the most common pitfalls to avoid here?",
  "How can I practice or test this today?",
  "Can you summarize this into actionable steps?",
];

export default function AiAssistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to the CareerAI Executive Placement Advisory Desk. I provide formal, structured analysis on Applicant Tracking Systems (ATS), recruitment funnels, and technical interview preparation. Please select an inquiry from the Question Vault or enter your specific question below.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [vaultSearch, setVaultSearch] = useState("");
  const [showVault, setShowVault] = useState(true);
  const [aiConfig, setAiConfig] = useState({ configured: false, provider: null, model: null, maskedKey: null });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [providerChoice, setProviderChoice] = useState("gemini");
  const [savingKey, setSavingKey] = useState(false);
  const [configSuccess, setConfigSuccess] = useState("");

  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.assistantStatus()
      .then((cfg) => {
        if (cfg) setAiConfig(cfg);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const sendQuestion = async (questionText = null) => {
    const text = (questionText || input).trim();
    if (!text || busy) return;

    setError("");
    setInput("");
    const userTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMessage = { role: "user", content: text, timestamp: userTimestamp };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setBusy(true);

    try {
      const res = await api.assistantChat(text, nextHistory);
      const assistantTimestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.reply,
          timestamp: assistantTimestamp,
          provider: res.provider || (aiConfig.configured ? aiConfig.provider : null),
        },
      ]);
    } catch (err) {
      setError(err.message || "Failed to receive response. Please try again.");
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSaveApiKey = async (e) => {
    e?.preventDefault();
    if (!keyInput.trim()) {
      setError("Please enter an API key.");
      return;
    }
    setSavingKey(true);
    setError("");
    setConfigSuccess("");
    try {
      const res = await api.setAssistantConfig({ apiKey: keyInput.trim(), provider: providerChoice });
      setAiConfig(res.status || { configured: true, provider: providerChoice });
      setConfigSuccess(res.message || "AI API Key verified and connected!");
      setKeyInput("");
      setTimeout(() => {
        setShowConfigModal(false);
        setConfigSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.message || "Could not verify API key.");
    } finally {
      setSavingKey(false);
    }
  };

  const handleClearApiKey = async () => {
    try {
      const res = await api.clearAssistantConfig();
      setAiConfig(res.status || { configured: false });
      setShowConfigModal(false);
    } catch (err) {
      setError(err.message || "Failed to disconnect key.");
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Conversation reset. Select any formal inquiry from the Question Vault above or enter your question below.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setError("");
  };

  const copyAnswer = (text, index) => {
    navigator.clipboard?.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const surpriseMe = () => {
    const randomIndex = Math.floor(Math.random() * QUESTION_VAULT.length);
    const randomQ = QUESTION_VAULT[randomIndex];
    sendQuestion(randomQ.question);
  };

  const filteredVault = QUESTION_VAULT.filter((item) => {
    if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
    if (!vaultSearch.trim()) return true;
    const q = vaultSearch.toLowerCase();
    return item.question.toLowerCase().includes(q) || item.tag.toLowerCase().includes(q);
  });

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: "#f0f3f6", maxWidth: 1000, margin: "0 auto", paddingBottom: 28 }}>
      <style>{`
        .qa-header {
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.09) 0%, rgba(56, 189, 248, 0.06) 50%, rgba(13, 18, 28, 0.96) 100%);
          border: 1px solid rgba(0, 212, 170, 0.22);
          border-radius: 16px;
          padding: 22px 28px;
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
        .qa-header::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, #00d4aa, #38bdf8, transparent);
        }
        .qa-vault-card {
          background: rgba(13, 18, 28, 0.82);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 18px 22px;
          margin-bottom: 20px;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
          transition: all 0.2s ease;
        }
        .qa-cat-pill {
          padding: 6px 13px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.035);
          color: #94a3b8;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .qa-cat-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .qa-cat-pill.active {
          background: rgba(0, 212, 170, 0.15);
          border-color: rgba(0, 212, 170, 0.35);
          color: #00d4aa;
        }
        .qa-grid-questions {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 10px;
          max-height: 240px;
          overflow-y: auto;
          padding-right: 6px;
          margin-top: 12px;
        }
        .qa-grid-questions::-webkit-scrollbar {
          width: 5px;
        }
        .qa-grid-questions::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
        }
        .qa-question-tile {
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.07);
          color: #cbd5e1;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 10px;
          text-align: left;
        }
        .qa-question-tile:hover {
          background: rgba(0, 212, 170, 0.1);
          border-color: rgba(0, 212, 170, 0.35);
          color: #00d4aa;
          transform: translateY(-1.5px);
          box-shadow: 0 4px 14px rgba(0, 212, 170, 0.12);
        }
        .qa-thread-container {
          background: rgba(13, 18, 28, 0.85);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          min-height: 480px;
          max-height: calc(100vh - 280px);
          overflow-y: auto;
          gap: 18px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
        }
        .qa-thread-container::-webkit-scrollbar {
          width: 6px;
        }
        .qa-thread-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .qa-thread-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
        }
        .qa-card-user {
          align-self: flex-end;
          max-width: 84%;
          background: linear-gradient(135deg, rgba(0, 212, 170, 0.18) 0%, rgba(56, 189, 248, 0.12) 100%);
          border: 1px solid rgba(0, 212, 170, 0.35);
          border-radius: 14px 14px 2px 14px;
          padding: 14px 18px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        .qa-card-assistant {
          align-self: flex-start;
          max-width: 90%;
          background: rgba(17, 24, 39, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-left: 3px solid #00d4aa;
          border-radius: 14px 14px 14px 2px;
          padding: 16px 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }
        .qa-followup-pill {
          padding: 5px 11px;
          border-radius: 6px;
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #7dd3fc;
          font-size: 11.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .qa-followup-pill:hover {
          background: rgba(56, 189, 248, 0.18);
          border-color: rgba(56, 189, 248, 0.45);
          color: #fff;
          transform: translateY(-1px);
        }
        .qa-dock {
          background: rgba(13, 18, 28, 0.9);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 212, 170, 0.25);
          border-radius: 14px;
          padding: 8px 10px 8px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
          transition: border-color 0.2s;
        }
        .qa-dock:focus-within {
          border-color: #00d4aa;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 16px rgba(0, 212, 170, 0.2);
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.15); }
        }
        .typing-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #00d4aa;
          margin: 0 2px;
          animation: dotPulse 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
      `}</style>

      {/* ─── 1. Header with Controls ─── */}
      <div className="qa-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span style={{
              display: "inline-block", width: 8, height: 8, borderRadius: "50%",
              background: "#00d4aa", boxShadow: "0 0 10px #00d4aa"
            }} />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#00d4aa", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              AI COPILOT • PLACEMENT Q&A ENGINE
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: "0 0 4px 0", letterSpacing: "-0.02em" }}>
            Ask CareerAI Copilot
          </h1>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            Instant, data-grounded answers for technical placements, ATS scoring, and interview loops.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* AI Key Connection Pill */}
          <button
            type="button"
            onClick={() => {
              setShowConfigModal(true);
              setError("");
              setConfigSuccess("");
            }}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: aiConfig.configured ? "rgba(0, 212, 170, 0.12)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${aiConfig.configured ? "rgba(0, 212, 170, 0.35)" : "rgba(255, 255, 255, 0.12)"}`,
              color: aiConfig.configured ? "#00d4aa" : "#94a3b8",
              fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s ease",
              display: "flex", alignItems: "center", gap: 7
            }}
            title="Configure or test AI API Key"
          >
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: aiConfig.configured ? "#00d4aa" : "#64748b",
              boxShadow: aiConfig.configured ? "0 0 8px #00d4aa" : "none"
            }} />
            <span>{aiConfig.configured ? `${aiConfig.provider?.toUpperCase()} Connected` : "Connect API Key ⚡"}</span>
          </button>

          {/* Surprise Question Picker */}
          <button
            type="button"
            onClick={surpriseMe}
            disabled={busy}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              color: "#38bdf8", fontSize: 12, fontWeight: 600,
              cursor: busy ? "wait" : "pointer", transition: "all 0.15s ease"
            }}
            title="Pick a random high-yield career question"
          >
            🎲 Surprise Question
          </button>

          {/* Toggle Vault View */}
          <button
            type="button"
            onClick={() => setShowVault(!showVault)}
            style={{
              padding: "8px 14px", borderRadius: 8,
              background: showVault ? "rgba(0, 212, 170, 0.15)" : "rgba(255, 255, 255, 0.04)",
              border: showVault ? "1px solid rgba(0, 212, 170, 0.4)" : "1px solid rgba(255, 255, 255, 0.12)",
              color: showVault ? "#00d4aa" : "#9ca3af",
              fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s ease"
            }}
          >
            {showVault ? "▲ Hide Question Vault" : "💡 Question Vault (24+)"}
          </button>

          {/* Clear Thread */}
          <button
            type="button"
            onClick={clearChat}
            style={{
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#9ca3af", fontSize: 12, fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s ease"
            }}
            title="Clear current Q&A thread"
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* ─── AI API Key Setup Modal ─── */}
      {showConfigModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: "#0d131f", border: "1px solid rgba(0, 212, 170, 0.3)",
            borderRadius: 16, width: "100%", maxWidth: 520, padding: 26,
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)", color: "#f8fafc"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>⚡</span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Connect Generative AI Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, margin: "0 0 16px 0" }}>
              Connect your live AI provider to supercharge CareerAI Copilot with dynamic reasoning tailored directly to your resume and live real job posts.
            </p>

            {aiConfig.configured && (
              <div style={{
                background: "rgba(0, 212, 170, 0.08)", border: "1px solid rgba(0, 212, 170, 0.25)",
                borderRadius: 10, padding: "12px 14px", marginBottom: 18,
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#00d4aa" }}>
                    Active Provider: {aiConfig.provider?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    Key: {aiConfig.maskedKey || "Configured"} • Model: {aiConfig.model}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  style={{
                    padding: "5px 10px", borderRadius: 6,
                    background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5", fontSize: 11.5, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}

            <form onSubmit={handleSaveApiKey}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                  Select AI Provider
                </label>
                <select
                  value={providerChoice}
                  onChange={(e) => setProviderChoice(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    background: "#141c2c", border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#fff", fontSize: 13, outline: "none"
                  }}
                >
                  <option value="gemini">Google Gemini (Recommended — Fast & Generous Free Tier)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#cbd5e1", marginBottom: 6 }}>
                  API Key
                </label>
                <input
                  type="password"
                  placeholder={providerChoice === "gemini" ? "AIzaSy..." : providerChoice === "openai" ? "sk-..." : "sk-ant-..."}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 12px", borderRadius: 8,
                    background: "#141c2c", border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box"
                  }}
                />
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 6 }}>
                  {providerChoice === "gemini" ? (
                    <span>
                      Get a free key from{" "}
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8" }}>
                        Google AI Studio ↗
                      </a>
                    </span>
                  ) : providerChoice === "openai" ? (
                    <span>Key from platform.openai.com</span>
                  ) : (
                    <span>Key from console.anthropic.com</span>
                  )}
                </div>
              </div>

              {configSuccess && (
                <div style={{ color: "#00d4aa", fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>
                  ✓ {configSuccess}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  style={{
                    padding: "9px 16px", borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKey}
                  style={{
                    padding: "9px 18px", borderRadius: 8,
                    background: "#00d4aa", border: "none",
                    color: "#080c14", fontSize: 13, fontWeight: 800,
                    cursor: savingKey ? "wait" : "pointer",
                    boxShadow: "0 0 16px rgba(0, 212, 170, 0.4)"
                  }}
                >
                  {savingKey ? "Verifying…" : "Save & Connect Key →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)",
          color: "#fca5a5", padding: "12px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ─── 2. Interactive Question Vault (24+ Curated Categorized Prompts) ─── */}
      {showVault && (
        <div className="qa-vault-card">
          {/* Vault Header & Category Tabs */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {QUESTION_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`qa-cat-pill ${selectedCategory === cat.id ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Quick search inside vault */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 8, padding: "4px 10px", minWidth: 200
            }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>🔍</span>
              <input
                type="text"
                placeholder="Search questions…"
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                style={{
                  background: "none", border: "none", outline: "none",
                  color: "#fff", fontSize: 12, width: "100%", fontFamily: "inherit"
                }}
              />
              {vaultSearch && (
                <button
                  type="button"
                  onClick={() => setVaultSearch("")}
                  style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12, padding: 0 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Question Grid */}
          <div className="qa-grid-questions">
            {filteredVault.map((item, idx) => (
              <button
                key={idx}
                type="button"
                className="qa-question-tile"
                onClick={() => sendQuestion(item.question)}
                disabled={busy}
              >
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#00d4aa", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                    {item.tag}
                  </div>
                  <div style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.35 }}>
                    {item.question}
                  </div>
                </div>
                <span style={{ color: "#64748b", fontSize: 11 }}>→</span>
              </button>
            ))}

            {filteredVault.length === 0 && (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "20px 0", color: "#64748b", fontSize: 12.5 }}>
                No questions found matching "{vaultSearch}". Try another search or category.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. Pure Q&A Conversation Thread ─── */}
      <div className="qa-thread-container">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === "user" ? "qa-card-user" : "qa-card-assistant"}>
            {/* Meta Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 6, fontSize: 11, fontWeight: 700
            }}>
              <span style={{ color: m.role === "user" ? "#00d4aa" : "#38bdf8", display: "flex", alignItems: "center", gap: 6 }}>
                <span>{m.role === "user" ? "Q • Your Question" : "A • Copilot Answer"}</span>
                {m.provider && (
                  <span style={{ fontSize: 10, color: "#00d4aa", background: "rgba(0, 212, 170, 0.12)", border: "1px solid rgba(0, 212, 170, 0.25)", padding: "1px 6px", borderRadius: 4 }}>
                    ✦ {m.provider.toUpperCase()} AI
                  </span>
                )}
              </span>
              <span style={{ color: "#64748b", fontWeight: 500 }}>
                {m.timestamp || ""}
              </span>
            </div>

            {/* Content */}
            <div style={{
              fontSize: 14, lineHeight: 1.6, color: m.role === "user" ? "#ffffff" : "#f1f5f9",
              whiteSpace: "pre-line"
            }}>
              {m.content}
            </div>

            {/* Answer Action Bar (Copy Answer & Contextual Follow-up Chips) */}
            {m.role === "assistant" && idx > 0 && (
              <div style={{
                marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8
              }}>
                {/* Related follow-up chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Explore more:</span>
                  {FOLLOW_UP_SUGGESTIONS.slice(0, 2).map((follow, fIdx) => (
                    <button
                      key={fIdx}
                      type="button"
                      className="qa-followup-pill"
                      onClick={() => sendQuestion(follow)}
                      disabled={busy}
                    >
                      {follow}
                    </button>
                  ))}
                </div>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={() => copyAnswer(m.content, idx)}
                  style={{
                    background: "none", border: "none",
                    color: copiedIndex === idx ? "#00d4aa" : "#9ca3af",
                    fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                    padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 5,
                    transition: "color 0.15s"
                  }}
                >
                  <span>{copiedIndex === idx ? "✓ Copied" : "📋 Copy Answer"}</span>
                </button>
              </div>
            )}
          </div>
        ))}

        {busy && (
          <div className="qa-card-assistant" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Copilot is synthesizing data & crafting your answer</span>
            <span>
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* ─── 4. Question Input Dock ─── */}
      <div className="qa-dock">
        <span style={{ fontSize: 16, color: "#00d4aa" }}>💬</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask any question about placements, ATS scoring, resume bullets, or tech interviews…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendQuestion()}
          disabled={busy}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            color: "#fff", fontSize: 14, fontFamily: "inherit"
          }}
        />
        <button
          type="button"
          onClick={() => sendQuestion()}
          disabled={busy || !input.trim()}
          style={{
            padding: "9px 22px", borderRadius: 10,
            background: busy || !input.trim() ? "rgba(255, 255, 255, 0.06)" : "#00d4aa",
            color: busy || !input.trim() ? "#64748b" : "#090d14",
            fontSize: 13, fontWeight: 700, border: "none",
            cursor: busy || !input.trim() ? "not-allowed" : "pointer",
            boxShadow: input.trim() ? "0 4px 14px rgba(0, 212, 170, 0.25)" : "none",
            transition: "all 0.15s ease",
            display: "inline-flex", alignItems: "center", gap: 6
          }}
        >
          <span>Ask</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
