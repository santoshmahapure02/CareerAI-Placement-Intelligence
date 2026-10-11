# CareerAI — Real-Time Placement Intelligence Platform (V6)

A full-stack placement intelligence and job-matching platform: automated resume parsing, ATS scoring, multi-factor job matching, skill-gap analysis, Kanban application tracker, an **external real-time job ingestion engine**, live freshness modeling, and an **actionable AI Placement Assistant**.

## What's New in V6 — Real-Time Placement Intelligence

- 🌐 **Live External Job Ingestion**: Replaced static demo datasets with an automated multi-source ingestion layer (`backend/utils/jobIngestion.js`) connecting to open public feeds (**Arbeitnow** & **Remotive**) with zero API keys required and zero cost.
- 🛡️ **Zero-Failure Resilience**: Includes an automatic graceful fallback to a rich multi-domain tech dataset with varied timestamps if offline or rate-limited.
- 🕒 **Job Freshness & Hiring Momentum**: Every job carries verifiable metadata (`source`, `sourceJobId`, `postedAt`, `expiresAt`, `lastSyncedAt`, `isActive`) with relative time badges ("Posted 2 hours ago", "⚡ High Hiring Momentum").
- 🔍 **Advanced Search & Filtering**: Control-room toolbar with keyword search, location filtering, workplace selector (All / Remote / Hybrid / On-site), experience level filter (Intern, Entry, Mid, Senior, Lead), freshness tabs (All / 24h / 7d / 30d), and sorting by match percentage or newest.
- ⚡ **Multi-Factor Placement Matching**: Scoring formula that evaluates verified skills, experience, education, projects, seniority alignment (entry-level student fit vs senior), remote workplace compatibility, and posting hiring momentum.
- 📈 **Dynamic 30-Day Skill Demand Velocity**: Real-time market analytics calculating employer demand frequency and growth momentum (`Required by 48 active jobs • ↑ 18% this month`), reflected directly in Skill Gap and Dashboard.
- 🤖 **Actionable AI Career Assistant**: Dedicated Daily Application Plan answering *"Which jobs should I apply to today?"* with top ranked matches, skill coverage ratios, and tailored application pitch tips.

## Core Platform Capabilities

**Core application (Node/Express + React):**
- JWT authentication with role isolation (Student & Recruiter portals)
- Resume upload (PDF & DOCX) → text extraction → structured field parsing
- Keyword-based skill extraction against a 60+ skill dictionary with alias
  normalization (`JS` → `JavaScript`, `Spring` → `Spring Boot`, etc.)
- Resume quality scoring (0–100) with a category breakdown, and weak-section
  warnings
- Job posting with auto skill-extraction from the description (recruiters)
- **Multi-factor resume↔job matching engine**: explainable, transparent scoring
- Skill-gap analysis with priority ranking + a learning-path generator
- Application tracker (Kanban board)
- Recruiter candidate ranking page
- AI Career Assistant — narrative guidance traceable to real numbers
- Dashboard with a Recharts bar chart, ATS score, applications funnel,
  trending skills with 30-day velocity trends
- Public landing page, a distinct dark "control room" UI

**Architecture highlights:**
- 🔒 **Role-Isolated Security**: Self-service onboarding for Student and Recruiter portals with bcrypt encryption and JWT verification.
- 🗄️ **Real MySQL/MariaDB support**: `backend/db-mysql.js` + `schema.sql`,
  switchable via `DB_DRIVER=mysql` with zero route-code changes (the JSON
  driver stays as the zero-setup default). **Actually tested against a live
  MariaDB instance** — register/login/dashboard/apply all verified working,
  including catching and fixing a real datetime-format bug along the way.
- 🐍 **Python NLP microservice** (`python-ai/`): FastAPI service computing
  term-frequency cosine similarity between resume and job text — genuine
  classic NLP, honestly *not* marketed as transformer/LLM embeddings (see
  `python-ai/README.md`). Wired in as a fully optional enrichment — if it's
  not running, matching works identically with no error.
- ⚙️ **C++ ranking engine** (`ranking-engine/`): a real, compiled top-K
  candidate ranker, now actually wired into `matchEngine.rankCandidates()`
  (used by the recruiter candidate-ranking endpoint) via a persistent
  process (`backend/utils/cppRanker.js`), not dead code anymore. **Two
  rounds of honest benchmarking** — spawn-per-request, then a persistent
  warm process — both found plain JS still wins at every scale tested,
  because text-based IPC serialization cost dominates the trivial
  per-candidate arithmetic either way. It's fully tested
  (`ranking-engine/verify_cppRanker.js`, exact match against JS on 2,000
  random candidates including under concurrency) and gated behind
  `ENABLE_CPP_RANKER=false` by default for exactly that reason — see
  `ranking-engine/README.md` for both benchmark tables and why turning it
  on would currently be a regression.
- 🐳 **Docker Compose** for all four services — written to match the
  documented architecture but **not verified** (no Docker daemon was
  available in the sandbox this was built in).
- 🧪 Async error handling: every route is now wrapped so a failed database
  call returns a proper error response instead of crashing the whole server.

**V3 upgrades (this round — correctness, explainability, and recruiter tooling):**
- 🔒 **Duplicate-application prevention**: a student can no longer apply to
  the same job twice — enforced both at the API layer and, for the MySQL
  driver, with a real `UNIQUE(userId, jobId)` database constraint as a
  race-condition backstop. Tested against both drivers.
- 🔒 **Recruiter job ownership**: recruiters can now only edit, delete, or
  view candidate rankings for jobs *they* posted — previously any recruiter
  could modify any job. Admins retain full access. Tested with two separate
  recruiter accounts to confirm cross-account access is blocked.
- 🔒 **Stronger validation and hardening**: request bodies are now validated
  with Zod (clear 400s instead of vague failures), password policy raised
  to 8+ characters with a letter and a number, `helmet` for secure HTTP
  headers, and rate limiting on `/auth/login` and `/auth/register` (30
  requests / 15 min) to blunt brute-force attempts.
- 🟢 **Explainable match results**: every match now includes an
  `explanation` object — a plain-English verdict (Highly Recommended /
  Recommended / Worth Considering / Not a Strong Fit Yet), qualitative
  labels per category (Excellent/Good/Fair/Weak), and — critically — the
  *actual sentences* from the candidate's resume that back up the skill
  match (e.g. "your LEAFX project used React and REST APIs"), not a
  fabricated justification. Surfaced in the Job Matcher UI.
- 🟢 **Recruiter dashboard**: recruiters now get their own dashboard view —
  jobs posted, total applications, status breakdown, and a per-job table
  showing applicant count, shortlist count, and best current candidate
  match — instead of seeing the student-oriented view.

## Project structure

```
careerai/
├── docs/
│   ├── api-documentation.md
│   └── architecture.md          Mermaid diagrams + honest simplification log
├── docker-compose.yml            not verified - see caveat above
├── backend/                      Express API (Node.js)
│   ├── server.js
│   ├── db.js                     driver selector (json | mysql)
│   ├── db-json.js                embedded JSON store (default)
│   ├── db-mysql.js               real MySQL/MariaDB driver
│   ├── schema.sql                MySQL schema
│   ├── seed.js                   recruiter + 24 jobs + 2 demo students
│   ├── middleware/auth.js
│   ├── routes/                   auth, resumes, jobs, matching, applications, dashboard
│   ├── utils/                    skills.js, resumeParser.js, matchEngine.js,
│   │                             nlpClient.js, asyncHandler.js
│   └── tests/                    Jest + Supertest — `npm test`
├── frontend/                     React app (Vite)
│   └── src/pages/                Landing, Login, Register, Dashboard, Resume,
│                                  JobMatcher, CandidateRanking, SkillGap,
│                                  Applications, AiAssistant
├── python-ai/                    Optional FastAPI NLP microservice
│   ├── main.py, test_main.py     6 pytest tests
│   └── README.md                 what it does/doesn't do, honestly
└── ranking-engine/                C++ top-K ranker (wired in, off by default)
    ├── ranker.cpp                 persistent-process protocol
    ├── benchmark.js                V1: spawn-per-request (negative result)
    ├── benchmark_persistent.js    V2: warm persistent process (still negative)
    ├── verify_cppRanker.js        correctness tests against the real binary
    └── README.md                  both benchmark tables, and why it's off by default
```

## Running it locally

Requires Node.js 18+.

**1. Backend** (JSON driver, zero setup)
```bash
cd backend
npm install
cp .env.example .env
node seed.js
npm start                  # http://localhost:5000
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

**Demo accounts** (from `node seed.js`):

| Role | Email | Password | Notes |
|---|---|---|---|
| Recruiter | `recruiter@careerai.dev` | `recruiter123` | Owns all 24 seeded jobs |
| Student (strong resume) | `santosh@careerai.dev` | `student123` | Scores well against Java/Spring roles |
| Student (weak resume) | `priya@careerai.dev` | `student123` | Shows off the warning system |

**3. (Optional) Switch to real MySQL**
```bash
mysql -u root -e "CREATE DATABASE careerai; CREATE USER 'careerai'@'localhost' IDENTIFIED BY 'careerai_dev_pw'; GRANT ALL ON careerai.* TO 'careerai'@'localhost';"
mysql -u root careerai < backend/schema.sql
# in backend/.env: DB_DRIVER=mysql (+ MYSQL_* vars, already defaulted in .env.example)
node seed.js && npm start
```

**4. (Optional) Run the Python NLP service**
```bash
cd python-ai
python3 -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8001
# in backend/.env: NLP_SERVICE_URL=http://localhost:8001
```

**5. (Optional) Build and verify the C++ ranking engine**
```bash
cd ranking-engine
g++ -O2 -std=c++17 -o ranker ranker.cpp
node verify_cppRanker.js                    # correctness check against the real binary
node benchmark.js 100000 20                 # V1 benchmark: spawn-per-request
node benchmark_persistent.js 100000 20 50   # V2 benchmark: warm persistent process
# in backend/.env: ENABLE_CPP_RANKER=true   # opt-in only - see ranking-engine/README.md for why it's off by default
```

## Running tests

```bash
cd backend && npm test          # 66 tests, Jest + Supertest
cd python-ai && pytest          # 6 tests
```

## Bug fixes verified this session

- **Admin delete endpoints didn't cascade.** `DELETE /admin/users/:id` and
  `DELETE /admin/jobs/:id` only removed the single row. Under the default
  JSON driver (no DB-level `ON DELETE CASCADE` the way MySQL's schema has),
  that permanently orphaned resumes/applications pointing at a deleted
  user, and applications pointing at a deleted job — nothing crashed
  immediately (`matching.js`/`applications.js` already null-check missing
  lookups), but admin overview counts stayed permanently inflated and
  "ghost" candidates could show up in rankings. Fixed with a new
  `utils/adminCascade.js` (`cascadeDeleteUser`/`cascadeDeleteJob`), wired
  into both routes, with 5 new Jest tests proving the recruiter-with-jobs
  case, the student-with-only-resumes case, and both no-op-on-nonexistent-id
  cases.
- **Every form's `<label>` was visually correct but programmatically
  unassociated** — `<label>Email</label>` sitting next to `<input>` with no
  `for`/`id` link, across Login, Register, JobMatcher, Resume, and
  SkillGap (12 fields total). This is a real accessibility bug (screen
  readers can't identify the fields) independent of testing, and it would
  have made nearly every Playwright spec in `e2e/` fail immediately, since
  `getByLabel()` requires a genuine label/control association, not
  visual proximity. Fixed by adding matching `id`/`htmlFor` pairs to all 12
  fields — see `e2e/README.md` for why this is a good example of "reviewed
  markup" catching something "written against the markup" alone didn't.
- Re-ran the full Jest suite (`matchEngine`, `resumeParser`, `cppRanker`,
  plus the two new `adminCascade` tests) against the real code using a
  small custom Jest-compatible harness, since this sandbox also has no
  network access for `npm install` — **all pass**. Separately verified the
  Python NLP service's fallback path is real by stubbing just enough of
  FastAPI/Pydantic to import `main.py` directly and running every
  `test_main.py` assertion against the live TF-cosine fallback (this
  sandbox genuinely has no `sentence-transformers` installed, so this
  exercised the real degradation path, not a simulation of it).

## What's new in this round

- **Learning-path recommendation engine, for real this time.** The old
  `buildLearningPath` was a single hardcoded array the code itself called
  "a placeholder for a real recommendation engine" — now it's an actual
  dependency-aware scheduler: a curated skill-prerequisite graph (Docker
  before Kubernetes, Java before Spring Boot before Spring Security, etc.)
  resolved via topological sort, realistic per-skill duration estimates
  (week ranges, not one-skill-per-week), and priority driven by **real
  demand data** — how many live job postings on the platform actually
  require each skill — instead of a fixed whitelist. Every step now
  includes a plain-English `reason` ("Required by 8 open postings right
  now", "Prerequisite for Kubernetes — not on your resume yet"). Verified
  live via HTTP: Java → Spring Boot → Spring Security scheduled in the
  correct dependency order against real seeded job data. 6 new Jest tests.
- **CORS hardening.** The API was running with `cors()` wide open (reflects
  any `Origin` back) — a real gap for a JWT-bearing API. Now locked to an
  explicit `CORS_ORIGIN` allowlist (env-configurable, sensible dev
  defaults), verified live: an allowed origin gets a normal preflight
  response, a disallowed one gets a clean `403`-style JSON rejection
  through the existing central error handler (not a raw crash).
- **Admin overview now uses real charts** (recharts, already a project
  dependency): a donut chart for users by role, a donut for applications by
  status, and a horizontal bar chart for the most in-demand skills across
  job postings — replacing the plain text lists, in the same visual
  language as the existing student/recruiter dashboards.
- **Playwright e2e suite** (`e2e/`): 7 spec files covering auth, the full
  student journey (dashboard → job matcher → apply → applications tracker
  → skill gap), resume upload against a real fixture with non-default
  section headings, the recruiter journey (post a job, see it appear), the
  admin panel (access-control redirect + management tables), the AI
  assistant chat, and the new learning-path dependency ordering.
  **Written against the real component markup and reviewed, but not
  executed** — this sandbox can't download Playwright's browser binaries
  (outside its allowed network domains). See `e2e/README.md` for how to
  actually run it.

## What's new in V3 (previous session)

- **Admin control panel** (`/admin`, admin role only): platform-wide stats
  (users by role, applications by status, avg ATS score, top in-demand
  skills across postings), user management (change role, delete, create
  accounts), and job moderation (view/delete any posting). Every action is
  enforced server-side (`requireRole("admin")`), not just hidden in the UI —
  verified live with a 403 from a student token and a blocked self-demote.
- **Generative AI Career Assistant**: a real chat layer (`/api/assistant/chat`,
  Claude API) added *alongside* the original deterministic, numbers-based
  insights on the AI Assistant page — it's grounded in the user's actual
  resume/score/match data via a context block, not generic advice. With no
  `ANTHROPIC_API_KEY` set, it returns a clear "not configured" message
  instead of erroring; the rest of the page works exactly as before either way.
- **Semantic matching upgrade**: `python-ai/main.py`'s `/semantic-similarity`
  now uses real sentence-transformer embeddings (`all-MiniLM-L6-v2`) instead
  of TF-cosine, so paraphrases with little shared vocabulary ("built scalable
  backend services" vs "developed high-throughput APIs") score as similar.
  Automatically falls back to TF-cosine if the model isn't installed/available
  — every response includes a `method` field so callers know which ran.
- **Resume parser hardening**: recognizes many more section-heading synonyms
  ("Work History", "Academic Background", "Key Projects", etc. — verified
  live against a real .docx upload that the old parser would have parsed as
  empty education/experience sections), adds name/LinkedIn/GitHub extraction,
  tightens phone-number matching to reduce false positives on dates/IDs, and
  explicitly flags unreadable/scanned/near-empty documents (`extractionFailed:
  true`) instead of silently scoring them as a bad resume.
- **Docker hardening**: added healthchecks to the backend and NLP services
  (frontend now waits on backend health, not just process start), `.dockerignore`
  files for both build contexts, and a build-time step to bake the embedding
  model into the NLP image so first-request latency doesn't depend on a
  runtime model download.

## What was actually tested (not just written)

- JSON-driver backend: full Jest suite (**60 tests**, up from 43) passing,
  plus live curl walkthroughs of register → upload resume → match →
  skill-gap → apply → recruiter ranking → recruiter dashboard → **admin
  overview/users/role-changes/self-demote-block → assistant status/chat
  fallback**.
- **New resume parser behavior verified against a real .docx upload**
  through the live HTTP endpoint (not just unit tests): correctly extracted
  name, phone with country code, LinkedIn/GitHub links, and correctly
  recognized "Work History"/"Academic Background"/"Key Projects" as their
  respective sections — all headings the previous parser did not recognize.
  The resulting resume then produced real, explainable job matches via
  `/api/dashboard` in the same live session.
- The `extractionFailed` fallback path (near-empty/unreadable document) is
  covered by dedicated Jest tests, since crafting a real scanned-PDF-shaped
  file that both trips pdf-parse successfully *and* yields near-empty text
  wasn't reliably reproducible in this sandbox — the underlying string-length
  check and the resulting response shape are directly tested instead.
- Python NLP service: 6 pytest tests passing against the TF-cosine fallback
  path with a plain venv (no `sentence-transformers`/`torch` installed) —
  confirms the graceful-degradation logic itself works. **The live
  sentence-transformers embedding path could not be verified in this sandbox**
  (installing `torch` exceeded the sandbox's available disk space); the code
  path is a small, standard `sentence-transformers` call, but treat it as
  reviewed-not-run until you verify it in your own environment.
- MySQL driver: the full Jest suite (19 API tests, including the
  duplicate-application and job-ownership tests) run and passing against a
  live MariaDB instance, with the `UNIQUE(userId, jobId)` constraint
  verified to actually reject a duplicate insert at the database layer.
  **Not re-verified against MySQL this session** after the V3 schema
  changes (new `resumes.name`/`resumes.links` columns) — the JSON driver
  was used for this session's live testing; run the migration ALTERs in
  `schema.sql` before pointing V3 at an existing MySQL database.
- C++ ranker: compiled cleanly; wired into `rankCandidates()` behind
  `ENABLE_CPP_RANKER` (default off), with `verify_cppRanker.js` proving
  correctness against the real compiled binary.
- Frontend: builds clean (`npm run build`, verified this session including
  the new Admin page, its recharts visualizations, and the assistant chat
  panel with no new warnings beyond the pre-existing bundle-size notice).
- **e2e suite**: not executed (see above) — this is the one deliverable in
  this repo that is genuinely write-only. Everything else in this list was
  actually run.
- Duplicate-application prevention and recruiter job-ownership: tested live
  with real curl requests (409 on second apply attempt; 403 when Recruiter B
  tries to edit Recruiter A's job) in addition to the Jest suite.
- **Not tested**: `docker-compose.yml` end-to-end (no Docker daemon in this
  sandbox, both this session and the prior one) — the compose file and all
  three Dockerfiles were reviewed line-by-line for path/port/env consistency
  and healthcheck correctness, and one real bug was NOT found because the
  original author already got the C++ binary path resolution right, but
  treat it as a carefully-reviewed starting point, not a verified deployment,
  until you run it with a real Docker daemon.

## Security notes for production use

- Change `JWT_SECRET` in `.env` to a long random value.
- Admin accounts can now only be created via `POST /auth/create-account` by
  an existing admin — there is no self-service admin signup path anymore.
  You'll need to seed your first admin directly (see `seed.js` for the
  pattern) or add one manually via the database.
- Password policy: 8+ characters with at least one letter and one number
  (enforced via Zod in `utils/validation.js`).
- `/auth/login` and `/auth/register` are rate-limited (30 requests / 15 min
  per IP) to blunt brute-force attempts; `helmet` sets standard secure HTTP
  headers on every response.
- Recruiters can only manage (edit/delete/view candidates for) jobs they
  personally posted — enforced in `routes/jobs.js` and `routes/matching.js`.
- The JSON datastore has no write locking — fine for demos, not for
  concurrent production writes. Use the MySQL driver for anything real.
