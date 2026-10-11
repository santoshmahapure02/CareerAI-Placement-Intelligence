// seed.js - Ingests real live jobs from verified public feeds (Arbeitnow & Remotive)
// Zero demo accounts or fake mock data. Users register their own real accounts.
const db = require("./db");
const { syncAllJobs } = require("./utils/jobIngestion");

async function seed() {
  console.log("[CareerAI] Syncing real live job feeds...");
  const syncResult = await syncAllJobs();
  console.log(`[CareerAI] Real live jobs synced: ${syncResult.totalJobs} active jobs available.`);

  const users = await db.users.all();
  console.log(`[CareerAI] Real registered users in system: ${users.length}`);
}

seed()
  .then(() => {
    if (db._pool) db._pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error("[CareerAI] Sync error:", err);
    process.exit(1);
  });
