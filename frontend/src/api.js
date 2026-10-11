const BASE = "/api";

function getToken() {
  return localStorage.getItem("careerai_token");
}

async function request(path, { method = "GET", body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body) headers["Content-Type"] = "application/json";

  const options = { method, headers };
  if (body != null && method !== "GET" && method !== "HEAD") {
    options.body = isForm ? body : JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, options);

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: () => request("/auth/me"),

  uploadResume: (file) => {
    const form = new FormData();
    form.append("resume", file);
    return request("/resumes/upload", { method: "POST", body: form, isForm: true });
  },
  analyzeResumeText: (payload) => request("/resumes/analyze-text", { method: "POST", body: payload }),
  myResumes: () => request("/resumes/mine"),
  aiAssessResume: (id) => request(`/resumes/${id}/ai-assessment`, { method: "POST" }),
  aiAssessResumeText: (payload) => request("/resumes/ai-assess", { method: "POST", body: payload }),

  jobs: (params = {}) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "" && v !== "all") query.set(k, v);
    }
    const qStr = query.toString();
    return request(`/jobs${qStr ? `?${qStr}` : ""}`);
  },
  syncJobs: () => request("/jobs/sync", { method: "POST" }),
  liveSearchJobs: (payload) => request("/jobs/live-search", { method: "POST", body: payload }),
  jobSyncStatus: () => request("/jobs/sync/status"),
  createJob: (payload) => request("/jobs", { method: "POST", body: payload }),

  recommendations: () => request("/matching/recommendations"),
  matchForJob: (jobId) => request(`/matching/jobs/${jobId}`),
  candidatesForJob: (jobId) => request(`/matching/jobs/${jobId}/candidates`),
  skillGap: (payload = {}) => request("/matching/skill-gap", { method: "POST", body: payload }),
  skillGapOverview: () => request("/matching/skill-gap/overview"),

  applications: () => request("/applications"),
  applyToJob: (jobId) => request("/applications", { method: "POST", body: { jobId } }),
  updateApplicationStatus: (id, status) =>
    request(`/applications/${id}/status`, { method: "PUT", body: { status } }),

  dashboard: () => request("/dashboard"),

  assistantStatus: () => request("/assistant/status"),
  setAssistantConfig: (payload) => request("/assistant/config", { method: "POST", body: payload }),
  clearAssistantConfig: () => request("/assistant/config", { method: "DELETE" }),
  assistantChat: (message, history) => request("/assistant/chat", { method: "POST", body: { message, history } }),
  dailyPlan: () => request("/assistant/daily-plan"),
  publicStats: () => request("/public-stats"),
};

export function setToken(token) {
  if (token) localStorage.setItem("careerai_token", token);
  else localStorage.removeItem("careerai_token");
}

export function hasToken() {
  return !!getToken();
}
