const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const { computeMatch, computeSkillDemand } = require("../utils/matchEngine");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function formatTimeAgo(dateStr) {
  if (!dateStr) return "Just now";
  const ms = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(ms) || ms < 0) return "Just now";
  const mins = Math.floor(ms / (1000 * 60));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

async function studentDashboard(req) {
  const myResumes = (await db.resumes.filter((r) => r.userId === req.user.id)).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const latestResume = myResumes[0] || null;

  const allJobs = await db.jobs.all();
  const jobs = allJobs.filter((j) => j.isActive !== false);
  const topMatches = latestResume
    ? jobs
        .map((job) => computeMatch(latestResume, job))
        .sort((a, b) => b.overallMatch - a.overallMatch)
        .slice(0, 5)
    : [];

  const applications = await db.applications.filter((a) => a.userId === req.user.id);
  const statusCounts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const { demandMap, trendMap } = computeSkillDemand(jobs);
  const trendingSkills = Object.entries(demandMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, count]) => ({
      skill,
      count,
      trend: trendMap[skill] || "+12%",
    }));

  const userSkills = latestResume ? latestResume.skills || [] : [];
  const userSkillsSet = new Set(userSkills.map((s) => s.toLowerCase()));

  // Compute real skill gaps based on top matches & market demand
  const missingMap = new Map();
  if (topMatches.length > 0) {
    for (const match of topMatches) {
      for (const ms of match.missingSkills || []) {
        missingMap.set(ms, (missingMap.get(ms) || 0) + 1);
      }
    }
  } else {
    // If no resume or matches, check top market skills
    for (const [sk] of Object.entries(demandMap).slice(0, 6)) {
      if (!userSkillsSet.has(sk.toLowerCase())) {
        missingMap.set(sk, 1);
      }
    }
  }

  const skillGaps = Array.from(missingMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([skill, freq]) => ({
      skill,
      demandCount: demandMap[skill] || freq,
      frequencyInTopJobs: freq,
      impact: `+${Math.min(22, Math.max(8, Math.round((freq / Math.max(1, topMatches.length || 1)) * 25)))}% match`,
    }));

  // Top Recommendation
  let topRecommendation = null;
  if (skillGaps.length > 0) {
    const topGap = skillGaps[0];
    topRecommendation = {
      skill: topGap.skill,
      title: `Improve ${topGap.skill}`,
      description: `${topGap.skill} is requested across your closest aligned roles. Building projects in ${topGap.skill} will significantly improve your match ranking.`,
      impact: topGap.impact,
    };
  } else if (latestResume) {
    topRecommendation = {
      skill: "Applications",
      title: "Strong Skill Coverage",
      description: "Your verified skills cover your target market effectively. Submit applications to your top matches to accelerate interview invites.",
      impact: "High readiness",
    };
  } else {
    topRecommendation = {
      skill: "Resume",
      title: "Upload Your Resume",
      description: "Upload a PDF or DOCX resume to extract verified skills and receive personalized ATS scores & job recommendations.",
      impact: "Initial step",
    };
  }

  // Real Skill Comparison for Chart:
  // Blend up to 4 candidate skills with top market in-demand skills
  const candidateSample = userSkills.slice(0, 4);
  const marketSample = Object.keys(demandMap)
    .filter((s) => !userSkillsSet.has(s.toLowerCase()))
    .slice(0, 3);
  const chartSkills = candidateSample.length > 0
    ? [...new Set([...candidateSample, ...marketSample])].slice(0, 6)
    : Object.keys(demandMap).slice(0, 6);

  const skillComparison = chartSkills.map((name) => {
    const has = userSkillsSet.has(name.toLowerCase());
    const count = demandMap[name] || 1;
    const demandScore = Math.min(95, Math.max(35, Math.round((count / Math.max(1, jobs.length)) * 100 * 2.2)));
    return {
      name,
      you: has ? 85 : 15,
      demand: demandScore,
      hasSkill: has,
    };
  });

  // Real Recent Activity from DB events
  const activityList = [];
  for (const app of applications) {
    const job = jobs.find((j) => j.id === app.jobId);
    activityList.push({
      icon: "💼",
      title: `Applied to ${job ? job.title : "Position"}`,
      sub: job ? `${job.company} • Stage: ${app.status}` : `Stage: ${app.status}`,
      createdAt: app.createdAt || app.appliedDate,
      bg: "#1e3a5f",
    });
  }
  for (const r of myResumes) {
    activityList.push({
      icon: "📄",
      title: "Resume Analyzed",
      sub: `ATS Score: ${r.score}/100 • ${r.skills?.length || 0} skills verified`,
      createdAt: r.createdAt,
      bg: "#1e3a4a",
    });
  }
  const currUser = await db.users.findById(req.user.id);
  if (currUser) {
    activityList.push({
      icon: "👤",
      title: "Profile Created",
      sub: `Welcome to CareerAI, ${currUser.name}!`,
      createdAt: currUser.createdAt,
      bg: "#2b1e3a",
    });
  }
  activityList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recentActivity = activityList.slice(0, 4).map((a) => ({
    ...a,
    time: formatTimeAgo(a.createdAt),
  }));

  // Dynamic Insights
  const insights = [];
  if (latestResume) {
    const completeness = Math.min(100, Math.round(50 + userSkills.length * 4));
    insights.push({
      dot: "#00d4aa",
      text: `Your profile is ${completeness}% complete`,
      pct: completeness,
      isProgress: true,
    });
    if (skillGaps.length > 0) {
      insights.push({
        dot: "#f59e0b",
        text: `Top gap: Learn ${skillGaps[0].skill} (${skillGaps[0].impact})`,
      });
    }
    if (topMatches.length > 0) {
      insights.push({
        dot: "#00d4aa",
        text: `Strongest match: ${topMatches[0].jobTitle} at ${topMatches[0].company} (${topMatches[0].overallMatch}%)`,
      });
    }
    if (applications.length === 0) {
      insights.push({
        dot: "#38bdf8",
        text: "Submit applications to high-compatibility roles to enter recruiters' active pipelines",
      });
    } else {
      insights.push({
        dot: "#a855f7",
        text: `${applications.length} active application${applications.length > 1 ? "s" : ""} currently tracked in Kanban pipeline`,
      });
    }
  } else {
    insights.push({
      dot: "#f59e0b",
      text: "Upload your resume to calculate your verified ATS score",
      pct: 25,
      isProgress: true,
    });
    insights.push({
      dot: "#00d4aa",
      text: `${jobs.length} live verified jobs waiting for profile matching`,
    });
    insights.push({
      dot: "#38bdf8",
      text: "Try the sample resume on the Resume tab for an instant preview",
    });
  }

  return {
    role: "student",
    atsScore: latestResume ? latestResume.score : null,
    skills: userSkills,
    skillsCount: userSkills.length,
    jobsAvailable: jobs.length,
    topMatches,
    applications: {
      total: applications.length,
      byStatus: statusCounts,
    },
    trendingSkills,
    skillGaps,
    topRecommendation,
    skillComparison,
    recentActivity,
    insights,
    hasResume: !!latestResume,
  };
}

async function recruiterDashboard(req) {
  const allJobs = await db.jobs.all();
  const postedByMe = allJobs.filter((j) => j.createdBy === req.user.id);
  const myJobs = postedByMe.length > 0 || req.user.role === "admin" ? (req.user.role === "admin" ? allJobs : postedByMe) : allJobs;
  const myJobIds = new Set(myJobs.map((j) => j.id));

  const allApplications = await db.applications.all();
  const myApplications = postedByMe.length > 0
    ? allApplications.filter((a) => myJobIds.has(a.jobId))
    : allApplications;

  const statusCounts = myApplications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  // One latest resume per applicant, for computing a "best current candidate
  // match" per job without a second network round-trip from the frontend.
  const allResumes = await db.resumes.all();
  const latestResumeByUser = new Map();
  for (const r of allResumes) {
    const existing = latestResumeByUser.get(r.userId);
    if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) latestResumeByUser.set(r.userId, r);
  }
  const allResumesLatest = Array.from(latestResumeByUser.values());

  const jobSummaries = myJobs
    .slice(0, 15)
    .map((job) => {
      const applicationsForJob = myApplications.filter((a) => a.jobId === job.id);
      const bestMatch = allResumesLatest.length
        ? Math.max(...allResumesLatest.map((r) => computeMatch(r, job).overallMatch))
        : null;
      return {
        id: job.id,
        title: job.title,
        company: job.company,
        applications: applicationsForJob.length,
        shortlisted: applicationsForJob.filter((a) => a.status === "Interview" || a.status === "Offer").length,
        bestCandidateMatch: bestMatch,
      };
    })
    .sort((a, b) => b.applications - a.applications);

  return {
    role: req.user.role,
    jobsPosted: postedByMe.length > 0 ? postedByMe.length : allJobs.length,
    totalApplications: myApplications.length,
    applicationsByStatus: statusCounts,
    hired: statusCounts.Offer || 0,
    jobs: jobSummaries,
  };
}

router.get(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    if (req.user.role === "recruiter" || req.user.role === "admin") {
      return res.json(await recruiterDashboard(req));
    }
    res.json(await studentDashboard(req));
  })
);

module.exports = router;
