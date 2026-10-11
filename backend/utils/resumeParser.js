// utils/resumeParser.js
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const { extractSkills, categorizeSkills } = require("./skills");

async function extractText(filePath, mimetype) {
  const buffer = fs.readFileSync(filePath);
  if (mimetype === "application/pdf" || filePath.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filePath.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // fallback: treat as plain text
  return buffer.toString("utf-8");
}

function extractEmail(text) {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

// Broadened from a single loose pattern to a small ordered list, most
// specific first: an explicit country-code number is unambiguous, so it's
// tried before a bare local-format number that's more prone to matching a
// stray ID/zip/date sequence elsewhere on the page.
const PHONE_PATTERNS = [
  /\+\d{1,3}[-.\s]?\(?\d{2,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,5}/, // has a country code - most reliable
  /\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}/, // (123) 456-7890
  /\b\d{3,5}[-.\s]\d{3,4}[-.\s]\d{3,4}\b/, // 91234-56789 / 123-456-7890 style with separators
];

function extractPhone(text) {
  for (const pattern of PHONE_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      const digits = m[0].replace(/\D/g, "");
      // Guards against matching things like dates or IDs that happen to
      // fit the shape: real phone numbers are 7-15 digits (E.164 bound).
      if (digits.length >= 7 && digits.length <= 15) return m[0].trim();
    }
  }
  return null;
}

function extractLinks(text) {
  const linkedin = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_/]+/i);
  const github = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9\-_]+/i);
  return {
    linkedin: linkedin ? linkedin[0] : null,
    github: github ? github[0] : null,
  };
}

// Heuristic name extraction: resumes almost universally lead with the
// candidate's name as the very first meaningful line, before any contact
// info. Rather than assume line 1 is always right (a stray "Resume" title
// or a logo-derived stray character sometimes lands first), scan the first
// handful of lines and pick the first one that looks like a person's name:
// short, no digits, no @ or url, mostly letters/spaces, 1-4 words.
function extractName(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8);

  const NOISE = /^(resume|curriculum vitae|cv|profile|contact|address)\b/i;

  for (const line of lines) {
    if (line.length > 45 || line.length < 3) continue;
    if (NOISE.test(line)) continue;
    if (/[@\d]/.test(line)) continue;
    if (/https?:\/\/|www\./i.test(line)) continue;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 4) continue;
    // Require every word to start with a capital letter (or be a short
    // connector like "de"/"van") - filters out section headings and
    // sentence fragments that happen to be short.
    const looksLikeName = words.every(
      (w) => /^[A-Z][a-zA-Z.'-]*$/.test(w) || ["de", "van", "der", "al", "bin"].includes(w.toLowerCase())
    );
    if (looksLikeName) return line;
  }
  return null;
}

// Synonym groups per logical section - real resumes use many different
// headings for the same content ("Work Experience" vs "Employment
// History" vs "Professional Experience"), and the previous version only
// recognized one spelling per section, silently returning an empty
// section (and a misleadingly low score) for anything else.
const SECTION_SYNONYMS = {
  education: ["education", "academic background", "academic qualifications", "qualifications"],
  experience: [
    "experience", "work experience", "professional experience", "employment history",
    "work history", "professional background",
  ],
  projects: ["projects", "personal projects", "academic projects", "key projects", "project experience"],
  skills: ["skills", "technical skills", "core competencies", "key skills"],
  certifications: ["certifications", "certificates", "licenses"],
  achievements: ["achievements", "awards", "honors", "accomplishments"],
  summary: ["summary", "professional summary", "profile", "objective", "career objective"],
};
const ALL_HEADING_PHRASES = Object.values(SECTION_SYNONYMS).flat();

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Grabs the text between a recognized heading and whichever OTHER
// recognized heading comes next. Headings are anchored to the start of a
// line (optionally indented, optionally decorated with a bullet/dash) so a
// sentence like "3 years of experience in backend systems" can no longer
// be mistaken for an "Experience" section header - the single biggest
// source of false-empty sections in the previous version.
function extractSection(text, sectionKey) {
  const candidates = SECTION_SYNONYMS[sectionKey] || [sectionKey];
  for (const heading of candidates) {
    const headingRe = new RegExp(`^[\\s\\-\u2013\u2014\u2022*#]*${escapeRe(heading)}[\\s:]*$`, "im");
    const match = text.match(headingRe);
    if (!match) continue;

    const start = match.index + match[0].length;
    let end = text.length;
    for (const other of ALL_HEADING_PHRASES) {
      if (candidates.includes(other)) continue;
      const otherRe = new RegExp(`^[\\s\\-\u2013\u2014\u2022*#]*${escapeRe(other)}[\\s:]*$`, "im");
      const otherMatch = text.slice(start).match(otherRe);
      if (otherMatch) {
        const otherIdx = start + otherMatch.index;
        if (otherIdx < end) end = otherIdx;
      }
    }
    const section = text.slice(start, end).trim().slice(0, 1500);
    if (section) return section;
  }
  return "";
}

function scoreResume({ skills, education, experience, projects }) {
  // Weighted quality score out of 100, loosely following the design doc's
  // rubric: Skills 20, Projects 20, Experience 20, Education 10,
  // Achievements 10, Description depth 20.
  const skillsScore = Math.min(20, skills.length * 2);
  const educationScore = education ? 10 : 3;
  const experienceScore = experience ? Math.min(20, 8 + experience.length / 40) : 5;
  const projectsScore = projects ? Math.min(20, 8 + projects.length / 40) : 5;
  const achievementsScore = /award|achieve|winner|rank|top \d|scholarship/i.test(
    (education || "") + (experience || "") + (projects || "")
  )
    ? 10
    : 5;
  const descriptionScore = Math.min(
    20,
    Math.round(((experience || "").length + (projects || "").length) / 60)
  );

  const total = Math.round(
    skillsScore + educationScore + experienceScore + projectsScore + achievementsScore + descriptionScore
  );

  return {
    total: Math.min(100, total),
    breakdown: {
      skills: Math.round(skillsScore),
      education: Math.round(educationScore),
      experience: Math.round(experienceScore),
      projects: Math.round(projectsScore),
      achievements: Math.round(achievementsScore),
      description: Math.round(descriptionScore),
    },
  };
}

function findWeakSections({ experience, projects, skills }) {
  const warnings = [];
  const hasNumbers = (t) => /\d/.test(t || "");
  const strongVerbs = /(built|developed|designed|implemented|optimized|led|architected|automated|reduced|increased|improved)/i;

  if ((projects || "").length < 120) {
    warnings.push("Project descriptions are too short — add what you built, with which technologies, and the outcome.");
  }
  if (!hasNumbers(experience) && !hasNumbers(projects)) {
    warnings.push("Bullets don't contain measurable outcomes (%, time saved, users, requests/sec, etc).");
  }
  if (!strongVerbs.test((experience || "") + (projects || ""))) {
    warnings.push("Bullets rely on weak verbs — lead with action verbs like 'Built', 'Designed', 'Optimized'.");
  }
  const backendMentioned = skills.some((s) =>
    ["Spring Boot", "Node.js", "Express", "Django", "Flask", "FastAPI"].includes(s)
  );
  if (backendMentioned && !/api|backend|server|service/i.test((projects || "") + (experience || ""))) {
    warnings.push("Backend technologies are listed but not demonstrated in any project description.");
  }
  if (warnings.length === 0) warnings.push("No major issues detected — resume reads clearly.");
  return warnings;
}

// Below this character count, a "successfully" parsed PDF/DOCX almost
// always means one of: a scanned/image-only PDF with no text layer, a
// corrupt file, or an empty template. Rather than silently score it as a
// near-blank resume (which reads as "your resume is bad" instead of
// "we couldn't read your resume"), flag it explicitly so the user gets an
// actionable message instead of a confusing score.
function extractMetrics(text) {
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?\n])\s+/).map((s) => s.trim()).filter(Boolean);
  const metricRegex = /\b(\d+(\.\d+)?%|\$\d+([kKmMbB]|\s*(million|billion))?|\d+([kKmM]|\+)?\s*(users|requests|req\/s|qps|queries|rps|events|students|customers|downloads|stars)|reduced\s+\w+\s+by\s+\d+|increased\s+\w+\s+by\s+\d+|improved\s+\w+\s+by\s+\d+)\b/i;
  const hits = [];
  for (const s of sentences) {
    if (metricRegex.test(s) && s.length >= 15 && s.length <= 250) {
      if (!hits.includes(s)) hits.push(s);
    }
  }
  return hits.slice(0, 5);
}

function getAtsRating(score) {
  if (score >= 85) return { rating: "Exceptional", percentile: "Top 5%", badge: "badge-green" };
  if (score >= 70) return { rating: "Competitive", percentile: "Top 20%", badge: "badge-blue" };
  if (score >= 50) return { rating: "Fair", percentile: "Middle 50%", badge: "badge-yellow" };
  return { rating: "Needs Improvement", percentile: "Lower 25%", badge: "badge-red" };
}

const NON_RESUME_DISQUALIFIERS = [
  {
    type: "invoice",
    regex: /\b(tax invoice|proforma invoice|invoice no\b|invoice number|amount due|balance due|total amount due|billed to|ship to\b|shipping address|payment terms|remittance advice|gstin|subtotal|vat number)\b/i,
    message: "The uploaded file appears to be a bill, invoice, or financial receipt, not a resume.",
  },
  {
    type: "bank_statement",
    regex: /\b(bank statement|account statement|available balance|opening balance|closing balance|transaction date|withdrawals|deposits|credit limit)\b/i,
    message: "The uploaded document appears to be a bank or account statement, not a resume.",
  },
  {
    type: "legal_contract",
    regex: /\b(non-disclosure agreement|confidentiality agreement|in witness whereof|now therefore it is hereby agreed|indemnify and hold harmless|governing law and jurisdiction|lessor and lessee)\b/i,
    message: "The uploaded file appears to be a legal agreement or contract, not a resume.",
  },
  {
    type: "cooking_recipe",
    regex: /\b(prep time|cook time|tablespoons|teaspoons|serving size|instructions:.*preheat|appetizers.*main course)\b/i,
    message: "The uploaded document appears to be a culinary recipe or menu, not a resume.",
  },
  {
    type: "manual_or_paper",
    regex: /\b(end user license agreement|troubleshooting guide|table of contents.*chapter \d|doi:\s*10\.\d{4}|arxiv:\d{4}\.\d{4})\b/i,
    message: "The uploaded file appears to be a user manual, research paper, or technical book, not a resume.",
  },
];

function validateIsResume(text, parsed) {
  const { education, experience, projects, skills, email, phone, links, name } = parsed;

  // 1. Check for explicit non-resume disqualifiers
  for (const item of NON_RESUME_DISQUALIFIERS) {
    if (item.regex.test(text)) {
      return {
        isValid: false,
        reason: item.message,
        confidence: 0,
        detectedType: item.type,
      };
    }
  }

  // 2. Structural resume presence
  const coreSectionsCount = [
    Boolean(education),
    Boolean(experience),
    Boolean(projects),
    Boolean(skills && skills.length > 0),
  ].filter(Boolean).length;

  const hasContact = Boolean(email || phone || links?.linkedin || links?.github);
  const hasSkills = Boolean(skills && skills.length > 0);
  const hasExperienceOrEducation = Boolean(experience || education);

  let confidence = 0;
  if (hasContact) confidence += 25;
  if (education) confidence += 20;
  if (experience) confidence += 25;
  if (projects) confidence += 15;
  if (hasSkills) confidence += Math.min(25, (skills || []).length * 5);
  if (name) confidence += 10;

  // A valid resume must have:
  // - At least 2 core sections (e.g. skills + education, or skills + experience)
  // - OR contact info + skills + experience/education/projects
  // - Minimum confidence score of 35
  const isValid =
    (coreSectionsCount >= 2 && confidence >= 30) ||
    (hasContact && hasSkills && (hasExperienceOrEducation || projects)) ||
    (hasSkills && (hasExperienceOrEducation || projects || text.length >= 60));

  if (!isValid) {
    let reason = "The uploaded file does not appear to be a valid resume or CV.";
    if (coreSectionsCount === 0) {
      reason =
        "We could not find standard resume sections (such as Education, Experience, Skills, or Projects) in this document. Please upload a professional resume or curriculum vitae.";
    } else if (!hasSkills && !hasContact) {
      reason =
        "No candidate contact details or technical/professional skills could be identified. Please upload a properly formatted resume.";
    } else {
      reason =
        "The document does not contain sufficient resume structure (work history, skills, and academic background). Please upload a complete curriculum vitae.";
    }

    return {
      isValid: false,
      reason,
      confidence,
      detectedType: "unrecognized_document",
    };
  }

  return {
    isValid: true,
    reason: "Document verified as a valid resume/CV.",
    confidence: Math.min(100, confidence),
    detectedType: "resume",
  };
}

const MIN_USABLE_TEXT_LENGTH = 60;

function parseResumeText(text) {
  const trimmed = (text || "").trim();

  if (trimmed.length < MIN_USABLE_TEXT_LENGTH) {
    return {
      rawTextLength: trimmed.length,
      name: null,
      email: null,
      phone: null,
      links: { linkedin: null, github: null },
      education: null,
      experience: null,
      projects: null,
      skills: [],
      structuredSkills: categorizeSkills([]),
      score: { total: 0, breakdown: { skills: 0, education: 0, experience: 0, projects: 0, achievements: 0, description: 0 } },
      warnings: [
        "We couldn't extract readable text from this file — it may be a scanned/image-only PDF, password-protected, " +
          "or empty. Try exporting a text-based PDF or DOCX directly from your word processor instead of scanning a printout.",
      ],
      metrics: [],
      strengths: [],
      atsRating: getAtsRating(0),
      parsedText: "",
      extractionFailed: true,
      isResume: false,
      validationError: "Document is empty or contains unreadable text.",
      detectedType: "empty",
    };
  }

  const email = extractEmail(text);
  const phone = extractPhone(text);
  const name = extractName(text);
  const links = extractLinks(text);
  const summary = extractSection(text, "summary");
  const education = extractSection(text, "education");
  const experience = extractSection(text, "experience");
  const projects = extractSection(text, "projects");
  const certifications = extractSection(text, "certifications");
  const achievements = extractSection(text, "achievements");
  const skills = extractSkills(text);
  const structuredSkills = categorizeSkills(skills);
  const score = scoreResume({ skills, education, experience, projects });
  const warnings = findWeakSections({ experience, projects, skills });
  const metrics = extractMetrics(text);
  const validation = validateIsResume(text, {
    education,
    experience,
    projects,
    skills,
    email,
    phone,
    links,
    name,
  });

  if (!validation.isValid) {
    return {
      rawTextLength: text.length,
      name: null,
      email: null,
      phone: null,
      links: { linkedin: null, github: null },
      education: null,
      experience: null,
      projects: null,
      skills: [],
      structuredSkills: categorizeSkills([]),
      score: { total: 0, breakdown: { skills: 0, education: 0, experience: 0, projects: 0, achievements: 0, description: 0 } },
      warnings: [validation.reason],
      metrics: [],
      strengths: [],
      atsRating: getAtsRating(0),
      parsedText: "",
      extractionFailed: true,
      isResume: false,
      validationError: validation.reason,
      detectedType: validation.detectedType,
    };
  }

  const strengths = [];
  if (skills.length >= 6) {
    strengths.push(`Strong technical skill depth (${skills.length} verified technical skills detected).`);
  }
  if (projects) {
    strengths.push("Technical project portfolio demonstrates hands-on implementation ability.");
  }
  if (metrics.length > 0) {
    strengths.push(`Quantifiable achievements detected (${metrics.length} measurable impact statements found).`);
  }
  if (links.github || links.linkedin) {
    strengths.push("Professional profile links (GitHub / LinkedIn) present for recruiter verification.");
  }
  if (education) {
    strengths.push("Academic background and degree credentials clearly stated.");
  }

  return {
    rawTextLength: text.length,
    name,
    email,
    phone,
    links,
    summary: summary || null,
    education: education || null,
    experience: experience || null,
    projects: projects || null,
    certifications: certifications || null,
    achievements: achievements || null,
    skills,
    structuredSkills,
    score,
    warnings,
    metrics,
    strengths,
    atsRating: getAtsRating(score.total),
    parsedText: text.slice(0, 5000),
    isResume: true,
    resumeConfidence: validation.confidence,
    extractionFailed: false,
  };
}

async function parseResume(filePath, mimetype) {
  const text = await extractText(filePath, mimetype);
  return parseResumeText(text);
}

module.exports = {
  parseResume,
  parseResumeText,
  validateIsResume,
  extractMetrics,
  extractText,
  scoreResume,
  findWeakSections,
  extractSection,
  extractName,
  extractPhone,
  extractEmail,
  extractLinks,
};
