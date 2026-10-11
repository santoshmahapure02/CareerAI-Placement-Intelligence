const express = require("express");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");
const { extractSkills } = require("../utils/skills");
const asyncHandler = require("../utils/asyncHandler");
const { validateBody, jobSchema } = require("../utils/validation");
const { syncAllJobs, searchLiveExternalJobs, getLastSyncStatus } = require("../utils/jobIngestion");

const router = express.Router();

router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    let jobs = await db.jobs.all();

    const {
      q,
      location,
      workplaceType,
      experienceLevel,
      jobType,
      skills,
      freshness,
      source,
      sort,
      includeInactive,
    } = req.query;

    if (includeInactive !== "true") {
      jobs = jobs.filter((j) => j.isActive !== false);
    }

    if (q && typeof q === "string" && q.trim()) {
      const term = q.trim().toLowerCase();
      jobs = jobs.filter((j) => {
        const inTitle = (j.title || "").toLowerCase().includes(term);
        const inCompany = (j.company || "").toLowerCase().includes(term);
        const inDesc = (j.description || "").toLowerCase().includes(term);
        const inSkills = (j.requiredSkills || []).some((s) => s.toLowerCase().includes(term));
        return inTitle || inCompany || inDesc || inSkills;
      });
    }

    if (location && typeof location === "string" && location.trim()) {
      const locTerm = location.trim().toLowerCase();
      jobs = jobs.filter((j) => (j.location || "").toLowerCase().includes(locTerm));
    }

    if (workplaceType && workplaceType !== "all") {
      jobs = jobs.filter((j) => (j.workplaceType || "remote").toLowerCase() === workplaceType.toLowerCase());
    }

    if (experienceLevel && experienceLevel !== "all") {
      jobs = jobs.filter((j) => (j.experienceLevel || "mid").toLowerCase() === experienceLevel.toLowerCase());
    }

    if (jobType && jobType !== "all") {
      jobs = jobs.filter((j) => (j.jobType || "full-time").toLowerCase() === jobType.toLowerCase());
    }

    if (source && source !== "all") {
      jobs = jobs.filter((j) => (j.source || "platform").toLowerCase() === source.toLowerCase());
    }

    if (skills) {
      const skillArr = skills.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (skillArr.length) {
        jobs = jobs.filter((j) => {
          const reqSet = new Set((j.requiredSkills || []).map((s) => s.toLowerCase()));
          return skillArr.some((s) => reqSet.has(s));
        });
      }
    }

    if (freshness && freshness !== "all") {
      const now = Date.now();
      const cutoffMap = {
        "24h": now - 24 * 3600 * 1000,
        "7d": now - 7 * 24 * 3600 * 1000,
        "30d": now - 30 * 24 * 3600 * 1000,
      };
      const cutoff = cutoffMap[freshness];
      if (cutoff) {
        jobs = jobs.filter((j) => {
          const date = new Date(j.postedAt || j.createdAt).getTime();
          return !Number.isNaN(date) && date >= cutoff;
        });
      }
    }

    if (sort === "oldest") {
      jobs.sort((a, b) => new Date(a.postedAt || a.createdAt) - new Date(b.postedAt || b.createdAt));
    } else {
      jobs.sort((a, b) => new Date(b.postedAt || b.createdAt) - new Date(a.postedAt || a.createdAt));
    }

    res.json(jobs);
  })
);

router.get("/sync/status", authRequired, (req, res) => {
  res.json(getLastSyncStatus());
});

router.post(
  "/sync",
  authRequired,
  asyncHandler(async (req, res) => {
    const summary = await syncAllJobs({ recruiterUserId: req.user.id });
    res.json(summary);
  })
);

router.post(
  "/live-search",
  authRequired,
  asyncHandler(async (req, res) => {
    const { query, location, limit } = req.body || {};
    const result = await searchLiveExternalJobs({ query, location, limit });
    res.json(result);
  })
);

router.get(
  "/:id",
  authRequired,
  asyncHandler(async (req, res) => {
    const job = await db.jobs.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  })
);

router.post(
  "/",
  authRequired,
  requireRole("recruiter", "admin"),
  validateBody(jobSchema),
  asyncHandler(async (req, res) => {
    const {
      title,
      company,
      description,
      requiredSkills,
      location,
      workplaceType,
      experienceLevel,
      jobType,
      salary,
      url,
    } = req.body;

    const skills = Array.isArray(requiredSkills) && requiredSkills.length
      ? requiredSkills
      : extractSkills(description);

    const nowIso = new Date().toISOString();

    const job = await db.jobs.insert({
      title,
      company,
      description,
      requiredSkills: skills,
      location: location || "Remote",
      workplaceType: workplaceType || "remote",
      experienceLevel: experienceLevel || "mid",
      jobType: jobType || "full-time",
      salary: salary || null,
      source: "direct",
      sourceJobId: `direct-${Date.now()}`,
      url: url || "",
      postedAt: nowIso,
      lastSyncedAt: nowIso,
      isActive: true,
      createdBy: req.user.id,
    });
    res.status(201).json(job);
  })
);

router.put(
  "/:id",
  authRequired,
  requireRole("recruiter", "admin"),
  asyncHandler(async (req, res) => {
    const job = await db.jobs.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (req.user.role !== "admin" && job.createdBy !== req.user.id) {
      return res.status(403).json({ error: "You can only edit jobs you posted" });
    }
    const updated = await db.jobs.update(req.params.id, req.body);
    res.json(updated);
  })
);

router.delete(
  "/:id",
  authRequired,
  requireRole("recruiter", "admin"),
  asyncHandler(async (req, res) => {
    const job = await db.jobs.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (req.user.role !== "admin" && job.createdBy !== req.user.id) {
      return res.status(403).json({ error: "You can only delete jobs you posted" });
    }
    await db.jobs.remove(req.params.id);
    res.status(204).end();
  })
);

module.exports = router;
