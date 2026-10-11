const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { validateBody, applicationSchema } = require("../utils/validation");

const router = express.Router();

const STATUSES = ["Applied", "Assessment", "Interview", "Offer", "Rejected"];

router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    let targetApps = [];
    const isRecruiterOrAdmin = req.user.role === "recruiter" || req.user.role === "admin";

    if (isRecruiterOrAdmin) {
      // Recruiter or admin sees applications in their hiring pipeline
      const allJobs = await db.jobs.all();
      const myJobs = req.user.role === "admin"
        ? allJobs
        : allJobs.filter((j) => Number(j.createdBy) === Number(req.user.id));
      const myJobIds = new Set(myJobs.map((j) => Number(j.id)));

      const allApps = await db.applications.all();
      // If recruiter has specific posted jobs, show those; otherwise show all platform applications
      targetApps = myJobIds.size > 0
        ? allApps.filter((a) => myJobIds.has(Number(a.jobId)))
        : allApps;
    } else {
      // Student: only their own applications
      targetApps = await db.applications.filter((a) => Number(a.userId) === Number(req.user.id));
    }

    const populated = await Promise.all(
      targetApps.map(async (a) => {
        const job = await db.jobs.findById(a.jobId);

        // Populate applicant information for recruiters and pipeline analytics
        let applicant = null;
        if (isRecruiterOrAdmin || a.userId === req.user.id) {
          const applicantUser = await db.users.findById(a.userId);
          const resumes = await db.resumes.filter((r) => r.userId === a.userId);
          const latestResume = resumes.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))[0] || null;

          applicant = applicantUser
            ? {
                id: applicantUser.id,
                name: applicantUser.name,
                email: applicantUser.email,
                role: applicantUser.role,
                score: latestResume?.score || null,
                skills: latestResume?.skills || [],
                filename: latestResume?.filename || null,
              }
            : null;
        }

        return {
          ...a,
          applicant,
          job: job
            ? {
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location || "Remote",
                workplaceType: job.workplaceType || "remote",
                salary: job.salary || "Competitive",
                source: job.source || "direct",
                requiredSkills: job.requiredSkills || [],
              }
            : null,
        };
      })
    );

    populated.sort((a, b) => new Date(b.createdAt || b.appliedDate) - new Date(a.createdAt || a.appliedDate));
    res.json(populated);
  })
);

router.post(
  "/",
  authRequired,
  validateBody(applicationSchema),
  asyncHandler(async (req, res) => {
    const { jobId, status } = req.body;
    const job = await db.jobs.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Prevent duplicate applications - a student applying to the same job
    // twice should get a clear message, not a second silent row.
    const existing = await db.applications.find(
      (a) => a.userId === req.user.id && a.jobId === Number(jobId)
    );
    if (existing) {
      return res.status(409).json({ error: "You have already applied for this position." });
    }

    try {
      const app = await db.applications.insert({
        userId: req.user.id,
        jobId: Number(jobId),
        status: STATUSES.includes(status) ? status : "Applied",
        appliedDate: new Date().toISOString(),
      });
      res.status(201).json(app);
    } catch (err) {
      // Backstop for the MySQL unique constraint (uniq_user_job) in case of
      // a race between two concurrent requests slipping past the check above.
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "You have already applied for this position." });
      }
      throw err;
    }
  })
);

router.put(
  "/:id/status",
  authRequired,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of ${STATUSES.join(", ")}` });
    }
    const app = await db.applications.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found" });

    // Both recruiters/admins and the applying student can update/progress status
    const isStaff = req.user.role === "recruiter" || req.user.role === "admin";
    if (!isStaff && app.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to update this application" });
    }

    const updated = await db.applications.update(req.params.id, { 
      status,
      updatedAt: new Date().toISOString()
    });
    res.json(updated);
  })
);

router.delete(
  "/:id",
  authRequired,
  asyncHandler(async (req, res) => {
    const app = await db.applications.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found" });
    
    const isStaff = req.user.role === "recruiter" || req.user.role === "admin";
    if (!isStaff && app.userId !== req.user.id) {
      return res.status(403).json({ error: "Unauthorized to delete this application" });
    }

    await db.applications.remove(req.params.id);
    res.status(204).end();
  })
);

module.exports = router;
