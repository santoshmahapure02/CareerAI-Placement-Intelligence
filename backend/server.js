require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const resumeRoutes = require("./routes/resumes");
const jobRoutes = require("./routes/jobs");
const matchingRoutes = require("./routes/matching");
const applicationRoutes = require("./routes/applications");
const dashboardRoutes = require("./routes/dashboard");
const adminRoutes = require("./routes/admin");
const assistantRoutes = require("./routes/assistant");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());

// CORS: locked to an explicit allowlist instead of the wide-open
// cors() default (which reflects any Origin header back and is a real
// hardening gap for a JWT-bearing API - a malicious page could otherwise
// make authenticated-looking cross-origin requests from a victim's
// browser). Configure CORS_ORIGIN (comma-separated) in production; the
// dev-friendly defaults below cover the Vite dev server and the
// docker-compose frontend port so local/demo setups work with zero config.
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:8080")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin request, a server-to-server call,
      // or a tool like curl/Postman - allow it (there's no browser CORS
      // model to enforce here anyway; JWT auth still applies).
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS_ORIGIN`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// Rate limit auth endpoints specifically (login/register brute-force
// protection) - the rest of the API stays unlimited since it's all
// authenticated and not a credential-guessing target the same way.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 30 : 2000, // dev friendly
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "careerai-backend" }));

app.get("/api/public-stats", async (req, res, next) => {
  try {
    const db = require("./db");
    const [jobs, apps, users] = await Promise.all([
      db.jobs.all(),
      db.applications.all(),
      db.users.all(),
    ]);
    const activeJobs = jobs.filter((j) => j.isActive !== false);
    const sourceSet = new Set(
      activeJobs.map((j) => {
        const s = (j.source || "Direct").toLowerCase();
        if (s.includes("arbeit")) return "Arbeitnow";
        if (s.includes("remotive")) return "Remotive";
        if (s.includes("adzuna")) return "Adzuna";
        return "Verified Direct";
      })
    );
    const sources = Array.from(sourceSet);
    const sampleJobs = activeJobs.slice(0, 3).map((j) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location || "Remote",
      salary: j.salary || "Competitive",
      workplaceType: j.workplaceType || "remote",
      source: j.source || "platform",
    }));

    res.json({
      totalJobs: activeJobs.length,
      totalApplications: apps.length,
      totalStudents: users.filter((u) => u.role === "student").length,
      sources,
      sampleJobs,
    });
  } catch (err) {
    next(err);
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/assistant", assistantRoutes);

// Central error handler (e.g. multer file-size/type errors, async route
// failures forwarded via utils/asyncHandler.js)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`CareerAI backend running on http://localhost:${PORT}`);
    if (process.env.AUTO_SYNC_JOBS !== "false") {
      const { syncAllJobs } = require("./utils/jobIngestion");
      syncAllJobs()
        .then((s) => console.log(`[CareerAI V6] Live job sync complete: ${s.totalJobs} active jobs available.`))
        .catch((err) => console.warn("[CareerAI V6] Initial job sync warning:", err.message));
    }
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

module.exports = app;
