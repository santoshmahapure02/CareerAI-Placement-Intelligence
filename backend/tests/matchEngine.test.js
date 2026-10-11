const { extractSkills, categorizeSkills } = require("../utils/skills");
const { computeMatch, applyHybridBlend, skillGap, HYBRID_WEIGHTS } = require("../utils/matchEngine");

describe("extractSkills", () => {
  it("finds canonical skills mentioned directly", () => {
    const skills = extractSkills("We use Java, React, and MySQL daily.");
    expect(skills).toEqual(expect.arrayContaining(["Java", "React", "MySQL"]));
  });

  it("normalizes aliases to canonical names", () => {
    const skills = extractSkills("Looking for someone strong in JS, Node, and k8s.");
    expect(skills).toEqual(expect.arrayContaining(["JavaScript", "Node.js", "Kubernetes"]));
  });

  it("does not false-positive on substrings", () => {
    // "C" should not match inside "Docker" or "React"
    const skills = extractSkills("We use Docker and React heavily.");
    expect(skills).not.toContain("C");
  });
});

describe("categorizeSkills (structured resume profile)", () => {
  it("groups skills into the correct categories", () => {
    const profile = categorizeSkills(["Java", "Spring Boot", "MySQL", "Docker", "React", "Git", "Machine Learning"]);
    expect(profile.programming_languages).toEqual(["Java"]);
    expect(profile.frameworks).toEqual(expect.arrayContaining(["Spring Boot", "React"]));
    expect(profile.databases).toEqual(["MySQL"]);
    expect(profile.cloud_devops).toEqual(["Docker"]);
    expect(profile.ai_ml).toEqual(["Machine Learning"]);
    expect(profile.tools_and_practices).toEqual(["Git"]);
  });

  it("puts unrecognized skills in 'other' instead of dropping them", () => {
    const profile = categorizeSkills(["SomeRandomTool"]);
    expect(profile.other).toEqual(["SomeRandomTool"]);
  });

  it("every canonical skill has exactly one category (no drops, no dupes)", () => {
    const { CANONICAL_SKILLS } = require("../utils/skills");
    const profile = categorizeSkills(CANONICAL_SKILLS);
    const totalCategorized = Object.values(profile).flat().length;
    expect(totalCategorized).toBe(CANONICAL_SKILLS.length);
    expect(profile.other).toEqual([]);
  });
});

describe("computeMatch", () => {
  const job = {
    id: 1,
    title: "Backend Engineer",
    company: "TestCo",
    description: "Java Spring Boot MySQL Docker AWS",
    requiredSkills: ["Java", "Spring Boot", "MySQL", "Docker", "AWS"],
  };

  it("scores a fully matching resume near 100", () => {
    const resume = {
      skills: ["Java", "Spring Boot", "MySQL", "Docker", "AWS"],
      experience: "Built services with Java Spring Boot MySQL Docker AWS",
      projects: "Java Spring Boot MySQL Docker AWS project",
      education: "B.Tech Computer Science",
    };
    const result = computeMatch(resume, job);
    expect(result.overallMatch).toBeGreaterThan(85);
    expect(result.missingSkills).toHaveLength(0);
  });

  it("scores a non-matching resume low", () => {
    const resume = {
      skills: ["Python", "Django"],
      experience: "Built Python services",
      projects: "Django web app",
      education: "B.Sc Mathematics",
    };
    const result = computeMatch(resume, job);
    expect(result.overallMatch).toBeLessThan(40);
    expect(result.missingSkills.length).toBeGreaterThan(0);
  });

  it("lists matched and missing skills correctly", () => {
    const resume = { skills: ["Java", "Docker"], experience: "", projects: "", education: "" };
    const result = computeMatch(resume, job);
    expect(result.matchedSkills).toEqual(expect.arrayContaining(["Java", "Docker"]));
    expect(result.missingSkills).toEqual(expect.arrayContaining(["Spring Boot", "MySQL", "AWS"]));
  });
});

describe("skillGap", () => {
  it("ranks missing skills by priority", () => {
    const gap = skillGap(["React"], ["React", "Docker", "Spring Boot", "Kafka"]);
    expect(gap.missing.map((m) => m.skill)).toEqual(expect.arrayContaining(["Docker", "Spring Boot", "Kafka"]));
    const springBoot = gap.missing.find((m) => m.skill === "Spring Boot");
    expect(springBoot.priority).toBe("High");
  });

  it("computes coverage percentage correctly", () => {
    const gap = skillGap(["React", "Node.js"], ["React", "Node.js", "Docker", "AWS"]);
    expect(gap.coverage).toBe(50);
  });
});

describe("applyHybridBlend (hybrid keyword + semantic scoring)", () => {
  const job = {
    id: 1,
    title: "Backend Engineer",
    company: "TestCo",
    description: "Java Spring Boot MySQL Docker AWS",
    requiredSkills: ["Java", "Spring Boot", "MySQL", "Docker", "AWS"],
  };
  const resume = {
    skills: ["Java", "Spring Boot", "MySQL"],
    experience: "Built services with Java Spring Boot MySQL.",
    projects: "A project using Java and Spring Boot.",
    education: "B.Tech Computer Science",
  };

  it("returns the original deterministic result unchanged when semanticSimilarity is null", () => {
    const deterministic = computeMatch(resume, job);
    const blended = applyHybridBlend(deterministic, null, resume, job);
    expect(blended).toBe(deterministic);
    expect(blended.scoringMethod).toBe("deterministic (keyword-weighted)");
  });

  it("recomputes overallMatch using hybrid weights when a semantic score is available", () => {
    const deterministic = computeMatch(resume, job);
    const blended = applyHybridBlend(deterministic, 80, resume, job);

    expect(blended.scoringMethod).toBe("hybrid (keyword + semantic)");
    expect(blended.breakdown.semantic).toBe(80);
    // Hand-computed expectation using HYBRID_WEIGHTS (0.35/0.25/0.15/0.10/0.10/0.05)
    const b = deterministic.breakdown;
    const expectedScore = Math.round(
      HYBRID_WEIGHTS.skill * b.skill +
        HYBRID_WEIGHTS.semantic * 80 +
        HYBRID_WEIGHTS.experience * b.experience +
        HYBRID_WEIGHTS.education * b.education +
        HYBRID_WEIGHTS.project * b.project +
        HYBRID_WEIGHTS.keyword * b.keyword
    );
    expect(blended.overallMatch).toBe(expectedScore);
  });

  it("does not mutate the original deterministic result object", () => {
    const deterministic = computeMatch(resume, job);
    const originalScore = deterministic.overallMatch;
    applyHybridBlend(deterministic, 90, resume, job);
    expect(deterministic.overallMatch).toBe(originalScore);
  });

  it("rebuilds the explanation to reflect the hybrid score", () => {
    const deterministic = computeMatch(resume, job);
    const blendedHigh = applyHybridBlend(deterministic, 100, resume, job);
    const blendedLow = applyHybridBlend(deterministic, 0, resume, job);
    // Same deterministic sub-scores, different semantic input -> different verdict is possible
    expect(blendedHigh.overallMatch).toBeGreaterThan(blendedLow.overallMatch);
    expect(blendedHigh.explanation).toBeDefined();
    expect(blendedLow.explanation).toBeDefined();
  });
});

describe("explainable match (buildExplanation via computeMatch)", () => {
  const job = {
    id: 1,
    title: "Backend Engineer",
    company: "TestCo",
    description: "Java Spring Boot MySQL Docker AWS",
    requiredSkills: ["Java", "Spring Boot", "MySQL", "Docker", "AWS"],
  };

  it("gives a strong verdict and cites real project text for a strong match", () => {
    const resume = {
      skills: ["Java", "Spring Boot", "MySQL", "Docker", "AWS"],
      experience: "Built services with Java Spring Boot MySQL Docker AWS at scale.",
      projects: "LEAFX: Used Java and Spring Boot with MySQL to build a backend service.",
      education: "B.Tech Computer Science",
    };
    const result = computeMatch(resume, job);
    expect(result.explanation.verdict).toMatch(/Recommended/);
    expect(result.explanation.relevantProjects.length).toBeGreaterThan(0);
    expect(result.explanation.relevantProjects[0].sentence).toContain("LEAFX");
    expect(result.explanation.categoryLabels.skill).toBe("Excellent");
  });

  it("gives a weak verdict and mentions the top missing skill for a poor match", () => {
    const resume = {
      skills: ["Python", "Django"],
      experience: "Built Python services",
      projects: "Django web app",
      education: "B.Sc Mathematics",
    };
    const result = computeMatch(resume, job);
    expect(result.explanation.verdict).toBe("Not a Strong Fit Yet");
    expect(result.explanation.summary).toMatch(/Java|Spring Boot|MySQL|Docker|AWS/);
  });

  it("never fabricates a project mention when there is no supporting text", () => {
    const resume = { skills: ["Java"], experience: "", projects: "", education: "" };
    const result = computeMatch(resume, job);
    expect(result.explanation.relevantProjects).toEqual([]);
  });
});

describe("skillGap - demand-aware priority", () => {
  const { skillGap } = require("../utils/matchEngine");

  it("ranks a skill required by many live postings as High priority even if it's not in the static list", () => {
    const demandMap = { Kafka: 12, RabbitMQ: 8, "Scikit-learn": 1 };
    const gap = skillGap([], ["Kafka", "RabbitMQ", "Scikit-learn"], { demandMap });
    const kafka = gap.missing.find((m) => m.skill === "Kafka");
    const sklearn = gap.missing.find((m) => m.skill === "Scikit-learn");
    expect(kafka.priority).toBe("High");
    expect(sklearn.priority).not.toBe("High");
  });

  it("falls back to the static heuristic when no demand data is supplied", () => {
    const gap = skillGap([], ["Spring Boot"]);
    expect(gap.missing[0].priority).toBe("High");
  });
});

describe("buildLearningPath - dependency-aware recommendation engine", () => {
  const { buildLearningPath, skillGap } = require("../utils/matchEngine");

  it("schedules a prerequisite before the skill that needs it", () => {
    const gap = skillGap([], ["Kubernetes"]);
    const path = buildLearningPath(gap.missing, { resumeSkills: [] });
    const dockerStep = path.find((p) => p.skill === "Docker");
    const k8sStep = path.find((p) => p.skill === "Kubernetes");
    expect(dockerStep).toBeDefined();
    expect(dockerStep.week).toBeLessThan(k8sStep.week);
  });

  it("does not re-add a prerequisite the candidate already has on their resume", () => {
    const gap = skillGap(["Docker"], ["Kubernetes"]);
    const path = buildLearningPath(gap.missing, { resumeSkills: ["Docker"] });
    expect(path.find((p) => p.skill === "Docker")).toBeUndefined();
    expect(path.find((p) => p.skill === "Kubernetes")).toBeDefined();
  });

  it("gives every step a human-readable reason", () => {
    const gap = skillGap([], ["React", "Docker"]);
    const path = buildLearningPath(gap.missing, { resumeSkills: [] });
    for (const step of path) {
      expect(typeof step.reason).toBe("string");
      expect(step.reason.length).toBeGreaterThan(0);
    }
  });

  it("produces a valid topological order for a multi-level dependency chain", () => {
    // Spring Security depends on Spring Boot depends on Java (no prereq listed for Java)
    const gap = skillGap([], ["Spring Security"]);
    const path = buildLearningPath(gap.missing, { resumeSkills: [] });
    const order = path.map((p) => p.skill);
    expect(order.indexOf("Spring Boot")).toBeLessThan(order.indexOf("Spring Security"));
  });
});
