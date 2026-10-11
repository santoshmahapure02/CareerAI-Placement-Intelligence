// utils/aiClient.js
// -----------------------------------------------------------------------
// Unified Generative AI Client for CareerAI Copilot & Resume Assessment
// Supports:
// 1. Google Gemini (Gemini 1.5 Flash / Gemini 2.0 Flash) - recommended
// 2. OpenAI (GPT-4o / GPT-4o-mini)
// 3. Anthropic Claude (Claude 3.5 Sonnet)
// 4. Graceful fallback when no key is set or remote service is unreachable
// -----------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

const ENV_PATH = path.join(__dirname, "..", ".env");

let runtimeConfig = {
  geminiKey: process.env.GEMINI_API_KEY || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  openaiKey: process.env.OPENAI_API_KEY || "",
  preferredProvider: process.env.AI_PROVIDER || "auto", // "gemini" | "anthropic" | "openai" | "auto"
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  anthropicModel: process.env.ASSISTANT_MODEL || "claude-3-5-sonnet-20241022",
  openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
};

function detectProvider(key = "") {
  const trimmed = key.trim();
  if (trimmed.startsWith("AIzaSy")) return "gemini";
  if (trimmed.startsWith("sk-ant-")) return "anthropic";
  if (trimmed.startsWith("sk-")) return "openai";
  return "gemini"; // default for generic keys
}

function getActiveProvider() {
  if (runtimeConfig.preferredProvider && runtimeConfig.preferredProvider !== "auto") {
    if (runtimeConfig.preferredProvider === "gemini" && runtimeConfig.geminiKey) return "gemini";
    if (runtimeConfig.preferredProvider === "anthropic" && runtimeConfig.anthropicKey) return "anthropic";
    if (runtimeConfig.preferredProvider === "openai" && runtimeConfig.openaiKey) return "openai";
  }

  // Auto-detect based on available keys
  if (runtimeConfig.geminiKey) return "gemini";
  if (runtimeConfig.anthropicKey) return "anthropic";
  if (runtimeConfig.openaiKey) return "openai";
  return null;
}

function isConfigured() {
  return getActiveProvider() !== null;
}

function maskKey(key = "") {
  if (!key || key.length < 8) return "";
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

function getStatus() {
  const provider = getActiveProvider();
  if (!provider) {
    return {
      configured: false,
      provider: null,
      model: null,
      maskedKey: null,
      supportedProviders: ["gemini", "anthropic", "openai"],
    };
  }

  let model = "";
  let key = "";
  if (provider === "gemini") {
    model = runtimeConfig.geminiModel;
    key = runtimeConfig.geminiKey;
  } else if (provider === "anthropic") {
    model = runtimeConfig.anthropicModel;
    key = runtimeConfig.anthropicKey;
  } else if (provider === "openai") {
    model = runtimeConfig.openaiModel;
    key = runtimeConfig.openaiKey;
  }

  return {
    configured: true,
    provider,
    model,
    maskedKey: maskKey(key),
    supportedProviders: ["gemini", "anthropic", "openai"],
  };
}

// Persist key to .env so it stays active across backend restarts
function persistToEnv(keyName, keyValue) {
  try {
    if (!fs.existsSync(ENV_PATH)) return;
    let content = fs.readFileSync(ENV_PATH, "utf8");
    const regex = new RegExp(`^${keyName}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${keyName}=${keyValue}`);
    } else {
      content += `\n${keyName}=${keyValue}`;
    }
    fs.writeFileSync(ENV_PATH, content, "utf8");
  } catch (err) {
    console.warn("[aiClient] Could not persist to .env:", err.message);
  }
}

// Test an API key with a fast 1-token health check
async function testApiKey(rawKey, providerChoice = "auto") {
  const key = (rawKey || "").trim();
  if (!key) throw new Error("API key cannot be empty");

  const provider = providerChoice === "auto" ? detectProvider(key) : providerChoice;

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Ping" }] }],
        generationConfig: { maxOutputTokens: 5 },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      let msg = "Invalid Google Gemini API key";
      try {
        const json = JSON.parse(err);
        msg = json.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }
    return { ok: true, provider: "gemini", model: "gemini-1.5-flash" };
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 5,
        messages: [{ role: "user", content: "Ping" }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      let msg = "Invalid Anthropic API key";
      try {
        const json = JSON.parse(err);
        msg = json.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }
    return { ok: true, provider: "anthropic", model: "claude-3-5-sonnet-20241022" };
  }

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 5,
        messages: [{ role: "user", content: "Ping" }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      let msg = "Invalid OpenAI API key";
      try {
        const json = JSON.parse(err);
        msg = json.error?.message || msg;
      } catch {}
      throw new Error(msg);
    }
    return { ok: true, provider: "openai", model: "gpt-4o-mini" };
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

async function setApiKey(rawKey, providerChoice = "auto") {
  const result = await testApiKey(rawKey, providerChoice);
  const provider = result.provider;

  if (provider === "gemini") {
    runtimeConfig.geminiKey = rawKey.trim();
    runtimeConfig.preferredProvider = "gemini";
    process.env.GEMINI_API_KEY = rawKey.trim();
    process.env.AI_PROVIDER = "gemini";
    persistToEnv("GEMINI_API_KEY", rawKey.trim());
    persistToEnv("AI_PROVIDER", "gemini");
  } else if (provider === "anthropic") {
    runtimeConfig.anthropicKey = rawKey.trim();
    runtimeConfig.preferredProvider = "anthropic";
    process.env.ANTHROPIC_API_KEY = rawKey.trim();
    process.env.AI_PROVIDER = "anthropic";
    persistToEnv("ANTHROPIC_API_KEY", rawKey.trim());
    persistToEnv("AI_PROVIDER", "anthropic");
  } else if (provider === "openai") {
    runtimeConfig.openaiKey = rawKey.trim();
    runtimeConfig.preferredProvider = "openai";
    process.env.OPENAI_API_KEY = rawKey.trim();
    process.env.AI_PROVIDER = "openai";
    persistToEnv("OPENAI_API_KEY", rawKey.trim());
    persistToEnv("AI_PROVIDER", "openai");
  }

  return getStatus();
}

function clearApiKey() {
  runtimeConfig.geminiKey = "";
  runtimeConfig.anthropicKey = "";
  runtimeConfig.openaiKey = "";
  process.env.GEMINI_API_KEY = "";
  process.env.ANTHROPIC_API_KEY = "";
  process.env.OPENAI_API_KEY = "";
  persistToEnv("GEMINI_API_KEY", "");
  persistToEnv("ANTHROPIC_API_KEY", "");
  persistToEnv("OPENAI_API_KEY", "");
  return getStatus();
}

// Main Completion Dispatcher
async function generateAiChat({ systemPrompt, userMessage, context = "", history = [] }) {
  const provider = getActiveProvider();
  if (!provider) return null;

  if (provider === "gemini") {
    const key = runtimeConfig.geminiKey;
    const model = runtimeConfig.geminiModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const contents = [];
    // System context prompt
    contents.push({
      role: "user",
      parts: [
        {
          text: `${systemPrompt}\n\n[Candidate Profile & Live Market Matches]\n${context}\n\nPlease maintain an authoritative, formal, structured, executive career counseling tone.`,
        },
      ],
    });
    contents.push({
      role: "model",
      parts: [
        {
          text: "Understood. I have evaluated the candidate's profile and live employment market data. I am ready to provide structured, executive-grade career counsel.",
        },
      ],
    });

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (!h || !h.content) continue;
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        });
      }
    }

    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 1200,
          temperature: 0.65,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    return parts.map((p) => p.text).join("\n").trim();
  }

  if (provider === "anthropic") {
    const key = runtimeConfig.anthropicKey;
    const model = runtimeConfig.anthropicModel;

    const messages = [
      { role: "user", content: `[User Profile & Live Market Matches]\n${context}` },
      {
        role: "assistant",
        content: "Understood. I will provide formal, executive-grade career guidance grounded in their profile and market data.",
      },
    ];

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h && (h.role === "user" || h.role === "assistant") && h.content) {
          messages.push({ role: h.role, content: h.content });
        }
      }
    }
    messages.push({ role: "user", content: userMessage });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }

  if (provider === "openai") {
    const key = runtimeConfig.openaiKey;
    const model = runtimeConfig.openaiModel;

    const messages = [
      {
        role: "system",
        content: `${systemPrompt}\n\n[Candidate Profile & Live Market Matches]\n${context}`,
      },
    ];

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h && (h.role === "user" || h.role === "assistant") && h.content) {
          messages.push({ role: h.role, content: h.content });
        }
      }
    }
    messages.push({ role: "user", content: userMessage });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages,
        temperature: 0.65,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  }

  return null;
}

module.exports = {
  isConfigured,
  getStatus,
  testApiKey,
  setApiKey,
  clearApiKey,
  generateAiChat,
  detectProvider,
};
