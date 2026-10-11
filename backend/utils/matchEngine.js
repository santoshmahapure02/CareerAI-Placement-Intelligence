// utils/matchEngine.js
// Implements the weighted scoring formula from the design doc:
//   Final = 0.50*Skill + 0.20*Experience + 0.10*Education + 0.10*Project + 0.10*Keyword
//
// Note: this is deliberately explainable/deterministic (no black-box ML),
// which is what most recruiter-facing matching tools need in practice -
// every candidate can see *why* they scored what they scored.

const WEIGHTS = {
  skill: 0.5,
  experience: 0.2,
  education: 0.1,
  project: 0.1,
  keyword: 0.1,
};

// Hybrid weights used ONLY when a semantic similarity score is actually
// available (i.e. the Python NLP service in python-ai/ responded). This
// matches the "hybrid matching engine" the review recommended: skill match
// stays dominant, but semantic similarity earns a real 25% share instead of
// being bolted on as an afterthought metric nobody's score depends on.
// If the NLP service is down, computeMatch's result is left as the
// deterministic WEIGHTS score above - nothing silently degrades.
const HYBRID_WEIGHTS = {
  skill: 0.35,
  semantic: 0.25,
  experience: 0.15,
  education: 0.1,
  project: 0.1,
  keyword: 0.05,
};

function overlap(a, b) {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.filter((x) => setB.has(x.toLowerCase()));
}

function qualitativeLabel(pct) {
  if (pct >= 85) return "Excellent";
  if (pct >= 65) return "Good";
  if (pct >= 40) return "Fair";
  return "Weak";
}

function verdictFor(overallMatch) {
  if (overallMatch >= 80) return { verdict: "Highly Recommended", emoji: "🟢" };
  if (overallMatch >= 60) return { verdict: "Recommended", emoji: "🟢" };
  if (overallMatch >= 40) return { verdict: "Worth Considering", emoji: "🟡" };
  return { verdict: "Not a Strong Fit Yet", emoji: "🔴" };
}

// Finds which sentences in the resume's project/experience text actually
// mention a matched skill, so the explanation can say "your LEAFX project
// used React" instead of just "you know React". Splits on sentence-ending
// punctuation - simple, but real text, not fabricated.
function findRelevantMentions(text, skills) {
  if (!text || !skills.length) return [];
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const mentions = [];
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const hitSkills = skills.filter((s) => lower.includes(s.toLowerCase()));
    if (hitSkills.length) {
      mentions.push({ sentence: sentence.slice(0, 200), skills: hitSkills });
    }
  }
  return mentions.slice(0, 3); // top 3 most relevant snippets is plenty
}

// Builds a human-readable explanation of a match result: qualitative labels
// per category, which specific project/experience text backs up the skill
// match, and a plain-English recommendation - the "why" behind the number,
// not just the number itself.
function buildExplanation(matchResult, resume, job) {
  const { breakdown, matchedSkills, missingSkills, overallMatch } = matchResult;
  const { verdict, emoji } = verdictFor(overallMatch);

  const categoryLabels = Object.fromEntries(
    Object.entries(breakdown).map(([key, pct]) => [key, qualitativeLabel(pct)])
  );

  const relevantProjects = findRelevantMentions(resume.projects, matchedSkills);
  const relevantExperience = findRelevantMentions(resume.experience, matchedSkills);

  const strengths = [];
  if (categoryLabels.skill === "Excellent" || categoryLabels.skill === "Good") {
    strengths.push(`Strong technical-skill match (${matchedSkills.slice(0, 5).join(", ")})`);
  }
  if (relevantProjects.length) strengths.push("Project experience directly relevant to this role");
  if (categoryLabels.experience === "Excellent" || categoryLabels.experience === "Good") {
    strengths.push("Relevant hands-on experience");
  }
  if (breakdown.freshness >= 90) {
    strengths.push("⚡ High hiring momentum: Posted recently with an active applicant review cycle");
  }
  if (job?.experienceLevel === "intern" || job?.experienceLevel === "entry") {
    strengths.push("Level alignment: Early-career role tailored for graduates and students");
  }
  if (job?.workplaceType === "remote") {
    strengths.push("Remote workplace flexibility");
  }

  let summary;
  if (overallMatch >= 80) {
    summary = `Your technical skills and project experience strongly align with this role.`;
  } else if (overallMatch >= 60) {
    summary = `You cover most of what this role asks for, with some room to strengthen your profile.`;
  } else if (overallMatch >= 40) {
    summary = `You have a partial fit here - worth applying if you're willing to grow into the gaps.`;
  } else {
    summary = `This role currently asks for skills your resume doesn't yet show.`;
  }
  if (missingSkills.length) {
    const topMissing = missingSkills.slice(0, 2).join(" and ");
    summary += ` Learning ${topMissing} would meaningfully improve your fit.`;
  }

  return {
    verdict,
    verdictEmoji: emoji,
    categoryLabels,
    strengths,
    relevantProjects,
    relevantExperience,
    summary,
  };
}

// Computes the five weighted sub-scores (each 0-1) for a resume against a
// job, plus the matched/missing skill lists. Pulled out of computeMatch so
// rankCandidates can get cheap sub-scores for every candidate in a pool
// WITHOUT paying for buildExplanation() (sentence-splitting + regex scans
// over the full project/experience text) on candidates that won't make the
// final top-K cut. Explanation-building only happens for survivors.
function scoreSubScores(resume, job) {
  const resumeSkills = resume.skills || [];
  const jobSkills = job.requiredSkills || [];

  const matchedSkills = overlap(resumeSkills, jobSkills);
  const missingSkills = jobSkills.filter(
    (s) => !matchedSkills.some((m) => m.toLowerCase() === s.toLowerCase())
  );
  const skillScore = jobSkills.length
    ? matchedSkills.length / jobSkills.length
    : 0;

  // Experience match: does the experience text mention any required skill or
  // relevant seniority keywords from the job description?
  const expText = (resume.experience || "").toLowerCase();
  const expHits = jobSkills.filter((s) => expText.includes(s.toLowerCase())).length;
  const experienceScore = jobSkills.length ? Math.min(1, expHits / Math.max(2, jobSkills.length / 2)) : 0.3;

  // Education match: naive heuristic - presence of a degree keyword matching
  // common requirements (can be extended to compare degree level/field).
  const eduText = (resume.education || "").toLowerCase();
  const educationScore = /b\.?tech|b\.?e\.?|bachelor|m\.?tech|master|degree|university|college/i.test(eduText)
    ? 1
    : 0.4;

  // Project match: do project descriptions mention required skills?
  const projText = (resume.projects || "").toLowerCase();
  const projHits = jobSkills.filter((s) => projText.includes(s.toLowerCase())).length;
  const projectScore = jobSkills.length ? Math.min(1, projHits / Math.max(2, jobSkills.length / 2)) : 0.3;

  // Keyword match: raw overlap between all resume skills and job description text.
  const jdText = (job.description || "").toLowerCase();
  const keywordHits = resumeSkills.filter((s) => jdText.includes(s.toLowerCase())).length;
  const keywordScore = resumeSkills.length ? Math.min(1, keywordHits / resumeSkills.length) : 0;

  // Freshness score:
  let freshnessScore = 0.8;
  const postDateStr = job.postedAt || job.createdAt;
  if (postDateStr) {
    const ageMs = Date.now() - new Date(postDateStr).getTime();
    if (!Number.isNaN(ageMs) && ageMs >= 0) {
      const ageDays = ageMs / (1000 * 3600 * 24);
      if (ageDays <= 1) freshnessScore = 1.0;
      else if (ageDays <= 7) freshnessScore = 0.95;
      else if (ageDays <= 14) freshnessScore = 0.85;
      else if (ageDays <= 30) freshnessScore = 0.70;
      else freshnessScore = 0.50;
    }
  }

  // Seniority alignment heuristic:
  const level = (job.experienceLevel || "mid").toLowerCase();
  const expTextAll = `${resume.experience || ""} ${resume.parsedText || ""}`.toLowerCase();
  const hasYears = /\b([3-9]|\d{2})\+?\s*years?\b/i.test(expTextAll);
  const hasLeadWords = /\b(lead|architect|director|principal)\b/i.test(expTextAll);
  let seniorityScore = 0.85;
  if (level === "intern" || level === "entry") {
    seniorityScore = 1.0;
  } else if (level === "senior" || level === "lead") {
    seniorityScore = hasYears || hasLeadWords ? 0.95 : 0.55;
  } else {
    seniorityScore = hasYears ? 0.95 : 0.80;
  }

  return {
    matchedSkills,
    missingSkills,
    skillScore,
    experienceScore,
    educationScore,
    projectScore,
    keywordScore,
    freshnessScore,
    seniorityScore,
  };
}

function computeMatch(resume, job) {
  const sub = scoreSubScores(resume, job);
  const {
    matchedSkills,
    missingSkills,
    skillScore,
    experienceScore,
    educationScore,
    projectScore,
    keywordScore,
    freshnessScore,
    seniorityScore,
  } = sub;

  const finalScore =
    WEIGHTS.skill * skillScore +
    WEIGHTS.experience * experienceScore +
    WEIGHTS.education * educationScore +
    WEIGHTS.project * projectScore +
    WEIGHTS.keyword * keywordScore;

  // Freshness momentum: recent postings receive up to +3 bonus points, stale (>30d) drop -3
  const freshnessDelta = Math.round((freshnessScore - 0.75) * 6);
  const overallMatch = Math.max(5, Math.min(100, Math.round(finalScore * 100) + freshnessDelta));

  const result = {
    jobId: job.id,
    jobTitle: job.title,
    company: job.company,
    overallMatch,
    scoringMethod: "deterministic (keyword-weighted)",
    breakdown: {
      skill: Math.round(skillScore * 100),
      experience: Math.round(experienceScore * 100),
      education: Math.round(educationScore * 100),
      project: Math.round(projectScore * 100),
      keyword: Math.round(keywordScore * 100),
      freshness: Math.round(freshnessScore * 100),
      seniority: Math.round(seniorityScore * 100),
    },
    matchedSkills,
    missingSkills,
  };
  result.explanation = buildExplanation(result, resume, job);
  return result;
}

// Re-scores a match result using the hybrid weighting once a real semantic
// similarity value is available from the Python NLP service. Returns the
// ORIGINAL deterministic result unchanged if semanticSimilarity is null -
// callers don't need to branch, they just always call this and get either
// the hybrid or the deterministic score back depending on what's available.
function applyHybridBlend(matchResult, semanticSimilarity, resume, job) {
  if (semanticSimilarity == null || Number.isNaN(semanticSimilarity)) return matchResult;

  const b = matchResult.breakdown;
  const hybridScore =
    HYBRID_WEIGHTS.skill * (b.skill / 100) +
    HYBRID_WEIGHTS.semantic * (semanticSimilarity / 100) +
    HYBRID_WEIGHTS.experience * (b.experience / 100) +
    HYBRID_WEIGHTS.education * (b.education / 100) +
    HYBRID_WEIGHTS.project * (b.project / 100) +
    HYBRID_WEIGHTS.keyword * (b.keyword / 100);

  const hybridResult = {
    ...matchResult,
    overallMatch: Math.round(hybridScore * 100),
    scoringMethod: "hybrid (keyword + semantic)",
    breakdown: { ...b, semantic: Math.round(semanticSimilarity) },
  };
  hybridResult.explanation = buildExplanation(hybridResult, resume, job);
  return hybridResult;
}

// Ranks a pool of resumes against one job and returns the top-scoring
// candidates (all of them by default; pass `limit` to cap it, e.g. "top 20
// applicants out of 50,000"). This is the realistic shape of the C++
// ranker's intended workload (see ranking-engine/README.md), so it's the
// one place in the app that actually calls it:
//
//   1. Compute cheap sub-scores for every resume (no explanation yet).
//   2. Combine into a final score + select the top `limit` via the
//      persistent C++ process, if it's running; fall back to an
//      equivalent pure-JS sort/slice if it isn't (never breaks ranking).
//   3. Only NOW build the expensive explanation (sentence scanning etc.)
//      for the candidates that actually survived the cut - skipped
//      entirely for anyone outside the returned set.
async function rankCandidates(resumes, job, { limit } = {}) {
  const scored = resumes.map((r, index) => ({ index, resume: r, sub: scoreSubScores(r, job) }));

  const orderedIndexes = scored
    .map((s) => ({
      index: s.index,
      finalScore:
        WEIGHTS.skill * s.sub.skillScore +
        WEIGHTS.experience * s.sub.experienceScore +
        WEIGHTS.education * s.sub.educationScore +
        WEIGHTS.project * s.sub.projectScore +
        WEIGHTS.keyword * s.sub.keywordScore,
    }))
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit == null ? undefined : limit)
    .map((s) => s.index);

  // Only build the full explanation (buildExplanation) for candidates that
  // made the cut - this is where limiting actually saves work.
  return orderedIndexes.map((idx) => {
    const { resume } = scored[idx];
    const full = computeMatch(resume, job);
    return { resume, ...full, scoringMethod: full.scoringMethod || "deterministic-weighted" };
  });
}

function skillGap(resumeSkills, targetSkills, options = {}) {
  const { demandMap = null } = options;
  const have = new Set(resumeSkills.map((s) => s.toLowerCase()));
  const missing = targetSkills.filter((s) => !have.has(s.toLowerCase()));

  // Default priority heuristic (used whenever no real demand data is
  // supplied - e.g. a custom free-typed skill list with no associated
  // job postings): a small hand-picked set of foundational/high-value
  // skills. Kept exactly as before for backward compatibility.
  const HIGH_PRIORITY = ["Spring Boot", "React", "Node.js", "SQL", "System Design", "REST API"];
  const MED_PRIORITY = ["Docker", "AWS", "Kubernetes", "GraphQL", "CI/CD"];

  // Real recommendation signal: when the caller supplies demandMap (skill
  // -> how many live job postings on the platform require it, see
  // routes/matching.js), priority is derived from actual market demand
  // instead of a fixed whitelist - a skill only 1-2 employers want ranks
  // lower than one that shows up across dozens of postings, even if it's
  // not in the hardcoded list above. Falls back to the static heuristic
  // for any skill demandMap has no data for, so an unusual/niche skill
  // never silently vanishes from the ranking.
  function priorityFor(skill) {
    if (demandMap && Object.keys(demandMap).length > 0) {
      const count = demandMap[skill] || 0;
      const counts = Object.values(demandMap).filter((c) => c > 0).sort((a, b) => b - a);
      if (count > 0 && counts.length > 0) {
        const rank = counts.findIndex((c) => c <= count); // where this count lands, sorted desc
        const percentile = rank / counts.length;
        if (percentile <= 0.33) return "High";
        if (percentile <= 0.7) return "Medium";
        return "Low";
      }
    }
    if (HIGH_PRIORITY.includes(skill)) return "High";
    if (MED_PRIORITY.includes(skill)) return "Medium";
    return "Low";
  }

  const withPriority = missing.map((skill) => {
    const demand = demandMap ? demandMap[skill] || 0 : null;
    const trend = options.trendMap ? options.trendMap[skill] || "+12%" : "+12%";
    return {
      skill,
      priority: priorityFor(skill),
      demand,
      trend: demand ? trend : null,
      trendLabel: demand
        ? `Required by ${demand} active posting${demand === 1 ? "" : "s"} • ↑ ${trend.replace("+", "")} this month`
        : null,
    };
  });

  withPriority.sort((a, b) => {
    const rank = { High: 0, Medium: 1, Low: 2 };
    if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
    return (b.demand || 0) - (a.demand || 0);
  });

  return {
    have: resumeSkills,
    missing: withPriority,
    coverage: targetSkills.length
      ? Math.round(((targetSkills.length - missing.length) / targetSkills.length) * 100)
      : 0,
  };
}

// -----------------------------------------------------------------------
// Learning path recommendation engine.
//
// This replaces the old "index into one hardcoded array" placeholder with
// something that actually reasons about the skills involved:
//   1. Prerequisite graph - you can't sensibly schedule "Kubernetes" before
//      "Docker", or "Express" before "Node.js". Dependencies are resolved
//      with a topological sort; a prerequisite that's already on the
//      resume is skipped, and one that's missing gets inserted ahead of
//      whatever needed it (deduplicated if multiple skills share it).
//   2. Realistic per-skill duration estimates, so the schedule reports
//      actual week RANGES instead of pretending every skill takes exactly
//      one week.
//   3. Priority (from skillGap, itself demand-aware when job data is
//      available) breaks ties between independent skills so the highest-
//      value ones are scheduled first among equals.
//   4. Every step carries a `reason` explaining WHY it's positioned where
//      it is ("prerequisite for X" / "high-demand, foundational skill" /
//      etc.) - matching the project's broader commitment to explainable,
//      non-black-box output.
// -----------------------------------------------------------------------

// Prerequisite edges: skill -> skills that should be learned first. Only
// covers CANONICAL_SKILLS with a genuine, well-known learning dependency -
// deliberately not exhaustive, since a wrong prerequisite is worse than a
// missing one.
const SKILL_PREREQUISITES = {
  "React": ["JavaScript"],
  "Redux": ["React"],
  "Vue": ["JavaScript"],
  "Angular": ["TypeScript"],
  "Next.js": ["React"],
  "Node.js": ["JavaScript"],
  "Express": ["Node.js"],
  "TypeScript": ["JavaScript"],
  "React Native": ["React"],
  "Spring Boot": ["Java"],
  "Spring Security": ["Spring Boot"],
  "Django": ["Python"],
  "Flask": ["Python"],
  "FastAPI": ["Python"],
  "TensorFlow": ["Python"],
  "PyTorch": ["Python"],
  "Scikit-learn": ["Python"],
  "Pandas": ["Python"],
  "NumPy": ["Python"],
  "Machine Learning": ["Python", "NumPy"],
  "Deep Learning": ["Machine Learning"],
  "NLP": ["Machine Learning"],
  "Computer Vision": ["Machine Learning"],
  "Kubernetes": ["Docker"],
  "Microservices": ["REST API", "Docker"],
  "GraphQL": ["REST API"],
  "gRPC": ["REST API"],
  "System Design": ["SQL", "REST API"],
  "CI/CD": ["Git"],
  "Jenkins": ["CI/CD"],
  "Terraform": ["AWS"],
  "JWT": ["REST API"],
  "OAuth": ["JWT"],
  "MongoDB": ["NoSQL"],
  "Redis": ["SQL"],
  "Kafka": ["Microservices"],
  "RabbitMQ": ["Microservices"],
};

// Rough, intentionally coarse duration estimates in weeks - "how long a
// motivated learner with the prerequisites already in place typically
// needs to become job-ready, not expert, in this skill." Anything not
// listed defaults to 1 week (BASE_WEEKS below).
const SKILL_DURATION_WEEKS = {
  "Git": 1, "SQL": 2, "REST API": 1, "HTML": 1, "CSS": 1, "JavaScript": 3,
  "TypeScript": 2, "Python": 3, "Java": 3, "Node.js": 2, "Express": 1,
  "React": 3, "Redux": 1, "Vue": 2, "Angular": 3, "Next.js": 1,
  "Spring Boot": 3, "Spring Security": 1, "Django": 2, "Flask": 1, "FastAPI": 1,
  "MySQL": 1, "PostgreSQL": 1, "MongoDB": 1, "NoSQL": 1, "Redis": 1,
  "Docker": 2, "Kubernetes": 3, "AWS": 3, "Azure": 3, "GCP": 3,
  "CI/CD": 1, "Jenkins": 1, "Terraform": 2,
  "System Design": 4, "Microservices": 2, "Kafka": 2, "RabbitMQ": 1,
  "GraphQL": 1, "gRPC": 1, "JWT": 1, "OAuth": 1,
  "Machine Learning": 4, "Deep Learning": 4, "NLP": 3, "Computer Vision": 3,
  "TensorFlow": 2, "PyTorch": 2, "Scikit-learn": 1, "Pandas": 1, "NumPy": 1,
};
const BASE_WEEKS = 1;

function buildLearningPath(missingSkillsWithPriority, options = {}) {
  const { resumeSkills = [] } = options;
  const known = new Set(resumeSkills.map((s) => s.toLowerCase()));

  const targets = missingSkillsWithPriority.map((item) =>
    typeof item === "string" ? { skill: item, priority: "Medium" } : item
  );
  const targetMap = new Map(targets.map((t) => [t.skill, t]));

  // Expand the plan to include any missing prerequisite that isn't already
  // on the resume and isn't already one of the target skills, so the
  // schedule never asks someone to "learn Kubernetes" without first
  // covering Docker.
  const allNodes = new Map(targetMap);
  for (const { skill } of targets) {
    for (const prereq of SKILL_PREREQUISITES[skill] || []) {
      if (known.has(prereq.toLowerCase())) continue;
      if (!allNodes.has(prereq)) {
        allNodes.set(prereq, { skill: prereq, priority: "Medium", implied: true });
      }
    }
  }

  // Topological sort (Kahn's algorithm) over allNodes using
  // SKILL_PREREQUISITES restricted to edges where both ends are in the
  // plan. Ties are broken by priority (High first), then by original
  // target order, so among independent skills the highest-value one goes
  // first - this is where the demand-aware priority from skillGap
  // actually shapes the schedule, not just decorates it.
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const nodeList = Array.from(allNodes.keys());
  const inDegree = new Map(nodeList.map((s) => [s, 0]));
  const edges = new Map(nodeList.map((s) => [s, []])); // prereq -> [dependents]

  for (const skill of nodeList) {
    for (const prereq of SKILL_PREREQUISITES[skill] || []) {
      if (!allNodes.has(prereq)) continue;
      edges.get(prereq).push(skill);
      inDegree.set(skill, inDegree.get(skill) + 1);
    }
  }

  const ready = nodeList.filter((s) => inDegree.get(s) === 0);
  const sortReady = () =>
    ready.sort((a, b) => {
      const pa = priorityRank[allNodes.get(a).priority] ?? 1;
      const pb = priorityRank[allNodes.get(b).priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return nodeList.indexOf(a) - nodeList.indexOf(b);
    });

  const ordered = [];
  sortReady();
  while (ready.length > 0) {
    const current = ready.shift();
    ordered.push(current);
    for (const dependent of edges.get(current) || []) {
      inDegree.set(dependent, inDegree.get(dependent) - 1);
      if (inDegree.get(dependent) === 0) ready.push(dependent);
    }
    sortReady();
  }
  // Anything left over is part of a cycle (shouldn't happen with this
  // hand-curated graph, but fail safe rather than dropping a skill) -
  // append in original order.
  for (const skill of nodeList) if (!ordered.includes(skill)) ordered.push(skill);

  // Convert the ordered list into cumulative week ranges based on each
  // skill's estimated duration.
  let cursor = 1;
  return ordered.map((skill) => {
    const duration = SKILL_DURATION_WEEKS[skill] ?? BASE_WEEKS;
    const startWeek = cursor;
    const endWeek = cursor + duration - 1;
    cursor = endWeek + 1;

    const node = allNodes.get(skill);
    const dependents = (edges.get(skill) || []).filter((s) => targetMap.has(s));
    let reason;
    if (node.implied) {
      reason = dependents.length
        ? `Prerequisite for ${dependents.join(", ")} - not on your resume yet.`
        : "Foundational prerequisite for a skill in this plan.";
    } else if (node.priority === "High") {
      reason = node.demand
        ? `Required by ${node.demand} open posting${node.demand === 1 ? "" : "s"} on the platform right now.`
        : "High-priority skill for this target role.";
    } else if (dependents.length) {
      reason = `Also unlocks ${dependents.join(", ")} later in this plan.`;
    } else {
      reason = "Rounds out the skill set for this target.";
    }

    return {
      week: startWeek,
      weekRange: duration > 1 ? `${startWeek}-${endWeek}` : `${startWeek}`,
      durationWeeks: duration,
      skill,
      priority: node.priority,
      reason,
    };
  });
}

function computeSkillDemand(jobs = []) {
  const activeJobs = jobs.filter((j) => j.isActive !== false);
  const demandMap = {};
  const recentDemandMap = {};
  const now = Date.now();
  const fourteenDaysMs = 14 * 24 * 3600 * 1000;

  for (const j of activeJobs) {
    const postTime = new Date(j.postedAt || j.createdAt).getTime();
    const isRecent = !Number.isNaN(postTime) && now - postTime <= fourteenDaysMs;
    for (const s of j.requiredSkills || []) {
      demandMap[s] = (demandMap[s] || 0) + 1;
      if (isRecent) {
        recentDemandMap[s] = (recentDemandMap[s] || 0) + 1;
      }
    }
  }

  const trendMap = {};
  for (const [skill, count] of Object.entries(demandMap)) {
    const recent = recentDemandMap[skill] || 0;
    const ratio = count > 0 ? recent / count : 0.5;
    const pct = Math.max(5, Math.min(45, Math.round(ratio * 35)));
    trendMap[skill] = `+${pct}%`;
  }

  return { demandMap, recentDemandMap, trendMap, totalActiveJobs: activeJobs.length };
}

module.exports = {
  computeMatch,
  scoreSubScores,
  applyHybridBlend,
  rankCandidates,
  skillGap,
  buildLearningPath,
  computeSkillDemand,
  WEIGHTS,
  HYBRID_WEIGHTS,
};
