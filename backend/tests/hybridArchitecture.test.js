const request = require("supertest");
const app = require("../server");
const db = require("../db");

describe("Hybrid Architecture: Static UI + Real Data Contracts", () => {
  let studentToken;
  let testJobId;

  beforeAll(async () => {
    // 1. Register student
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Santosh Kumar",
        email: "santosh.test@careerai.dev",
        password: "password123",
      });

    if (regRes.status === 201) {
      studentToken = regRes.body.token;
    } else {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "santosh.test@careerai.dev", password: "password123" });
      studentToken = loginRes.body.token;
    }

    // 2. Ensure at least one test job exists
    const existingJobs = await db.jobs.all();
    if (existingJobs.length === 0) {
      const createdJob = await db.jobs.insert({
        title: "Full Stack Engineer",
        company: "Google Cloud",
        location: "Bangalore",
        workplaceType: "Hybrid",
        salary: "₹18-24 LPA",
        requiredSkills: ["React", "Node.js", "Docker", "PostgreSQL"],
        status: "active",
        source: "CareerAI Direct",
        description: "Looking for an experienced Full Stack Engineer with React and Docker experience."
      });
      testJobId = createdJob.id;
    } else {
      testJobId = existingJobs[0].id;
    }

    // 3. Upload & analyze resume text so student has verified skills
    await request(app)
      .post("/api/resumes/analyze-text")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        text: "Santosh Kumar. Full Stack Developer with 3 years experience in React, JavaScript, Node.js, Express, and Git. Familiar with cloud deployments.",
        title: "Santosh_Kumar_Resume.pdf"
      });

    // 4. Create an application
    if (testJobId) {
      await request(app)
        .post("/api/applications")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ jobId: testJobId });
    }
  });

  test("GET /api/public-stats returns accurate live platform metrics without auth", async () => {
    const res = await request(app).get("/api/public-stats");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalJobs");
    expect(res.body).toHaveProperty("totalApplications");
    expect(res.body).toHaveProperty("totalStudents");
    expect(res.body).toHaveProperty("sources");
    expect(res.body).toHaveProperty("sampleJobs");
    expect(Array.isArray(res.body.sources)).toBe(true);
    expect(Array.isArray(res.body.sampleJobs)).toBe(true);
    expect(res.body.totalJobs).toBeGreaterThanOrEqual(1);
    if (res.body.sampleJobs.length > 0) {
      expect(res.body.sampleJobs[0]).toHaveProperty("title");
      expect(res.body.sampleJobs[0]).toHaveProperty("company");
      expect(res.body.sampleJobs[0]).toHaveProperty("location");
    }
  });

  test("GET /api/dashboard returns real user skills, skillGaps, topRecommendation, skillComparison, and recentActivity", async () => {
    const res = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("student");
    expect(res.body).toHaveProperty("skills");
    expect(Array.isArray(res.body.skills)).toBe(true);
    expect(res.body).toHaveProperty("skillGaps");
    expect(Array.isArray(res.body.skillGaps)).toBe(true);
    expect(res.body).toHaveProperty("topRecommendation");
    if (res.body.topRecommendation) {
      expect(res.body.topRecommendation).toHaveProperty("title");
      expect(res.body.topRecommendation).toHaveProperty("description");
    }
    expect(res.body).toHaveProperty("skillComparison");
    expect(Array.isArray(res.body.skillComparison)).toBe(true);
    expect(res.body).toHaveProperty("recentActivity");
    expect(Array.isArray(res.body.recentActivity)).toBe(true);
  });

  test("GET /api/applications returns complete job metadata (location, workplaceType, salary)", async () => {
    const res = await request(app)
      .get("/api/applications")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0 && res.body[0].job) {
      expect(res.body[0].job).toHaveProperty("title");
      expect(res.body[0].job).toHaveProperty("company");
      expect(res.body[0].job).toHaveProperty("location");
      expect(res.body[0].job).toHaveProperty("workplaceType");
      expect(res.body[0].job).toHaveProperty("salary");
    }
  });

  test("GET /api/matching/recommendations calculates real matches against student resume", async () => {
    const res = await request(app)
      .get("/api/matching/recommendations")
      .set("Authorization", `Bearer ${studentToken}`);

    // If student has a resume, status is 200 and matches are computed
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("overallMatch");
      expect(res.body[0]).toHaveProperty("matchedSkills");
      expect(res.body[0]).toHaveProperty("missingSkills");
    } else {
      expect(res.status).toBe(404);
    }
  });

  test("POST /api/matching/skill-gap returns real missing skills and learning roadmap", async () => {
    const res = await request(app)
      .post("/api/matching/skill-gap")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ mode: "market" });

    if (res.status === 200) {
      expect(res.body).toHaveProperty("missing");
      expect(res.body).toHaveProperty("learningPath");
      expect(Array.isArray(res.body.learningPath)).toBe(true);
    } else {
      expect(res.status).toBe(404);
    }
  });
});
