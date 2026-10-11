const express = require("express");
const db = require("../db");
const { authRequired, requireRole } = require("../middleware/auth");
const { computeMatch, rankCandidates, skillGap, buildLearningPath, computeSkillDemand } = require("../utils/matchEngine");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

async function latestResumeFor(userId) {
  const resumes = await db.resumes.filter((r) => r.userId === userId);
  return resumes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

router.get(
  "/recommendations",
  authRequired,
  asyncHandler(async (req, res) => {
    const resume = await latestResumeFor(req.user.id);
    if (!resume) return res.json([]);

    const jobs = (await db.jobs.all()).filter((j) => j.isActive !== false);
    const deterministic = jobs
      .map((job) => computeMatch(resume, job))
      .sort((a, b) => b.overallMatch - a.overallMatch);

    res.json(deterministic);
  })
);

router.get(
  "/jobs/:jobId",
  authRequired,
  asyncHandler(async (req, res) => {
    const job = await db.jobs.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const resume = await latestResumeFor(req.user.id);
    if (!resume) {
      return res.status(404).json({ error: "Upload a resume first" });
    }

    res.json(computeMatch(resume, job));
  })
);

router.get(
  "/jobs/:jobId/candidates",
  authRequired,
  asyncHandler(async (req, res) => {
    const job = await db.jobs.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.createdBy && req.user.role === "recruiter" && job.createdBy !== req.user.id) {
      return res.status(403).json({ error: "You can only view candidates for jobs you posted" });
    }

    const allResumes = await db.resumes.all();
    const byUser = new Map();
    for (const r of allResumes) {
      const existing = byUser.get(r.userId);
      if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) byUser.set(r.userId, r);
    }
    const resumes = Array.from(byUser.values());
    // Optional ?limit= supports the realistic recruiter workload this
    // ranking engine is built for: "show me the top 20 out of N
    // applicants" without scoring/explaining every non-finalist in full.
    const limit = req.query.limit ? Math.max(1, parseInt(req.query.limit, 10)) : undefined;
    const ranked = await rankCandidates(resumes, job, { limit });

    const withNames = await Promise.all(
      ranked.map(async (r) => {
        const user = await db.users.findById(r.resume.userId);
        return { ...r, candidateName: user ? user.name : "Unknown", resume: undefined };
      })
    );
    res.json(withNames);
  })
);

router.get(
  "/skill-gap/overview",
  authRequired,
  asyncHandler(async (req, res) => {
    const resume = await latestResumeFor(req.user.id);
    const allJobs = await db.jobs.all();
    const activeJobs = allJobs.filter((j) => j.isActive !== false);
    const { demandMap, trendMap, totalActiveJobs } = computeSkillDemand(allJobs);

    // Top in-demand market skills
    const marketTrendingSkills = Object.entries(demandMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({
        skill,
        count,
        trend: trendMap[skill]?.pctChange || 0,
        trendLabel: trendMap[skill]?.label || `Required by ${count} jobs`,
      }));

    if (!resume) {
      return res.json({
        hasResume: false,
        resume: null,
        topJob: null,
        topRecommendedJobs: [],
        targetType: "market",
        missing: marketTrendingSkills.slice(0, 8).map((m) => ({ skill: m.skill, priority: "High" })),
        matched: [],
        coverage: 0,
        learningPath: buildLearningPath(marketTrendingSkills.slice(0, 5).map((m) => m.skill), { resumeSkills: [] }),
        totalActiveJobs,
        marketTrendingSkills,
        trendMap,
      });
    }

    // Compute matches to find candidate's closest aligned jobs
    const matchedJobs = activeJobs
      .map((job) => computeMatch(resume, job))
      .sort((a, b) => b.overallMatch - a.overallMatch);

    const topJobMatch = matchedJobs[0] || null;
    const topJob = topJobMatch ? activeJobs.find((j) => j.id === topJobMatch.jobId) : null;

    // Target skills: default to top matched job skills, or top market skills if no jobs
    const target = topJob?.requiredSkills?.length
      ? topJob.requiredSkills
      : marketTrendingSkills.map((m) => m.skill);

    const gap = skillGap(resume.skills || [], target, { demandMap, trendMap });
    const learningPath = buildLearningPath(gap.missing, { resumeSkills: resume.skills || [] });

    res.json({
      hasResume: true,
      resume: {
        id: resume.id,
        name: resume.name || resume.filename || "Candidate",
        score: resume.score,
        skills: resume.skills || [],
      },
      topJob: topJob
        ? {
            id: topJob.id,
            title: topJob.title,
            company: topJob.company,
            match: topJobMatch.overallMatch,
            requiredSkills: topJob.requiredSkills,
          }
        : null,
      topRecommendedJobs: matchedJobs.slice(0, 5).map((m) => {
        const j = activeJobs.find((x) => x.id === m.jobId);
        return {
          id: m.jobId,
          title: m.jobTitle,
          company: m.company,
          match: m.overallMatch,
          requiredSkills: j?.requiredSkills || [],
        };
      }),
      targetType: topJob ? "top-job" : "market",
      ...gap,
      learningPath,
      totalActiveJobs,
      marketTrendingSkills,
      trendMap,
    });
  })
);

router.post(
  "/skill-gap",
  authRequired,
  asyncHandler(async (req, res) => {
    const resume = await latestResumeFor(req.user.id);
    const resumeSkills = resume ? (resume.skills || []) : [];

    const { targetSkills, jobId, mode } = req.body || {};
    const allJobs = await db.jobs.all();
    const activeJobs = allJobs.filter((j) => j.isActive !== false);
    const { demandMap, trendMap, totalActiveJobs } = computeSkillDemand(allJobs);

    let target = targetSkills;
    let targetJob = null;

    if (!target && jobId) {
      if (!resume) {
        return res.status(404).json({ error: "Upload a resume first" });
      }
      targetJob = await db.jobs.findById(jobId);
      if (targetJob) target = targetJob.requiredSkills;
    }

    // Auto / Market mode fallback if no explicit target provided
    if ((!Array.isArray(target) || !target.length) || mode === "market") {
      if (mode === "market") {
        // Evaluate against top in-demand skills in the market
        target = Object.entries(demandMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([s]) => s);
      } else if (resume) {
        // Evaluate against student's highest matching job
        const matched = activeJobs
          .map((job) => computeMatch(resume, job))
          .sort((a, b) => b.overallMatch - a.overallMatch)[0];
        if (matched) {
          targetJob = activeJobs.find((j) => j.id === matched.jobId);
          target = targetJob?.requiredSkills;
        }
      }
    }

    if (!Array.isArray(target) || !target.length) {
      target = Object.entries(demandMap).slice(0, 8).map(([s]) => s);
    }

    const gap = skillGap(resumeSkills, target, { demandMap, trendMap });
    const learningPath = buildLearningPath(gap.missing, { resumeSkills });

    res.json({
      hasResume: !!resume,
      resume: resume
        ? {
            id: resume.id,
            name: resume.name || resume.filename || "Candidate",
            score: resume.score,
            skills: resume.skills || [],
          }
        : null,
      targetJob: targetJob ? { id: targetJob.id, title: targetJob.title, company: targetJob.company } : null,
      ...gap,
      learningPath,
      totalActiveJobs,
      trendMap,
    });
  })
);

module.exports = router;
