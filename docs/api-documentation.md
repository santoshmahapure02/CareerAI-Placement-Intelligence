# CareerAI API Documentation

Base URL (local dev): `http://localhost:5000/api`

All authenticated endpoints require a header:
```
Authorization: Bearer <jwt-token>
```
obtained from `POST /auth/register` or `POST /auth/login`.

---

## Auth

### `POST /auth/register`
Create a new account.

**Body**
```json
{ "name": "Jane Doe", "email": "jane@example.com", "password": "password123", "role": "student" }
```
`role` is optional (`student` | `recruiter` | `admin`), defaults to `student`.

**Response `201`**
```json
{ "token": "...", "user": { "id": 1, "name": "Jane Doe", "email": "jane@example.com", "role": "student" } }
```

### `POST /auth/login`
**Body**: `{ "email": "...", "password": "..." }`
**Response `200`**: same shape as register.

### `POST /auth/create-account` *(admin only)*
Provision a recruiter or admin account. This is the only way to create a
non-self-service account — public registration cannot request `admin`
(fixed privilege-escalation issue — see main README).

**Body**
```json
{ "name": "Ops Admin", "email": "ops@acme.com", "password": "password123", "role": "admin" }
```

### `GET /auth/me`
Returns the current authenticated user. *(auth required)*

---

## Resumes

### `POST /resumes/upload`
Multipart form upload. Field name: `resume`. Accepts `.pdf` and `.docx`, max 5MB.
*(auth required)*

**Response `201`**: the parsed resume record — `skills`, `structuredSkills`,
`education`, `experience`, `projects`, `email`, `phone`, `score` (0–100),
`scoreBreakdown`, `warnings[]`.

`structuredSkills` groups the flat `skills` array into a categorized
profile so a resume reads as a structured candidate profile instead of a
bag of words:
```json
{
  "programming_languages": ["Java", "Python"],
  "frameworks": ["Spring Boot", "React"],
  "databases": ["MySQL"],
  "cloud_devops": ["Docker", "AWS"],
  "ai_ml": [],
  "mobile": [],
  "tools_and_practices": ["Git", "REST API"],
  "other": []
}
```

### `GET /resumes/mine`
List all resumes uploaded by the current user, most recent first. *(auth required)*

### `GET /resumes/:id`
Fetch a single resume by id. Students can only fetch their own. *(auth required)*

### `POST /resumes/improve-bullet`
Rewrite a resume bullet.

**Body**: `{ "text": "Made a website using React.", "mode": "technical" }`
`mode` ∈ `improve | concise | technical | ats`.

---

## Jobs

### `GET /jobs`
List all job postings. *(auth required)*

### `GET /jobs/:id`
Fetch a single job posting. *(auth required)*

### `POST /jobs`
Create a job posting. *(recruiter or admin only)*

**Body**
```json
{ "title": "Backend Engineer", "company": "Acme", "description": "Java, Spring Boot, MySQL, Docker...", "requiredSkills": ["Java"] }
```
`requiredSkills` is optional — if omitted, it's auto-extracted from `description`.

### `PUT /jobs/:id` / `DELETE /jobs/:id`
Update or remove a job posting. *(recruiter or admin only — recruiters can
only manage jobs they personally created; a recruiter attempting to modify
another recruiter's job gets `403`. Admins can manage any job.)*

---

## Matching

### `GET /matching/recommendations`
Ranks every job against the current user's latest resume, highest match first.
*(student, auth required — 404 if no resume uploaded yet)*

### `GET /matching/jobs/:jobId`
Match the current user's latest resume against one specific job.

**Response** (deterministic scoring - no NLP service configured/reachable)
```json
{
  "jobId": 3, "jobTitle": "Backend Engineer", "company": "Acme",
  "overallMatch": 78,
  "scoringMethod": "deterministic (keyword-weighted)",
  "breakdown": { "skill": 80, "experience": 60, "education": 100, "project": 40, "keyword": 90 },
  "matchedSkills": ["Java", "MySQL"],
  "missingSkills": ["Spring Boot", "Docker"]
}
```

**Response** (hybrid scoring - NLP service reachable, adds a `semantic` sub-score)
```json
{
  "jobId": 3, "jobTitle": "Backend Engineer", "company": "Acme",
  "overallMatch": 73,
  "scoringMethod": "hybrid (keyword + semantic)",
  "breakdown": { "skill": 80, "experience": 60, "education": 100, "project": 40, "keyword": 90, "semantic": 38 },
  "matchedSkills": ["Java", "MySQL"],
  "missingSkills": ["Spring Boot", "Docker"]
}
```

Deterministic formula: `0.5×skill + 0.2×experience + 0.1×education + 0.1×project + 0.1×keyword`.

Hybrid formula (used automatically whenever the Python NLP microservice at
`NLP_SERVICE_URL` responds): `0.35×skill + 0.25×semantic + 0.15×experience
+ 0.10×education + 0.10×project + 0.05×keyword`. `scoringMethod` tells you
which formula produced the result — this never silently changes behavior
you can't detect. If the NLP service is unreachable, the response is
identical to the deterministic case with no `semantic` key and no error.
See `python-ai/README.md` for exactly what the semantic signal does and
doesn't capture (term-frequency cosine similarity, not transformer
embeddings).

`explanation` is a plain-English breakdown of *why* the score is what it
is — not just the number:
```json
{
  "verdict": "Highly Recommended",
  "verdictEmoji": "🟢",
  "categoryLabels": { "skill": "Good", "experience": "Excellent", "education": "Excellent", "project": "Excellent", "keyword": "Fair" },
  "strengths": ["Strong technical-skill match (Java, React, Spring Boot...)", "Project experience directly relevant to this role"],
  "relevantProjects": [{ "sentence": "LEAFX: Developed a React and Java based Android application...", "skills": ["Java", "React"] }],
  "relevantExperience": [{ "sentence": "Built and maintained REST APIs using Java and Spring Boot...", "skills": ["Java", "Spring Boot"] }],
  "summary": "Your technical skills and project experience strongly align with this role. Learning Docker and AWS would meaningfully improve your fit."
}
```
`relevantProjects`/`relevantExperience` only ever contain sentences that
actually appear in the candidate's resume — nothing here is fabricated.
When hybrid scoring is active, `categoryLabels` includes a `semantic` entry
too, and the explanation is rebuilt from the hybrid score.

### `GET /matching/jobs/:jobId/candidates`
Rank every student's latest resume against a job posting. *(recruiter or admin only)*

### `POST /matching/skill-gap`
**Body**: `{ "jobId": 3 }` **or** `{ "targetSkills": ["Docker", "AWS", "Kafka"] }`

**Response**
```json
{
  "have": ["Java", "MySQL"],
  "missing": [{ "skill": "Docker", "priority": "High" }, { "skill": "AWS", "priority": "Medium" }],
  "coverage": 60,
  "learningPath": [{ "week": 1, "skill": "Docker", "priority": "High" }]
}
```

---

## Applications

### `GET /applications`
List the current user's tracked applications, each with embedded job info.

### `POST /applications`
**Body**: `{ "jobId": 3 }` — creates an application with status `Applied`.
Returns `409` with `{ "error": "You have already applied for this position." }`
if the current user has already applied to this job.

### `PUT /applications/:id/status`
**Body**: `{ "status": "Interview" }` — one of `Applied | Assessment | Interview | Offer | Rejected`.

### `DELETE /applications/:id`
Remove a tracked application.

---

## Dashboard

### `GET /dashboard`
Response shape depends on the caller's role:

**Students** (`role: "student"`): ATS score, skills count, jobs available,
top 5 matches (each including the `explanation` object described above),
application funnel counts, and trending skills across all postings.

**Recruiters/admins** (`role: "recruiter"` or `"admin"`): jobs posted, total
applications received, application counts by status, and a per-job summary
(`applications`, `shortlisted`, `bestCandidateMatch`) for jobs they own
(admins see every job).

---

## Admin *(admin only)*

Every route below requires `role: "admin"` and returns `403` otherwise.

### `GET /admin/overview`
Platform-wide KPIs: totals (users/jobs/applications/resumes), users by role,
applications by status, average ATS score across all resumes, the 8 most
recently created users and jobs, and the top 10 most in-demand skills across
every job posting.

### `GET /admin/users`
Every user on the platform (id, name, email, role, createdAt — never
`passwordHash`).

### `POST /admin/users`
**Body**: `{ "name", "email", "password", "role" }` — provisions any account
type directly (student, recruiter, or admin), same as
`POST /auth/create-account` but under the admin control panel.

### `PUT /admin/users/:id/role`
**Body**: `{ "role" }` — one of `student | recruiter | admin`. Returns `400`
if you try to demote your own account (self-lockout protection).

### `DELETE /admin/users/:id`
Cascade-deletes the user: their own resumes and applications, and - if
they're a recruiter/admin who posted jobs - those jobs plus every
application to them (see `utils/adminCascade.js`). Returns `400` if you try
to delete your own account.

### `GET /admin/jobs`
Every job posting on the platform, regardless of who posted it.

### `DELETE /admin/jobs/:id`
Cascade-deletes the job along with every application to it.

---

## Assistant

### `GET /assistant/status`
`{ "configured": boolean, "model": string }` — whether the generative chat
is enabled (i.e. `ANTHROPIC_API_KEY` is set on the backend).

### `POST /assistant/chat`
**Body**: `{ "message": string, "history"?: [{ "role": "user"|"assistant", "content": string }] }`

Grounds the reply in the caller's actual resume/match/skill-gap data (see
`buildContext` in `routes/assistant.js`), then calls the Anthropic API.
If no API key is configured, returns `200` with `{ configured: false, reply: "..." }`
explaining that plainly rather than failing - the deterministic insights
elsewhere on the page always work regardless.

---

## Error format

All errors return `{ "error": "human-readable message" }` with an appropriate
HTTP status code (400 validation, 401 auth, 403 permission, 404 not found,
409 conflict, 500 server error).
