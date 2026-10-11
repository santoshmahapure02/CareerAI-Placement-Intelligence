const { extractSection, extractName, extractPhone, extractEmail, extractLinks, scoreResume } = require("../utils/resumeParser");

describe("extractName", () => {
  test("picks the first line that looks like a person's name", () => {
    const text = "Santosh Kumar\nsantosh@careerai.dev | +91 91234 56789\n\nEducation\nB.Tech...";
    expect(extractName(text)).toBe("Santosh Kumar");
  });

  test("skips a 'Resume' title line and section-heading-like lines", () => {
    const text = "RESUME\nPriya Sharma\npriya@careerai.dev";
    expect(extractName(text)).toBe("Priya Sharma");
  });

  test("returns null when nothing plausible is found", () => {
    const text = "1234567890\nsome@email.com\nwww.example.com";
    expect(extractName(text)).toBeNull();
  });
});

describe("extractPhone", () => {
  test("extracts a country-code-prefixed number", () => {
    expect(extractPhone("Call me at +91 91234 56789 anytime")).toBe("+91 91234 56789");
  });

  test("extracts a US-style parenthesized number", () => {
    expect(extractPhone("Phone: (415) 555-0199")).toBe("(415) 555-0199");
  });

  test("does not false-positive on a short date-like sequence", () => {
    // 2024-05 alone is too short to satisfy any phone pattern's digit count/shape
    expect(extractPhone("Graduated 2024-05")).toBeNull();
  });
});

describe("extractEmail", () => {
  test("extracts a standard email", () => {
    expect(extractEmail("Contact: jane.doe@example.co.in for details")).toBe("jane.doe@example.co.in");
  });
});

describe("extractLinks", () => {
  test("extracts linkedin and github profile URLs", () => {
    const text = "linkedin.com/in/jane-doe and github.com/janedoe are my profiles";
    const links = extractLinks(text);
    expect(links.linkedin).toContain("linkedin.com/in/jane-doe");
    expect(links.github).toContain("github.com/janedoe");
  });

  test("returns nulls when no links are present", () => {
    const links = extractLinks("No links here.");
    expect(links.linkedin).toBeNull();
    expect(links.github).toBeNull();
  });
});

describe("extractSection - heading synonym recognition", () => {
  test("recognizes 'Work Experience' as the experience section", () => {
    const text = "Summary\nBuilt things.\n\nWork Experience\nDid backend work at Acme for 2 years.\n\nEducation\nB.Tech.";
    const section = extractSection(text, "experience");
    expect(section).toContain("backend work at Acme");
  });

  test("recognizes 'Academic Background' as the education section", () => {
    const text = "Academic Background\nB.Tech Computer Science, XYZ University.\n\nProjects\nBuilt a website.";
    const section = extractSection(text, "education");
    expect(section).toContain("B.Tech Computer Science");
  });

  test("does not false-match a sentence merely containing the word 'experience'", () => {
    const text = "Summary\nI have 3 years of experience in backend systems and enjoy building APIs.\n\nEducation\nB.Tech.";
    // "experience" appears mid-sentence, not as its own heading line, so this must NOT be captured.
    const section = extractSection(text, "experience");
    expect(section).toBe("");
  });

  test("returns an empty string when the section truly isn't present", () => {
    const text = "Summary\nJust a summary, nothing else.";
    expect(extractSection(text, "projects")).toBe("");
  });
});

describe("scoreResume", () => {
  test("gives a low score to an empty/minimal resume", () => {
    const { total } = scoreResume({ skills: [], education: null, experience: null, projects: null });
    expect(total).toBeLessThan(30);
  });

  test("gives a higher score to a fuller resume", () => {
    const { total } = scoreResume({
      skills: ["React", "Node.js", "MySQL", "Docker", "AWS"],
      education: "B.Tech Computer Science, 2025.",
      experience: "Built and deployed a Node.js REST API serving 10k requests/day, reducing latency by 30%.",
      projects: "Built a full-stack job board with React, Node.js, and MySQL, deployed via Docker on AWS.",
    });
    expect(total).toBeGreaterThan(45);
  });
});

describe("parseResume - unreadable/near-empty document handling", () => {
  const { parseResume } = require("../utils/resumeParser");
  const fs = require("fs");
  const os = require("os");
  const path = require("path");

  test("flags extractionFailed instead of silently scoring near-empty text as a bad resume", async () => {
    const tmpFile = path.join(os.tmpdir(), `empty-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, "   \n\n  "); // whitespace only, well under MIN_USABLE_TEXT_LENGTH
    const result = await parseResume(tmpFile, "text/plain");
    fs.unlinkSync(tmpFile);

    expect(result.extractionFailed).toBe(true);
    expect(result.score.total).toBe(0);
    expect(result.warnings[0]).toMatch(/couldn't extract readable text/i);
  });

  test("parses normally once there's enough real text", async () => {
    const tmpFile = path.join(os.tmpdir(), `ok-${Date.now()}.txt`);
    fs.writeFileSync(
      tmpFile,
      "Jordan Lee\njordan@example.com\n\nSkills\nPython, Django, PostgreSQL, Docker\n\nProjects\nBuilt a Django app deployed with Docker."
    );
    const result = await parseResume(tmpFile, "text/plain");
    fs.unlinkSync(tmpFile);

    expect(result.extractionFailed).toBe(false);
    expect(result.email).toBe("jordan@example.com");
    expect(result.skills).toEqual(expect.arrayContaining(["Python", "Django", "PostgreSQL", "Docker"]));
  });
});
