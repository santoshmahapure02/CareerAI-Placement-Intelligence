const {
  stripHtml,
  inferWorkplaceType,
  inferExperienceLevel,
  inferJobType,
  getFallbackJobs,
  syncAllJobs,
  getLastSyncStatus,
} = require("../utils/jobIngestion");
const db = require("../db");

describe("jobIngestion helpers", () => {
  it("strips HTML tags and entities cleanly", () => {
    const raw = "<p>Looking for a <strong>Java Developer</strong> &amp; Spring Boot expert.</p>";
    expect(stripHtml(raw)).toBe("Looking for a Java Developer & Spring Boot expert.");
  });

  it("infers workplace type correctly", () => {
    expect(inferWorkplaceType("Berlin", "Backend Engineer (Remote)", "", false)).toBe("remote");
    expect(inferWorkplaceType("Worldwide", "Senior Dev", "Fully remote role", true)).toBe("remote");
    expect(inferWorkplaceType("Munich, Germany", "Software Developer", "Flexible hybrid policy", false)).toBe("hybrid");
    expect(inferWorkplaceType("Frankfurt Office", "Lead Engineer", "Must work on site", false)).toBe("on-site");
  });

  it("infers experience level correctly", () => {
    expect(inferExperienceLevel("Software Engineering Intern", "Summer internship")).toBe("intern");
    expect(inferExperienceLevel("Junior Frontend Engineer", "Entry-level role")).toBe("entry");
    expect(inferExperienceLevel("Lead Cloud Architect", "Staff level")).toBe("lead");
    expect(inferExperienceLevel("Senior Full Stack Developer", "")).toBe("senior");
    expect(inferExperienceLevel("Backend Developer", "Building APIs")).toBe("mid");
  });

  it("infers job type correctly", () => {
    expect(inferJobType("Engineering Intern", "")).toBe("internship");
    expect(inferJobType("Contract Web Developer", "6 months freelance")).toBe("contract");
    expect(inferJobType("Part-time DevOps Consultant", "")).toBe("part-time");
    expect(inferJobType("Full Stack Engineer", "")).toBe("full-time");
  });

  it("provides fallback jobs with complete schema", () => {
    const fallback = getFallbackJobs();
    expect(fallback.length).toBeGreaterThan(5);
    for (const j of fallback) {
      expect(j.title).toBeDefined();
      expect(j.company).toBeDefined();
      expect(j.requiredSkills.length).toBeGreaterThan(0);
      expect(j.workplaceType).toBeDefined();
      expect(j.experienceLevel).toBeDefined();
      expect(j.postedAt).toBeDefined();
    }
  });

  it("syncAllJobs ingests jobs into database without crashing", async () => {
    const status = await syncAllJobs({ forceFallback: true });
    expect(status.status).toBe("success");
    expect(status.totalJobs).toBeGreaterThan(0);

    const check = getLastSyncStatus();
    expect(check.totalJobs).toBe(status.totalJobs);
  });
});
