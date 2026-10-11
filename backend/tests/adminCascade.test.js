const { cascadeDeleteUser, cascadeDeleteJob } = require("../utils/adminCascade");

// Fake DB mimicking the exact db-json.js / db-mysql.js table interface
// (all/find/filter/findById/remove) that routes/admin.js actually uses.
function makeFakeDb(seed) {
  const data = JSON.parse(JSON.stringify(seed));
  const table = (name) => ({
    async all() {
      return data[name];
    },
    async filter(pred) {
      return data[name].filter(pred);
    },
    async findById(id) {
      return data[name].find((r) => r.id === Number(id));
    },
    async remove(id) {
      const before = data[name].length;
      data[name] = data[name].filter((r) => r.id !== Number(id));
      return data[name].length < before;
    },
  });
  return { users: table("users"), resumes: table("resumes"), jobs: table("jobs"), applications: table("applications") };
}

const seed = {
  users: [
    { id: 1, name: "Admin", role: "admin" },
    { id: 2, name: "Rec", role: "recruiter" },
    { id: 3, name: "Stu", role: "student" },
    { id: 4, name: "Stu2", role: "student" },
  ],
  jobs: [
    { id: 10, title: "Backend Eng", createdBy: 2 },
    { id: 11, title: "Frontend Eng", createdBy: 2 },
  ],
  applications: [
    { id: 100, userId: 3, jobId: 10, status: "Applied" },
    { id: 101, userId: 4, jobId: 10, status: "Interview" },
    { id: 102, userId: 4, jobId: 11, status: "Applied" },
  ],
  resumes: [
    { id: 200, userId: 3, score: 80 },
    { id: 201, userId: 4, score: 60 },
  ],
};

describe("cascadeDeleteUser", () => {
  it("removes a recruiter along with their posted jobs and all applications to those jobs", async () => {
    const db = makeFakeDb(seed);
    expect(await cascadeDeleteUser(db, 2)).toBe(true);
    expect(await db.users.all()).toHaveLength(3);
    expect(await db.jobs.all()).toHaveLength(0);
    expect(await db.applications.all()).toHaveLength(0);
  });

  it("removes a student's own resumes and applications without touching other users' data", async () => {
    const db = makeFakeDb(seed);
    await cascadeDeleteUser(db, 4);
    expect(await db.users.all()).toHaveLength(3);
    expect(await db.resumes.all()).toHaveLength(1); // student 3's resume untouched
    expect(await db.applications.all()).toHaveLength(1); // student 3's application untouched
    expect(await db.jobs.all()).toHaveLength(2); // student never posted jobs
  });

  it("is a no-op returning false for a nonexistent user", async () => {
    const db = makeFakeDb(seed);
    expect(await cascadeDeleteUser(db, 999)).toBe(false);
  });
});

describe("cascadeDeleteJob", () => {
  it("removes the job and every application to it, leaving other jobs untouched", async () => {
    const db = makeFakeDb(seed);
    expect(await cascadeDeleteJob(db, 10)).toBe(true);
    expect(await db.jobs.all()).toHaveLength(1);
    expect(await db.applications.all()).toHaveLength(1);
  });

  it("is a no-op returning false for a nonexistent job", async () => {
    const db = makeFakeDb(seed);
    expect(await cascadeDeleteJob(db, 999)).toBe(false);
  });
});
