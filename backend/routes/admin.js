// routes/admin.js
// -----------------------------------------------------------------------
// Admin-only platform control panel: cross-role visibility into everything
// the deterministic dashboards intentionally scope down (students see only
// their own data, recruiters see only their own jobs). Every handler here
// is gated by requireRole("admin") - never trust the frontend to hide the
// button, the server has to refuse too.
// -----------------------------------------------------------------------
const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { cascadeDeleteUser, cascadeDeleteJob } = require("../utils/adminCascade");

const router = express.Router();
router.use(authRequired, requireRole("admin"));

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.createdAt };
}

// GET /api/admin/overview - platform-wide KPIs for the admin landing page.
router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const [users, jobs, applications, resumes] = await Promise.all([
      db.users.all(),
      db.jobs.all(),
      db.applications.all(),
      db.resumes.all(),
    ]);

    const usersByRole = users.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});

    const applicationsByStatus = applications.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    const avgAtsScore = resumes.length
      ? Math.round(resumes.reduce((sum, r) => sum + (r.score || 0), 0) / resumes.length)
      : null;

    const recentUsers = users
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map(publicUser);

    const recentJobs = jobs
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map((j) => ({ id: j.id, title: j.title, company: j.company, createdAt: j.createdAt }));

    // Skills most commonly required across every job posting on the
    // platform - the single most useful "what should students be learning"
    // signal an admin/careers-office user can act on directly.
    const skillFreq = {};
    for (const job of jobs) {
      for (const s of job.requiredSkills || []) skillFreq[s] = (skillFreq[s] || 0) + 1;
    }
    const topDemandSkills = Object.entries(skillFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));

    res.json({
      totals: {
        users: users.length,
        jobs: jobs.length,
        applications: applications.length,
        resumes: resumes.length,
      },
      usersByRole,
      applicationsByStatus,
      avgAtsScore,
      recentUsers,
      recentJobs,
      topDemandSkills,
    });
  })
);

// GET /api/admin/users - full user list for the management table.
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const users = await db.users.all();
    res.json(users.map(publicUser).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  })
);

// PUT /api/admin/users/:id/role - promote/demote a user.
router.put(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const { role } = req.body || {};
    if (!["student", "recruiter", "admin"].includes(role)) {
      return res.status(400).json({ error: "role must be student, recruiter, or admin" });
    }
    if (Number(req.params.id) === req.user.id && role !== "admin") {
      return res.status(400).json({ error: "You can't demote your own account." });
    }
    const updated = await db.users.update(req.params.id, { role });
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(publicUser(updated));
  })
);

// DELETE /api/admin/users/:id
router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: "You can't delete your own account." });
    }
    // Cascade-deletes the user's own resumes/applications, and - if
    // they're a recruiter/admin - the jobs they posted plus every
    // application to those jobs, so deleting a user never leaves
    // orphaned rows behind (see utils/adminCascade.js).
    const ok = await cascadeDeleteUser(db, req.params.id);
    if (!ok) return res.status(404).json({ error: "User not found" });
    res.status(204).end();
  })
);

// POST /api/admin/users - manually provision any account type (mirrors
// /auth/create-account but lives under /admin for a single control panel).
router.post(
  "/users",
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password || !["student", "recruiter", "admin"].includes(role)) {
      return res.status(400).json({ error: "name, email, password, and a valid role are required" });
    }
    const existing = await db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.users.insert({ name, email, passwordHash, role });
    res.status(201).json(publicUser(user));
  })
);

// GET /api/admin/jobs - every job on the platform, regardless of who posted it.
router.get(
  "/jobs",
  asyncHandler(async (req, res) => {
    const jobs = await db.jobs.all();
    res.json(jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  })
);

// DELETE /api/admin/jobs/:id - moderation: remove any posting platform-wide.
router.delete(
  "/jobs/:id",
  asyncHandler(async (req, res) => {
    // Cascade-deletes every application to this job too - see
    // utils/adminCascade.js.
    const ok = await cascadeDeleteJob(db, req.params.id);
    if (!ok) return res.status(404).json({ error: "Job not found" });
    res.status(204).end();
  })
);

module.exports = router;
