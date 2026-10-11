// utils/adminCascade.js
// -----------------------------------------------------------------------
// Cascade-delete helpers for routes/admin.js. Separated out (same pattern
// as matchEngine.js/resumeParser.js) so this is unit-testable without
// spinning up Express.
//
// Why this exists: db.users.remove()/db.jobs.remove() only delete the one
// row. Without this, deleting a user through the admin panel leaves their
// resumes and applications behind pointing at a userId that no longer
// exists, and deleting a job leaves every application to it pointing at a
// jobId that no longer exists. Nothing in the app crashes on that (jobs.js,
// applications.js, matching.js all defensively null-check missing
// lookups), but the orphaned rows permanently inflate admin overview
// counts (total applications/resumes) and never go away on their own.
// -----------------------------------------------------------------------

// Deletes a user and everything that would otherwise be left dangling:
// their own resumes, their own applications, and - if they're a
// recruiter/admin who posted jobs - those jobs plus every application to
// them. Works against the generic table interface (all/filter/findById/
// remove) shared by db-json.js and db-mysql.js. Returns false if the user
// doesn't exist.
async function cascadeDeleteUser(db, userId) {
  const id = Number(userId);
  const user = await db.users.findById(id);
  if (!user) return false;

  const ownResumes = await db.resumes.filter((r) => r.userId === id);
  for (const r of ownResumes) await db.resumes.remove(r.id);

  const ownApplications = await db.applications.filter((a) => a.userId === id);
  for (const a of ownApplications) await db.applications.remove(a.id);

  const postedJobs = await db.jobs.filter((j) => j.createdBy === id);
  for (const job of postedJobs) {
    const applicationsToJob = await db.applications.filter((a) => a.jobId === job.id);
    for (const a of applicationsToJob) await db.applications.remove(a.id);
    await db.jobs.remove(job.id);
  }

  await db.users.remove(id);
  return true;
}

// Deletes a job posting and every application to it, so admin job
// moderation never leaves orphaned applications behind. Returns false if
// the job doesn't exist.
async function cascadeDeleteJob(db, jobId) {
  const id = Number(jobId);
  const job = await db.jobs.findById(id);
  if (!job) return false;

  const applicationsToJob = await db.applications.filter((a) => a.jobId === id);
  for (const a of applicationsToJob) await db.applications.remove(a.id);

  await db.jobs.remove(id);
  return true;
}

module.exports = { cascadeDeleteUser, cascadeDeleteJob };
