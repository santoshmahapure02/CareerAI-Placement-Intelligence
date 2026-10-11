process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

const {
  assessResumeWithAI,
  classifyPersonaAndSeniority,
  computeAtsScorecard,
  predictRoleCompatibility,
  auditActionVerbs,
  generateSmartBulletRewrites,
  generateActionPlan,
} = require("../utils/aiResumeModel");

describe("AI Resume Assessment Model", () => {
  const sampleTechResume = {
    name: "Santosh Kumar",
    email: "santosh@careerai.dev",
    phone: "+91 98765 43210",
    skills: ["Java", "Spring Boot", "MySQL", "React", "Docker", "REST API", "Git", "Redis", "Microservices"],
    experience: `
      Software Engineer - Tech Corp (2022 - Present)
      - Architected and engineered high-performance REST APIs using Java and Spring Boot.
      - Optimized database queries in MySQL, reducing average query response time by 30%.
      - Automated CI/CD deployment pipelines using Docker and Git, handling 15,000+ daily requests.
    `,
    projects: `
      Distributed Task Dispatcher
      - Implemented a message queuing service using Redis and Spring Boot with 99.9% uptime.
    `,
    education: "B.Tech Computer Science and Engineering, 2022.",
    metrics: ["reducing average query response time by 30%", "handling 15,000+ daily requests", "99.9% uptime"],
  };

  it("classifies candidate persona and seniority accurately", () => {
    const classification = classifyPersonaAndSeniority(sampleTechResume);
    expect(classification.archetype).toBeDefined();
    expect(["backend", "full_stack"]).toContain(classification.archetype.id);
    expect(classification.seniority).toBeDefined();
    expect(classification.confidence).toBeGreaterThanOrEqual(60);
  });

  it("computes 6-vector ATS scorecard with weighted composite score", () => {
    const scorecard = computeAtsScorecard(sampleTechResume, sampleTechResume.experience);
    expect(scorecard.compositeScore).toBeGreaterThan(50);
    expect(scorecard.letterGrade).toBeDefined();
    expect(scorecard.vectors).toHaveProperty("technicalDepth");
    expect(scorecard.vectors).toHaveProperty("metricsDensity");
    expect(scorecard.vectors).toHaveProperty("actionVerbPower");
    expect(scorecard.vectors).toHaveProperty("structuralBalance");
    expect(scorecard.vectors).toHaveProperty("readabilityAndBrevity");
    expect(scorecard.vectors).toHaveProperty("marketAlignment");
    expect(scorecard.strongVerbsCount).toBeGreaterThan(0);
  });

  it("predicts role compatibility across 6 canonical software disciplines", () => {
    const roles = predictRoleCompatibility(sampleTechResume);
    expect(roles.length).toBe(6);
    expect(roles[0].matchScore).toBeGreaterThan(roles[roles.length - 1].matchScore);
    expect(roles[0]).toHaveProperty("roleTitle");
    expect(roles[0]).toHaveProperty("matchedPrimary");
    expect(roles[0]).toHaveProperty("missingPrimary");
  });

  it("audits action verbs and flags weak or passive phrases", () => {
    const textWithWeak = "Worked on API development and helped with frontend integration. Also made some database queries.";
    const audit = auditActionVerbs(textWithWeak);
    expect(audit.weakPhrasesFlagged.length).toBeGreaterThan(0);
    expect(audit.weakPhrasesFlagged.some(w => w.suggestedReplacement.includes("Engineered") || w.suggestedReplacement.includes("Constructed"))).toBe(true);
  });

  it("generates Google XYZ formula bullet point rewrites", () => {
    const rewrites = generateSmartBulletRewrites(sampleTechResume.experience, sampleTechResume.projects);
    expect(rewrites.length).toBeGreaterThanOrEqual(2);
    expect(rewrites[0]).toHaveProperty("original");
    expect(rewrites[0]).toHaveProperty("improved");
    expect(rewrites[0]).toHaveProperty("formulaApplied");
    expect(rewrites[0]).toHaveProperty("rationale");
  });

  it("generates a prioritized 5-step action plan", () => {
    const scorecard = computeAtsScorecard(sampleTechResume, sampleTechResume.experience);
    const roles = predictRoleCompatibility(sampleTechResume);
    const plan = generateActionPlan(scorecard, roles, []);
    expect(plan.length).toBe(5);
    expect(plan[0].priority).toBeDefined();
    expect(plan[0].timeframe).toBeDefined();
  });

  it("runs master assessResumeWithAI on text and returns unified assessment", async () => {
    const result = await assessResumeWithAI(`
      Santosh Kumar | santosh@careerai.dev | +91 9876543210
      Skills: Java, Spring Boot, MySQL, Docker, React, REST API, Git
      Experience:
      Software Developer Intern at Cloud Systems
      - Engineered REST APIs using Java Spring Boot.
      - Optimized SQL database response times by 25%.
      - Collaborated with 5 engineers in Agile sprints.
    `);

    expect(result.version).toBe("1.0-ai-deep-eval");
    expect(result.persona).toBeDefined();
    expect(result.scorecard.compositeScore).toBeGreaterThan(0);
    expect(result.roleMatches.length).toBe(6);
    expect(result.bulletRewrites.length).toBeGreaterThan(0);
    expect(result.actionPlan.length).toBe(5);
    expect(result.executiveVerdict).toBeTruthy();
  });
});
