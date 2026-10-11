process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const app = require("../server");
const db = require("../db");

let studentToken;

beforeAll(async () => {
  const reg = await request(app).post("/api/auth/register").send({
    name: "Filter Tester",
    email: "filter@test.dev",
    password: "password123",
  });
  if (reg.status === 201) {
    studentToken = reg.body.token;
  } else {
    const login = await request(app).post("/api/auth/login").send({
      email: "filter@test.dev",
      password: "password123",
    });
    studentToken = login.body.token;
  }

  // Insert test jobs with diverse metadata
  const now = Date.now();
  await db.jobs.insert({
    title: "Remote React Developer",
    company: "Acme Web",
    description: "React TypeScript Tailwind CSS web engineering",
    requiredSkills: ["React", "TypeScript", "Tailwind CSS"],
    location: "Remote",
    workplaceType: "remote",
    experienceLevel: "entry",
    jobType: "full-time",
    salary: "$90k",
    source: "direct",
    postedAt: new Date(now - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    isActive: true,
  });

  await db.jobs.insert({
    title: "Senior Java Architect",
    company: "Enterprise BigCorp",
    description: "Java Spring Boot Microservices Kubernetes AWS",
    requiredSkills: ["Java", "Spring Boot", "Kubernetes", "AWS"],
    location: "New York, NY",
    workplaceType: "on-site",
    experienceLevel: "senior",
    jobType: "full-time",
    salary: "$180k",
    source: "arbeitnow",
    postedAt: new Date(now - 10 * 24 * 3600 * 1000).toISOString(), // 10 days ago
    isActive: true,
  });
});

describe("Jobs filtering and search API", () => {
  it("filters jobs by keyword query", async () => {
    const res = await request(app)
      .get("/api/jobs?q=Acme")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.every((j) => j.company.includes("Acme") || j.title.includes("Acme"))).toBe(true);
  });

  it("filters jobs by workplaceType", async () => {
    const res = await request(app)
      .get("/api/jobs?workplaceType=remote")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.every((j) => j.workplaceType === "remote")).toBe(true);
  });

  it("filters jobs by experienceLevel", async () => {
    const res = await request(app)
      .get("/api/jobs?experienceLevel=entry")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.every((j) => j.experienceLevel === "entry")).toBe(true);
  });

  it("filters jobs by freshness (24h)", async () => {
    const res = await request(app)
      .get("/api/jobs?freshness=24h")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    const oneDayAgo = Date.now() - 24 * 3600 * 1000;
    expect(res.body.every((j) => new Date(j.postedAt || j.createdAt).getTime() >= oneDayAgo)).toBe(true);
  });

  it("returns sync status", async () => {
    const res = await request(app)
      .get("/api/jobs/sync/status")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalJobs");
  });

  it("triggers sync", async () => {
    const res = await request(app)
      .post("/api/jobs/sync")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
  }, 15000);

  it("returns daily plan recommendations", async () => {
    const res = await request(app)
      .get("/api/assistant/daily-plan")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("hasResume");
  });

  afterAll(async () => {
    if (db._pool) await db._pool.end();
  });
});
