process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";

const request = require("supertest");
const app = require("../server");
const db = require("../db");
const { parseResumeText, extractMetrics } = require("../utils/resumeParser");

describe("Realtime & Resume Analysis Enhancements", () => {
  let studentToken;

  beforeAll(async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Alex Dev",
      email: `alex.${Date.now()}@test.dev`,
      password: "password123",
    });
    studentToken = res.body.token;
  });

  afterAll(async () => {
    if (db._pool) await db._pool.end();
  });

  describe("parseResumeText & Metrics Extraction", () => {
    it("extracts skills, metrics, and ATS rating from resume text", () => {
      const text = `
Alex Dev
alex@example.com | +1 415-555-0188 | github.com/alexdev | linkedin.com/in/alexdev

Summary
Experienced Full Stack Engineer specialized in building high-performance web applications and distributed systems.

Skills
React, TypeScript, Node.js, Express, Docker, Kubernetes, PostgreSQL, Redis, AWS, REST API

Experience
Senior Software Engineer - CloudScale (2022 - Present)
- Architected and deployed microservices using Node.js, Express, and Docker, reducing API latency by 35%.
- Scaled Redis caching layer to handle 50k requests/sec across multi-region AWS deployments.
- Mentored junior engineers and led code reviews for a team of 8 developers.

Projects
Career Intelligence Portal
- Built a full-stack job matching platform using React, Node.js, and PostgreSQL.
- Implemented real-time search handling 10k daily queries with sub-100ms response times.

Education
B.Tech in Computer Science, State University, 2022.
      `;

      const parsed = parseResumeText(text);
      expect(parsed.extractionFailed).toBe(false);
      expect(parsed.name).toBe("Alex Dev");
      expect(parsed.email).toBe("alex@example.com");
      expect(parsed.links.github).toContain("github.com/alexdev");
      expect(parsed.skills).toEqual(expect.arrayContaining(["React", "Node.js", "Docker", "PostgreSQL", "Redis"]));
      expect(parsed.metrics.length).toBeGreaterThanOrEqual(1);
      expect(parsed.score.total).toBeGreaterThanOrEqual(60);
      expect(parsed.atsRating.rating).toBeDefined();
      expect(parsed.strengths.length).toBeGreaterThan(0);
    });

    it("extracts specific quantifiable percentage and throughput metrics", () => {
      const sample = "Reduced server costs by 40% and scaled throughput to 25k requests/sec.";
      const metrics = extractMetrics(sample);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0]).toMatch(/40%|25k requests/i);
    });
  });

  describe("POST /api/resumes/analyze-text", () => {
    it("parses, scores, and stores a resume from direct text", async () => {
      const resumeContent = `
Maya Sharma
maya@test.dev | +91 98765 43210 | github.com/mayasharma

Summary
Backend engineer focused on Java and distributed microservices.

Skills
Java, Spring Boot, MySQL, Kafka, Docker, Git, REST API

Experience
Software Engineer at Acme Corp
- Developed high-throughput REST APIs using Spring Boot and MySQL serving 100k users.
- Automated Docker container deployments reducing release cycle by 50%.

Projects
E-commerce Platform
- Built backend services using Java, Spring Boot, and Kafka for event streaming.

Education
Bachelor of Engineering in Information Technology, 2023.
      `;

      const res = await request(app)
        .post("/api/resumes/analyze-text")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: resumeContent, title: "Maya Resume 2026" });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe("Maya Sharma");
      expect(res.body.skills).toContain("Spring Boot");
      expect(res.body.score).toBeGreaterThan(50);
      expect(res.body.metrics).toBeDefined();
    });

    it("rejects text that is too short", async () => {
      const res = await request(app)
        .post("/api/resumes/analyze-text")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: "Too short" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/at least 30 characters/i);
    });

    it("rejects invoices, bills, and financial receipts", async () => {
      const invoiceText = `
TAX INVOICE
Invoice Number: INV-2026-9081
Date: September 8, 2026
Billed To: ACME Corporation, 100 Main St.
Shipping Address: 456 Warehouse Blvd.
Subtotal: $4,500.00
Tax Amount: $360.00
Total Amount Due: $4,860.00
Payment Terms: Net 30 days. Remittance Advice enclosed.
      `;

      const res = await request(app)
        .post("/api/resumes/analyze-text")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: invoiceText, title: "Invoice Document" });

      expect(res.status).toBe(400);
      expect(res.body.isResume).toBe(false);
      expect(res.body.error).toMatch(/bill, invoice, or financial receipt/i);
    });

    it("rejects arbitrary text lacking standard resume sections", async () => {
      const randomText = `
The quick brown fox jumps over the lazy dog. In the quiet forest of northern Scandinavia,
the trees stood tall against the autumn breeze. No human had passed by this trail for months.
The river flowed steadily towards the open valley below.
      `;

      const res = await request(app)
        .post("/api/resumes/analyze-text")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ text: randomText, title: "Random Essay" });

      expect(res.status).toBe(400);
      expect(res.body.isResume).toBe(false);
      expect(res.body.error).toMatch(/does not appear to be a valid resume|could not find standard resume sections/i);
    });
  });

  describe("POST /api/jobs/live-search", () => {
    it("searches external/live jobs and returns results with foundCount", async () => {
      const res = await request(app)
        .post("/api/jobs/live-search")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ query: "React", limit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.jobs).toBeDefined();
      expect(Array.isArray(res.body.jobs)).toBe(true);
      expect(res.body.foundCount).toBeGreaterThanOrEqual(0);
    }, 15000);
  });

  describe("GET /api/matching/skill-gap/overview", () => {
    it("automatically evaluates student skill gaps against target jobs and market demand", async () => {
      const res = await request(app)
        .get("/api/matching/skill-gap/overview")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.resume).toBeDefined();
      expect(res.body.have).toBeDefined();
      expect(res.body.missing).toBeDefined();
      expect(res.body.coverage).toBeDefined();
      expect(res.body.learningPath).toBeDefined();
      expect(res.body.marketTrendingSkills).toBeDefined();
    });
  });
});
