// utils/skills.js
// Canonical skill list + normalization aliases, as described in the design
// doc's "Job Description Analyzer" section (JS -> JavaScript, etc).
// This is what powers keyword-based skill extraction and normalization.

const CANONICAL_SKILLS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C", "C#", "Go", "Rust",
  "React", "Redux", "Vue", "Angular", "Next.js", "Node.js", "Express",
  "Spring Boot", "Django", "Flask", "FastAPI", ".NET",
  "REST API", "GraphQL", "gRPC", "WebSockets",
  "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "SQL", "NoSQL",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Jenkins", "Terraform",
  "Git", "GitHub", "Linux", "Bash",
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "TensorFlow",
  "PyTorch", "Scikit-learn", "Pandas", "NumPy",
  "HTML", "CSS", "Tailwind CSS", "Bootstrap",
  "Kafka", "RabbitMQ", "Microservices", "System Design",
  "Jest", "PyTest", "JUnit", "Testing",
  "Android", "iOS", "Kotlin", "Swift", "Flutter", "React Native",
  "Agile", "Scrum", "JWT", "OAuth", "Spring Security",
];

// alias (lowercased) -> canonical name
const ALIASES = {
  "js": "JavaScript",
  "ecmascript": "JavaScript",
  "ts": "TypeScript",
  "react.js": "React",
  "reactjs": "React",
  "vue.js": "Vue",
  "vuejs": "Vue",
  "node": "Node.js",
  "nodejs": "Node.js",
  "express.js": "Express",
  "expressjs": "Express",
  "spring": "Spring Boot",
  "springboot": "Spring Boot",
  "sql db": "SQL",
  "sqldb": "SQL",
  "postgres": "PostgreSQL",
  "mongo": "MongoDB",
  "k8s": "Kubernetes",
  "amazon web services": "AWS",
  "google cloud": "GCP",
  "google cloud platform": "GCP",
  "microsoft azure": "Azure",
  "ml": "Machine Learning",
  "dl": "Deep Learning",
  "natural language processing": "NLP",
  "cv": "Computer Vision",
  "restful api": "REST API",
  "rest apis": "REST API",
  "restful apis": "REST API",
  "html5": "HTML",
  "css3": "CSS",
  "tailwind": "Tailwind CSS",
  "c plusplus": "C++",
  "cpp": "C++",
  "csharp": "C#",
  "dotnet": ".NET",
  "unit testing": "Testing",
  "test automation": "Testing",
};

function normalizeToken(token) {
  const t = token.trim().toLowerCase();
  if (ALIASES[t]) return ALIASES[t];
  const canonicalMatch = CANONICAL_SKILLS.find((s) => s.toLowerCase() === t);
  return canonicalMatch || null;
}

// Structured resume profile categories - each canonical skill belongs to
// exactly one category so a resume can be shown as a clean profile
// ("Languages: Java, Python | Databases: MySQL") instead of one flat list.
const SKILL_CATEGORIES = {
  programming_languages: ["JavaScript", "TypeScript", "Python", "Java", "C++", "C", "C#", "Go", "Rust", "Kotlin", "Swift"],
  frameworks: [
    "React", "Redux", "Vue", "Angular", "Next.js", "Node.js", "Express", "Spring Boot",
    "Django", "Flask", "FastAPI", ".NET", "Bootstrap", "Tailwind CSS", "React Native", "Flutter",
  ],
  databases: ["MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "SQL", "NoSQL"],
  cloud_devops: ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Jenkins", "Terraform", "Linux", "Bash"],
  ai_ml: ["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Scikit-learn", "Pandas", "NumPy"],
  mobile: ["Android", "iOS"],
  tools_and_practices: [
    "Git", "GitHub", "Jest", "PyTest", "JUnit", "Testing", "Kafka", "RabbitMQ", "Microservices",
    "System Design", "Agile", "Scrum", "JWT", "OAuth", "Spring Security", "REST API", "GraphQL",
    "gRPC", "WebSockets", "HTML", "CSS",
  ],
};

const SKILL_TO_CATEGORY = Object.fromEntries(
  Object.entries(SKILL_CATEGORIES).flatMap(([category, skills]) => skills.map((s) => [s, category]))
);

// Turns a flat skill list into a structured profile:
// { programming_languages: [...], frameworks: [...], databases: [...], ... }
// Any canonical skill not explicitly categorized above lands in "other"
// rather than being silently dropped.
function categorizeSkills(skills) {
  const profile = {
    programming_languages: [],
    frameworks: [],
    databases: [],
    cloud_devops: [],
    ai_ml: [],
    mobile: [],
    tools_and_practices: [],
    other: [],
  };
  for (const skill of skills) {
    const category = SKILL_TO_CATEGORY[skill] || "other";
    profile[category].push(skill);
  }
  return profile;
}

// Extract canonical skills mentioned anywhere in free text.
function extractSkills(text) {
  if (!text) return [];
  const found = new Set();
  const lower = text.toLowerCase();

  // Check every canonical skill (handles multi-word skills like "Spring Boot")
  for (const skill of CANONICAL_SKILLS) {
    const pattern = new RegExp(
      `(?<![a-z0-9+.#])${skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`,
      "i"
    );
    if (pattern.test(lower)) found.add(skill);
  }

  // Check aliases
  for (const [alias, canonical] of Object.entries(ALIASES)) {
    const pattern = new RegExp(`(?<![a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i");
    if (pattern.test(lower)) found.add(canonical);
  }

  return Array.from(found);
}

module.exports = { CANONICAL_SKILLS, ALIASES, SKILL_CATEGORIES, normalizeToken, extractSkills, categorizeSkills };
