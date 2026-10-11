// routes/assistant.js
// -----------------------------------------------------------------------
// AI Placement & Career Assistant
// Provides formal, executive-grade career advisory and placement intelligence
// grounded in verified profile data and live employment market signals.
// -----------------------------------------------------------------------
const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { computeMatch } = require("../utils/matchEngine");

const router = express.Router();

const {
  isConfigured,
  getStatus,
  setApiKey,
  clearApiKey,
  generateAiChat,
} = require("../utils/aiClient");

const MAX_HISTORY_TURNS = 8;

function timeAgo(dateString) {
  if (!dateString) return "recently";
  const ms = Date.now() - new Date(dateString).getTime();
  if (Number.isNaN(ms) || ms < 0) return "recently";
  const hours = Math.floor(ms / (1000 * 3600));
  if (hours < 1) return "just now";
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// Builds a compact, factual snapshot of the user's data grounded in live jobs
async function buildContext(user) {
  const resumes = (await db.resumes.filter((r) => r.userId === user.id)).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  const resume = resumes[0] || null;
  if (!resume) {
    return "Candidate profile has no verified resume on file. Provide formal, general industry guidance.";
  }

  const allJobs = await db.jobs.all();
  const activeJobs = allJobs.filter((j) => j.isActive !== false);

  const matches = activeJobs
    .map((job) => computeMatch(resume, job))
    .sort((a, b) => b.overallMatch - a.overallMatch)
    .slice(0, 5);

  const lines = [
    `ATS Readability Score: ${resume.score}/100.`,
    `Verified Technical Skills: ${resume.skills.join(", ") || "None recorded"}.`,
    `System Audit Warnings: ${(resume.warnings || []).join(" | ") || "None"}`,
    `Active Market Postings Evaluated: ${activeJobs.length}`,
    `Top Placement Targets:`,
    ...matches.map(
      (m, i) =>
        `  ${i + 1}. ${m.jobTitle} at ${m.company} (${m.overallMatch}% match, posted ${timeAgo(
          activeJobs.find((j) => j.id === m.jobId)?.postedAt
        )}, missing: ${m.missingSkills.join(", ") || "none"})`
    ),
  ];
  if (resume.education) lines.push(`Education Credential: ${resume.education.slice(0, 300)}`);
  if (resume.experience) lines.push(`Experience Scope: ${resume.experience.slice(0, 500)}`);
  if (resume.projects) lines.push(`Engineering Projects: ${resume.projects.slice(0, 500)}`);

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are the CareerAI Executive Placement Advisory Engine.
Maintain an authoritative, formal, professional, and structured tone in all responses.
Format every response with clear executive headings, numbered protocols, bulleted breakdowns, and precise technical terminology.
Do not use informal colloquialisms, filler remarks, or casual conversational phrases. Deliver complete, formal, and actionable career counsel.`;

// Formal Deterministic Intelligence Knowledge Engine
function generateFormalResponse(query, resume, activeJobs = []) {
  const q = query.toLowerCase();

  // 1. Job application priority & daily recommendations
  if (/apply|today|which job|recommend|what should i apply|daily plan/i.test(q)) {
    if (!resume) {
      return (
        "### Formal Application Recommendation Protocol\n\n" +
        "**Status**: No active resume profile detected in the system database.\n\n" +
        "To generate personalized, match-weighted application targets, please upload an authorized CV or resume document via the **Resume** section. " +
        "Once ingested, the system will algorithmically rank your verified technical skills against live employer postings."
      );
    }

    const topMatches = activeJobs
      .map((j) => ({ job: j, match: computeMatch(resume, j) }))
      .sort((a, b) => b.match.overallMatch - a.match.overallMatch)
      .slice(0, 3);

    const list = topMatches
      .map(
        (t, i) =>
          `#### Priority ${i + 1}: ${t.job.title} — ${t.job.company}\n` +
          `- **Overall ATS Compatibility**: ${t.match.overallMatch}%\n` +
          `- **Skill Coverage Ratio**: ${t.match.matchedSkills.length}/${(t.job.requiredSkills || []).length} verified requirements (${t.match.matchedSkills.slice(0, 4).join(", ") || "None"})\n` +
          `- **Posting Recency**: ${timeAgo(t.job.postedAt || t.job.createdAt)} • Workplace Model: ${t.job.workplaceType || "Remote"}\n` +
          `- **Strategic Application Directive**: ${t.match.explanation?.summary || "Submit primary application immediately to enter initial candidate screening batches."}`
      )
      .join("\n\n");

    return (
      "### Executive Placement Priority Briefing\n\n" +
      `Based on multi-factor algorithmic evaluation of your verified credentials (ATS Score: **${resume.score}/100**, Verified Skills: **${resume.skills.length}**), the following positions represent your highest probability placement targets:\n\n` +
      `${list}\n\n` +
      "**Recommended Next Step**: Prioritize submission to Priority 1 and 2 within the next 24 hours to capitalize on active hiring momentum."
    );
  }

  // 2. ATS Optimization (90%+ score, pass rate, scanner)
  if (/ats|score|pass|optimi[zs]e|readab|scanner|threshold/i.test(q)) {
    return (
      "### Executive ATS Optimization Protocol (Achieving 90%+ Parsing Accuracy)\n\n" +
      "Enterprise Applicant Tracking Systems (e.g., Workday, Greenhouse, Lever, Taleo) utilize automated entity extraction and optical text parsers. To ensure compliance above the 90th percentile, implement the following architectural directives:\n\n" +
      "1. **Structural Hierarchy and Linear Document Layout**:\n" +
      "   - **Strict Single-Column Architecture**: Multi-column tables and floating text boxes cause horizontal character bleeding during OCR parsing, corrupting chronological dates and title attribution.\n" +
      "   - **Canonical Section Demarcations**: Employ standard industry section headers: `Professional Experience`, `Technical Skills`, `Education`, and `Projects`.\n" +
      "   - **Encoding & Font Standards**: Adhere to universal typefaces (Inter, Arial, Calibri, Roboto) exported directly to standard UTF-8 PDF or DOCX formats.\n\n" +
      "2. **Contextual Keyword Engineering**:\n" +
      "   - **Exact Entity Parity**: Align technical nouns precisely with employer job specifications (e.g., utilize `React.js` and `PostgreSQL` rather than informal contractions).\n" +
      "   - **Dual Placement**: State competencies within both your top-level Technical Skills inventory and contextualized within functional accomplishment statements.\n" +
      "   - **Balanced Density**: Target 2 to 3 organic occurrences per primary competency. Prohibit non-contextual keyword stuffing, which triggers modern heuristic demotion filters.\n\n" +
      "3. **Elimination of Algorithmic Blockers**:\n" +
      "   - Remove graphical progress bars, embedded charts, decorative icons, and header/footer metadata fields."
    );
  }

  // 3. Action verbs, weak phrasing, bullet rewrites
  if (/verb|weak|power|action|phrase|rewrite|bullet/i.test(q)) {
    return (
      "### Formal Taxonomy: Executive Action Verbs & Quantifiable Bullet Construction\n\n" +
      "In executive and technical recruitment, passive syntax diminishes perceived technical ownership. Replace generic expressions with authoritative power verbs categorized by architectural scope:\n\n" +
      "1. **System Engineering & Architecture**:\n" +
      "   - Replace `worked on` / `made` with: **Architected**, **Engineered**, **Constructed**, **Spearheaded**, **Deployed**.\n" +
      "   - *Model Statement*: \"Architected a high-throughput microservice layer utilizing Java Spring Boot and Docker, truncating API response latency by 28%.\"\n\n" +
      "2. **Performance Optimization & Refactoring**:\n" +
      "   - Replace `helped fix` / `made faster` with: **Optimized**, **Accelerated**, **Consolidated**, **Refactored**, **Streamlined**.\n" +
      "   - *Model Statement*: \"Optimized PostgreSQL query execution plans and introduced Redis caching, expanding peak concurrency to 12,000 requests/second.\"\n\n" +
      "3. **Organizational Collaboration & Delivery**:\n" +
      "   - Replace `did with team` / `assisted` with: **Orchestrated**, **Facilitated**, **Collaborated across functional units**, **Standardized**.\n" +
      "   - *Model Statement*: \"Orchestrated CI/CD automated test verification pipelines via GitHub Actions, establishing 92% automated regression coverage.\"\n\n" +
      "**Universal Engineering Bullet Formula**:\n" +
      "`[High-Impact Action Verb] + [Specific Technical Scope & Stack] + [Quantifiable Business Outcome / Metric]`"
    );
  }

  // 4. Single-column vs multi-column
  if (/column|single.*column|multi.*column|layout/i.test(q)) {
    return (
      "### Formal Comparative Analysis: Single-Column vs. Multi-Column ATS Readability\n\n" +
      "**Authoritative Directive**: Technical candidates must utilize a **strict single-column format**.\n\n" +
      "1. **Parsing Engine Limitations**:\n" +
      "   - Applicant Tracking Systems read extracted document byte streams sequentially from left to right across physical horizontal scan lines.\n" +
      "   - In dual-column configurations, text extractors regularly parse across the column divider, fusing unrelated content (e.g., merging job dates from Column 2 into project descriptions from Column 1).\n\n" +
      "2. **Chronological Tokenization**:\n" +
      "   - Single-column flow ensures that employment dates, company names, and title tiers parse in exact chronological hierarchy without metadata fragmentation.\n\n" +
      "3. **Recruiter Cognitive Scan Pattern**:\n" +
      "   - Human recruiters utilize an accelerated vertical 'F-pattern' during initial 6-second screenings. Single-column layouts preserve natural vertical eye scanning."
    );
  }

  // 5. LinkedIn cold outreach & recruiter communication
  if (/linkedin|outreach|message|cold|recruiter|connect|email/i.test(q)) {
    return (
      "### Executive Outreach Protocol: Technical Recruiter Communications\n\n" +
      "Recruiter correspondence must be concise (strictly under 80 words), contextual, and respectful of professional bandwidth. Implement this formal 3-phase framework:\n\n" +
      "**Subject Line**: Application Follow-Up: [Full Name] — [Target Role Title] (Req #[ID])\n\n" +
      "**Formal Direct Message Template**:\n\n" +
      "> \"Dear [Recruiter Name],\n>\n" +
      "> I recently submitted my formal application for the [Job Title] requisition at [Company Name].\n>\n" +
      "> My background aligns directly with your core stack requirements in [Core Skill 1], [Core Skill 2], and scalable architecture [cite 1 metric: e.g., 'having deployed distributed REST services supporting 20k+ daily transactions'].\n>\n" +
      "> I have attached my resume for your reference and would welcome the opportunity to discuss how my background supports your team's engineering roadmap.\n>\n" +
      "> Respectfully,\n" +
      "> [Your Name] | [LinkedIn Profile URL] | [GitHub Profile URL]\"\n\n" +
      "**Operational Directives**:\n" +
      "- Send communication within 24 hours of portal submission.\n" +
      "- Avoid unsolicited telephone outreach; maintain formal written channels."
    );
  }

  // 6. Resume tailoring across stacks (frontend, backend, fullstack)
  if (/tailor|frontend|backend|fullstack|different role|specialize/i.test(q)) {
    return (
      "### Strategic Methodology: Tailoring Resumes Across Engineering Disciplines\n\n" +
      "Rather than drafting disparate documents, execute systematic architectural re-weighting grounded in the target requisition:\n\n" +
      "1. **Frontend Engineering Alignment**:\n" +
      "   - **Hierarchy**: Position JavaScript, TypeScript, React/Next.js, and client state architecture as primary.\n" +
      "   - **Accomplishments**: Highlight Core Web Vitals optimization, responsive rendering, component reusability, and client performance benchmarks.\n\n" +
      "2. **Backend Engineering Alignment**:\n" +
      "   - **Hierarchy**: Position distributed server languages (Go, Node.js, Java Spring), API protocols (REST, gRPC), database indexing, and caching as primary.\n" +
      "   - **Accomplishments**: Emphasize query execution optimization, concurrency, horizontal scaling, data schema normalization, and fault tolerance.\n\n" +
      "3. **Fullstack Engineering Alignment**:\n" +
      "   - **Accomplishments**: Frame contributions as cohesive end-to-end delivery: \"Engineered end-to-end architectures linking responsive React client interfaces with secure Node.js REST microservices and relational PostgreSQL schemas.\""
    );
  }

  // 7. Hiring momentum and stale job postings
  if (/momentum|stale|fresh|active|indicator|repost/i.test(q)) {
    return (
      "### Market Intelligence: Identifying Active Hiring Momentum vs. Stale Postings\n\n" +
      "To maximize application conversion efficiency, calibrate your pipeline against verified hiring indicators:\n\n" +
      "1. **Temporal Freshness Metrics**:\n" +
      "   - **High-Velocity Window (<72 Hours)**: Primary application zone. Sourcing teams actively review incoming applicant queues.\n" +
      "   - **Viable Window (3–14 Days)**: Standard evaluation queue.\n" +
      "   - **Low-Yield Zone (>30 Days)**: Substantially elevated probability of paused headcounts, unclosed requisitions, or automated pipeline refreshes.\n\n" +
      "2. **Organizational Momentum Signals**:\n" +
      "   - **Multiple Department Requisitions**: Simultaneous postings for Frontend, Backend, and DevOps in the same division reflect funded team expansion.\n" +
      "   - **Verified Direct Sourcing**: Active hiring manager and recruiter engagement on professional networks confirms authorized requisition budgets."
    );
  }

  // 8. Remote vs Hybrid engineering
  if (/remote|hybrid|wfh|location|distributed/i.test(q)) {
    return (
      "### Strategic Positioning for Fully Distributed and Remote Engineering Requisitions\n\n" +
      "Remote hiring committees evaluate candidates rigorously on demonstrated autonomy and asynchronous collaboration:\n\n" +
      "1. **Asynchronous Documentation Excellence**:\n" +
      "   - Explicitly cite proficiency in drafting technical design specifications, Architecture Decision Records (ADRs), and thorough pull request summaries.\n\n" +
      "2. **Independent CI/CD and Delivery Ownership**:\n" +
      "   - Highlight end-to-end ownership from branch isolation to automated production deployment, verifying minimal management overhead.\n\n" +
      "3. **Distributed Team Collaboration**:\n" +
      "   - Cite experience collaborating across multi-timezone distributed teams utilizing asynchronous workflows, Git versioning, and project issue trackers."
    );
  }

  // 9. Technical stacks and high-demand skills
  if (/skill|stack|demand|learn|fastest|technolog|market demand/i.test(q)) {
    return (
      "### Enterprise Technical Stack Demand & Hiring Velocity Assessment\n\n" +
      "Based on real-time empirical analysis of current employment market requisitions, the following technical competencies demonstrate the highest hiring velocity:\n\n" +
      "1. **High-Concurrence Server Stacks**:\n" +
      "   - **Go & Node.js (TypeScript)**: Commanded across cloud-native platforms and microservice architectures.\n" +
      "   - **Java (Spring Boot)**: Retains institutional predominance across enterprise banking, telecommunications, and large-scale data systems.\n" +
      "   - **Python (FastAPI)**: Surging demand for high-performance service endpoints and AI/ML model orchestration.\n\n" +
      "2. **Containerization & Cloud Infrastructure**:\n" +
      "   - **Docker & Container Primitives**: Universal baseline requirement across engineering tiers.\n" +
      "   - **Cloud Services (AWS / GCP)**: Demonstrated competence with compute, managed storage (S3), identity management (IAM), and serverless architectures.\n\n" +
      "3. **Data Storage & Indexing**:\n" +
      "   - Relational mastery (**PostgreSQL / MySQL**) including B-Tree index optimization and transaction isolation levels.\n" +
      "   - In-memory key-value caching (**Redis**) for throughput offloading and distributed session management."
    );
  }

  // 10. Behavioral interviews & STAR method
  if (/interview|star|behavioral|screen|question|hr round/i.test(q)) {
    return (
      "### Executive Behavioral Interview Protocol: The Structured STAR Methodology\n\n" +
      "Technical leadership evaluates engineering maturity through structured behavioral frameworks. Allocate your response time across the following formal proportions:\n\n" +
      "1. **Situation (15% of Time)**:\n" +
      "   - Concisely outline the operational context and technical environment. Prohibit extraneous narrative.\n" +
      "   - *Example*: \"In our primary payment service, our database experienced recurring connection pool exhaustion during peak monthly billing cycles.\"\n\n" +
      "2. **Task (15% of Time)**:\n" +
      "   - Explicitly delineate your individual responsibility and engineering objective.\n" +
      "   - *Example*: \"I was assigned to identify root-cause connection leaks and re-architect our connection pooling strategy.\"\n\n" +
      "3. **Action (50% of Time)**:\n" +
      "   - Detail your technical execution, architectural rationale, and engineering trade-offs.\n" +
      "   - *Example*: \"I performed distributed tracing via OpenTelemetry, isolated unclosed transactions in our legacy ORM layer, configured connection pooling via HikariCP with exponential backoff, and deployed the refactored service in a canary release.\"\n\n" +
      "4. **Result (20% of Time)**:\n" +
      "   - Conclude with verifiable, quantitative business and system outcomes.\n" +
      "   - *Example*: \"This completely resolved connection pool exhaustion, elevated API availability to 99.98%, and supported a 40% expansion in transaction volume without additional compute provisioning.\""
    );
  }

  // 11. Live coding & algorithm interviews
  if (/coding|algorithm|live coding|leetcode|dsa|problem solve/i.test(q)) {
    return (
      "### Professional Protocol for Live Technical Coding Evaluations (45-Minute Format)\n\n" +
      "To exhibit structured problem-solving under examination conditions, partition the evaluation across 5 disciplined phases:\n\n" +
      "1. **Phase 1: Scope Clarification & Invariant Validation (0–5 Minutes)**:\n" +
      "   - Explicitly confirm input data types, value boundaries, null scenarios, duplicate handling, and scale limits.\n" +
      "   - *Under no circumstances begin typing syntax during this phase.*\n\n" +
      "2. **Phase 2: Baseline Complexity Formulation (5–10 Minutes)**:\n" +
      "   - Articulate the brute-force resolution and establish the baseline Big-O Time and Space bounds.\n\n" +
      "3. **Phase 3: Algorithmic Optimization & Trade-Off Analysis (10–15 Minutes)**:\n" +
      "   - Propose the optimal data structure (e.g., Hash Index, Two-Pointer, Sliding Window, Prefix Sum).\n" +
      "   - Secure verbal concurrence from the evaluator before coding.\n\n" +
      "4. **Phase 4: Modular Production Implementation (15–35 Minutes)**:\n" +
      "   - Draft clean, idiomatic code utilizing modular helper routines and expressive variable nomenclature.\n\n" +
      "5. **Phase 5: Dry-Run Verification & Edge Case Execution (35–45 Minutes)**:\n" +
      "   - Trace an explicit execution stack through a sample case line-by-line, followed immediately by boundary edge cases."
    );
  }

  // 12. Reverse questions to ask leadership
  if (/ask them|ask interviewer|reverse question|end of interview/i.test(q)) {
    return (
      "### Strategic Inquiries for Engineering Leadership at Interview Conclusion\n\n" +
      "Posing rigorous questions signals technical maturity and cultural alignment. Select 2 to 3 inquiries from the following executive portfolio:\n\n" +
      "1. **Engineering Velocity & Technical Debt Governance**:\n" +
      "   - \"How does the engineering leadership team systematically balance sprint feature velocity against foundational technical debt remediation during quarterly roadmapping?\"\n\n" +
      "2. **Operational Architecture & Incident Management**:\n" +
      "   - \"What automated safeguards are embedded within your CI/CD delivery pipeline, and what is your team's protocol for blameless post-mortem analysis following production incidents?\"\n\n" +
      "3. **First-90-Day Contribution Milestones**:\n" +
      "   - \"What specific architectural deliverables or operational outcomes define distinguished performance for an engineer in this role over their first 90 days?\""
    );
  }

  // 13. System Design
  if (/system design|architecture|scalab|sharding|caching|rate limit/i.test(q)) {
    return (
      "### Structured Framework for High-Level System Design Evaluations\n\n" +
      "Execute system design evaluations systematically across 4 foundational architectural pillars:\n\n" +
      "1. **Step 1: Scope Demarcation & Non-Functional Specifications**:\n" +
      "   - Functional: Core API endpoints (e.g., `createResource`, `queryResource`).\n" +
      "   - Non-Functional: Read/Write traffic ratios, p99 latency guarantees (<50ms), availability tiers (99.99%), and data consistency models (Strong vs. Eventual Consistency).\n\n" +
      "2. **Step 2: Capacity Estimation & Back-of-the-Envelope Scaling**:\n" +
      "   - Estimate aggregate QPS (Queries Per Second), peak ingress/egress bandwidth, and 5-year storage capacity requirements.\n\n" +
      "3. **Step 3: Core Architectural Topology**:\n" +
      "   - Illustrate end-to-end traffic ingestion through DNS, Load Balancers, API Gateway, Stateless Service Tiers, and Primary Data Storage Clusters.\n\n" +
      "4. **Step 4: Bottleneck Elimination & Scaling Enhancements**:\n" +
      "   - Incorporate distributed caching (Redis) to offload read-heavy database layers, establish rate limiting (Token Bucket algorithm), and define database sharding partition keys."
    );
  }

  // 14. Salary & compensation negotiation
  if (/salary|negotiat|counter|offer|compensation|package|equity/i.test(q)) {
    return (
      "### Executive Protocol for Technical Compensation & Offer Negotiation\n\n" +
      "Conduct compensation deliberations with formal business objectivity grounded in verifiable market calibration:\n\n" +
      "1. **Withholding Premature Anchoring**:\n" +
      "   - If queried early regarding salary expectations: \"I am focused on validating mutual technical and cultural fit first. Once an offer is extended, I am confident we can agree on a package calibrated to current market benchmarks.\"\n\n" +
      "2. **Total Compensation Disaggregation**:\n" +
      "   - Evaluate packages across distinct constituents: Base Guaranteed Salary, Performance Incentive, Long-term Equity Grants (RSUs/ESOPs), and Sign-on Bonus.\n\n" +
      "3. **Formal Written Counter-Proposal Script**:\n\n" +
      "> \"Dear [Recruiter / Hiring Manager],\n>\n" +
      "> Thank you for extending the formal offer for the [Job Title] role. I remain enthusiastic about contributing to the engineering organization's roadmap.\n>\n" +
      "> Based on my technical proficiency in [Target Core Stack] and comparative market compensation data for this scope, I would like to explore adjusting the base compensation to [Target + 8–12%] or incorporating a sign-on component. If we can reach agreement on this baseline, I am prepared to sign the agreement immediately.\n>\n" +
      "> Respectfully,\n" +
      "> [Your Name]\"\n\n" +
      "4. **Leveraging Competing Timelines**:\n" +
      "   - Maintain complete transparency regarding parallel hiring pipelines without disclosing internal proprietary figures."
    );
  }

  // 15. General formal advisory overview
  return (
    "### CareerAI Executive Placement Advisory Briefing\n\n" +
    (resume
      ? `**Candidate Profile Status**: Verified (ATS Score: **${resume.score}/100**, Verified Skills on File: **${resume.skills.length}**).\n\n`
      : "**Candidate Profile Status**: General Advisory Mode (No resume document uploaded yet).\n\n") +
    "**Core Advisory Areas Available**:\n" +
    "1. **ATS Optimization & Structural Auditing**: Attaining 90%+ parse thresholds across enterprise scanners.\n" +
    "2. **Job Application Prioritization**: Algorithmic ranking of active postings against your technical credentials.\n" +
    "3. **High-Yield Action Verbs & Bullet Engineering**: Formulating quantifiable, metric-driven engineering bullets.\n" +
    "4. **Interview Preparation**: Structured STAR behavioral methodologies, 45-minute live coding execution, and system design.\n" +
    "5. **Offer & Compensation Strategy**: Professional counter-proposal framing and total compensation evaluation.\n\n" +
    "Please select any inquiry from the **Question Vault** above or specify your explicit career question."
  );
}

router.get(
  "/daily-plan",
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await db.users.findById(req.user.id);
    const resumes = (await db.resumes.filter((r) => r.userId === user.id)).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const resume = resumes[0] || null;
    if (!resume) {
      return res.json({ hasResume: false, recommendations: [] });
    }

    const allJobs = await db.jobs.all();
    const activeJobs = allJobs.filter((j) => j.isActive !== false);

    const matches = activeJobs
      .map((job) => computeMatch(resume, job))
      .sort((a, b) => b.overallMatch - a.overallMatch)
      .slice(0, 3);

    const recommendations = matches.map((m, idx) => {
      const job = activeJobs.find((j) => j.id === m.jobId);
      const totalReq = (job.requiredSkills || []).length || 1;
      const matchedCount = m.matchedSkills.length;
      const missingCount = m.missingSkills.length;

      let advice = "";
      if (idx === 0) {
        advice = `Prime application target (${m.overallMatch}% match). You cover ${matchedCount}/${totalReq} skills with high hiring momentum.`;
      } else if (missingCount > 0) {
        advice = `Strong second target (${m.overallMatch}%). Address ${m.missingSkills[0]} in your application note.`;
      } else {
        advice = `Full skill alignment (${m.overallMatch}%). Submit application highlighting your relevant project delivery.`;
      }

      return {
        rank: idx + 1,
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location || "Remote",
        workplaceType: job.workplaceType || "remote",
        postedAt: job.postedAt || job.createdAt,
        postedRelative: timeAgo(job.postedAt || job.createdAt),
        overallMatch: m.overallMatch,
        matchedSkills: m.matchedSkills,
        missingSkills: m.missingSkills,
        matchedRatio: `${matchedCount}/${totalReq}`,
        advice,
      };
    });

    res.json({ hasResume: true, recommendations });
  })
);

router.post(
  "/chat",
  authRequired,
  asyncHandler(async (req, res) => {
    const { message, history } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }

    const user = await db.users.findById(req.user.id);
    const resumes = (await db.resumes.filter((r) => r.userId === user.id)).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    const resume = resumes[0] || null;

    const allJobs = await db.jobs.all();
    const activeJobs = allJobs.filter((j) => j.isActive !== false);

    // If no AI key is configured, respond with formal deterministic intelligence
    if (!isConfigured()) {
      const reply = generateFormalResponse(message, resume, activeJobs);
      return res.json({ reply, configured: false, provider: null });
    }

    // Call live multi-provider Generative AI (Gemini, Claude, or OpenAI)
    try {
      const context = await buildContext(user);
      const trimmedHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : [];
      const reply = await generateAiChat({
        systemPrompt: SYSTEM_PROMPT,
        userMessage: message.trim(),
        context,
        history: trimmedHistory,
      });

      if (!reply) {
        const fallbackReply = generateFormalResponse(message, resume, activeJobs);
        return res.json({ reply: fallbackReply, configured: true, fallback: true });
      }

      res.json({ reply, configured: true, provider: getStatus().provider });
    } catch (err) {
      console.warn("[assistant] Remote Generative AI call warning, using deterministic engine:", err.message);
      const fallbackReply = generateFormalResponse(message, resume, activeJobs);
      res.json({ reply: fallbackReply, configured: true, fallback: true, notice: err.message });
    }
  })
);

router.get("/status", authRequired, (req, res) => {
  res.json(getStatus());
});

// Configure or test an AI API Key directly from the UI
router.post(
  "/config",
  authRequired,
  asyncHandler(async (req, res) => {
    const { apiKey, provider } = req.body || {};
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return res.status(400).json({ error: "API key is required" });
    }

    try {
      const status = await setApiKey(apiKey.trim(), provider || "auto");
      res.json({ success: true, message: "AI API Key successfully connected & verified!", status });
    } catch (err) {
      res.status(400).json({ error: err.message || "Failed to verify API key" });
    }
  })
);

router.delete(
  "/config",
  authRequired,
  asyncHandler(async (req, res) => {
    const status = clearApiKey();
    res.json({ success: true, message: "API key removed. Using built-in intelligence engine.", status });
  })
);

module.exports = router;
