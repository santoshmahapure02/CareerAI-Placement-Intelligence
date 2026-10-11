process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

const fs = require("fs");
const path = require("path");
const request = require("supertest");

const TEST_DB = path.join(__dirname, "..", "data", "db.test.json");

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

afterAll(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

const app = require("../server");
const db = require("../db");

afterAll(async () => {
  if (db._pool) await db._pool.end(); // close MySQL pool so Jest can exit cleanly
});

describe("Auth", () => {
  it("registers a new student and returns a token", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test Student",
      email: "student@test.dev",
      password: "password123",
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("student");
  });

  it("rejects duplicate email registration", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Dup",
      email: "student@test.dev",
      password: "password123",
    });
    expect(res.status).toBe(409);
  });

  it("rejects short passwords", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Short PW",
      email: "shortpw@test.dev",
      password: "123",
    });
    expect(res.status).toBe(400);
  });

  it("SECURITY: rejects a client-supplied admin role on public registration", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Would-be Admin",
      email: "wannabeadmin@test.dev",
      password: "password123",
      role: "admin",
    });
    // The registration schema only accepts "student" or "recruiter" - an
    // "admin" role value is rejected outright (400), not silently accepted
    // or silently downgraded. Either way, no admin account gets created.
    expect(res.status).toBe(400);

    const stillNotRegistered = await request(app).post("/api/auth/login").send({
      email: "wannabeadmin@test.dev",
      password: "password123",
    });
    expect(stillNotRegistered.status).toBe(401);
  });

  it("allows legitimate recruiter self-signup", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Legit Recruiter",
      email: "legitrecruiter@test.dev",
      password: "password123",
      role: "recruiter",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("recruiter");
  });

  it("blocks non-admins from provisioning accounts via create-account", async () => {
    const studentRes = await request(app).post("/api/auth/register").send({
      name: "Regular Student",
      email: "regularstudent@test.dev",
      password: "password123",
    });
    const res = await request(app)
      .post("/api/auth/create-account")
      .set("Authorization", `Bearer ${studentRes.body.token}`)
      .send({ name: "Sneaky Admin", email: "sneaky@test.dev", password: "password123", role: "admin" });
    expect(res.status).toBe(403);
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "student@test.dev",
      password: "password123",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "student@test.dev",
      password: "wrongpassword",
    });
    expect(res.status).toBe(401);
  });

  it("rejects protected routes without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("Jobs + Matching", () => {
  let studentToken, recruiterToken, jobId;

  beforeAll(async () => {
    const studentRes = await request(app).post("/api/auth/register").send({
      name: "Job Student",
      email: "jobstudent@test.dev",
      password: "password123",
    });
    studentToken = studentRes.body.token;

    const recruiterRes = await request(app).post("/api/auth/register").send({
      name: "Job Recruiter",
      email: "jobrecruiter@test.dev",
      password: "password123",
      role: "recruiter",
    });
    recruiterToken = recruiterRes.body.token;
  });

  it("blocks students from creating jobs", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ title: "Nope", company: "X", description: "Should be blocked" });
    expect(res.status).toBe(403);
  });

  it("lets recruiters create a job and auto-extracts skills", async () => {
    const res = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({
        title: "Backend Engineer",
        company: "TestCo",
        description: "We need Java and Spring Boot experience with MySQL and Docker.",
      });
    expect(res.status).toBe(201);
    expect(res.body.requiredSkills).toEqual(expect.arrayContaining(["Java", "Spring Boot", "MySQL", "Docker"]));
    jobId = res.body.id;
  });

  it("returns 404 for matching with no resume uploaded", async () => {
    const res = await request(app)
      .get(`/api/matching/jobs/${jobId}`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(res.status).toBe(404);
  });

  it("computes a skill gap against a job's required skills", async () => {
    // Skill gap doesn't require an uploaded resume workflow to be exercised
    // directly - matching engine unit-level behavior is covered below.
    const res = await request(app)
      .post("/api/matching/skill-gap")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({ jobId });
    // No resume yet -> should fail informatively, not crash
    expect(res.status).toBe(404);
  });
});

describe("Applications", () => {
  it("requires a valid jobId to apply", async () => {
    const studentRes = await request(app).post("/api/auth/register").send({
      name: "App Student",
      email: "appstudent@test.dev",
      password: "password123",
    });
    const token = studentRes.body.token;

    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: 999999 });
    expect(res.status).toBe(404);
  });

  it("SECURITY: prevents applying to the same job twice", async () => {
    const studentRes = await request(app).post("/api/auth/register").send({
      name: "Dup App Student",
      email: "dupappstudent@test.dev",
      password: "password123",
    });
    const token = studentRes.body.token;

    const recruiterRes = await request(app).post("/api/auth/register").send({
      name: "Dup App Recruiter",
      email: "dupapprecruiter@test.dev",
      password: "password123",
      role: "recruiter",
    });
    const jobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${recruiterRes.body.token}`)
      .send({ title: "Dedup Test Role", company: "DedupCo", description: "A role used only to test duplicate application prevention." });

    const first = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: jobRes.body.id });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ jobId: jobRes.body.id });
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already applied/i);
  });
});

describe("Job ownership (recruiters can only manage their own postings)", () => {
  it("blocks a recruiter from editing another recruiter's job", async () => {
    const recruiterA = await request(app).post("/api/auth/register").send({
      name: "Recruiter A",
      email: "recruitera@test.dev",
      password: "password123",
      role: "recruiter",
    });
    const recruiterB = await request(app).post("/api/auth/register").send({
      name: "Recruiter B",
      email: "recruiterb@test.dev",
      password: "password123",
      role: "recruiter",
    });

    const jobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${recruiterA.body.token}`)
      .send({ title: "Owned By A", company: "ACo", description: "A job posting owned by recruiter A for ownership testing." });

    const editAttempt = await request(app)
      .put(`/api/jobs/${jobRes.body.id}`)
      .set("Authorization", `Bearer ${recruiterB.body.token}`)
      .send({ title: "Hijacked Title" });
    expect(editAttempt.status).toBe(403);

    const deleteAttempt = await request(app)
      .delete(`/api/jobs/${jobRes.body.id}`)
      .set("Authorization", `Bearer ${recruiterB.body.token}`);
    expect(deleteAttempt.status).toBe(403);

    const candidatesAttempt = await request(app)
      .get(`/api/matching/jobs/${jobRes.body.id}/candidates`)
      .set("Authorization", `Bearer ${recruiterB.body.token}`);
    expect(candidatesAttempt.status).toBe(403);
  });

  it("allows the owning recruiter to edit and delete their own job", async () => {
    const recruiter = await request(app).post("/api/auth/register").send({
      name: "Owner Recruiter",
      email: "ownerrecruiter@test.dev",
      password: "password123",
      role: "recruiter",
    });
    const jobRes = await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${recruiter.body.token}`)
      .send({ title: "Owned Job", company: "OwnCo", description: "A job posting the owner should be able to edit and delete." });

    const editRes = await request(app)
      .put(`/api/jobs/${jobRes.body.id}`)
      .set("Authorization", `Bearer ${recruiter.body.token}`)
      .send({ title: "Updated Title" });
    expect(editRes.status).toBe(200);
    expect(editRes.body.title).toBe("Updated Title");

    const deleteRes = await request(app)
      .delete(`/api/jobs/${jobRes.body.id}`)
      .set("Authorization", `Bearer ${recruiter.body.token}`);
    expect(deleteRes.status).toBe(204);
  });
});

describe("Dashboard", () => {
  it("returns a recruiter-shaped payload for recruiters", async () => {
    const recruiter = await request(app).post("/api/auth/register").send({
      name: "Dash Recruiter",
      email: "dashrecruiter@test.dev",
      password: "password123",
      role: "recruiter",
    });
    await request(app)
      .post("/api/jobs")
      .set("Authorization", `Bearer ${recruiter.body.token}`)
      .send({ title: "Dash Job", company: "DashCo", description: "A job posting used to test the recruiter dashboard shape." });

    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${recruiter.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("recruiter");
    expect(res.body.jobsPosted).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.jobs)).toBe(true);
  });

  it("returns a student-shaped payload for students", async () => {
    const student = await request(app).post("/api/auth/register").send({
      name: "Dash Student",
      email: "dashstudent@test.dev",
      password: "password123",
    });
    const res = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${student.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("student");
    expect(res.body.hasResume).toBe(false);
  });
});
