const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { authRequired } = require("../middleware/auth");
const { parseResume, parseResumeText } = require("../utils/resumeParser");
const { assessResumeWithAI } = require("../utils/aiResumeModel");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF and DOCX files are allowed"));
  },
});

router.post("/upload", authRequired, upload.single("resume"), async (req, res) => {
  let uploadedFilePath = null;
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    uploadedFilePath = req.file.path;

    const parsed = await parseResume(req.file.path, req.file.mimetype);

    // Validate that the document is genuinely a resume/CV
    if (parsed.isResume === false || parsed.extractionFailed) {
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try { fs.unlinkSync(uploadedFilePath); } catch {}
      }
      return res.status(400).json({
        error: parsed.validationError || parsed.warnings?.[0] || "The uploaded file does not appear to be a valid resume or CV.",
        isResume: false,
        detectedType: parsed.detectedType || "unrecognized",
      });
    }

    const aiAssessment = await assessResumeWithAI(parsed);

    const resume = await db.resumes.insert({
      userId: req.user.id,
      filename: req.file.originalname,
      storedFilename: req.file.filename,
      name: parsed.name,
      skills: parsed.skills,
      structuredSkills: parsed.structuredSkills,
      summary: parsed.summary,
      education: parsed.education,
      experience: parsed.experience,
      projects: parsed.projects,
      certifications: parsed.certifications,
      achievements: parsed.achievements,
      email: parsed.email,
      phone: parsed.phone,
      links: parsed.links,
      score: parsed.score.total,
      scoreBreakdown: parsed.score.breakdown,
      warnings: parsed.warnings,
      metrics: parsed.metrics,
      strengths: parsed.strengths,
      atsRating: parsed.atsRating,
      parsedText: parsed.parsedText,
      aiAssessment,
    });

    res.status(201).json(resume);
  } catch (err) {
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try { fs.unlinkSync(uploadedFilePath); } catch {}
    }
    res.status(400).json({ error: err.message || "Failed to parse resume" });
  }
});

router.post(
  "/analyze-text",
  authRequired,
  asyncHandler(async (req, res) => {
    const { text, title } = req.body;
    if (!text || typeof text !== "string" || text.trim().length < 30) {
      return res.status(400).json({ error: "Please provide resume text with at least 30 characters" });
    }

    const parsed = parseResumeText(text);

    // Validate that the text is genuinely a resume/CV
    if (parsed.isResume === false || parsed.extractionFailed) {
      return res.status(400).json({
        error: parsed.validationError || parsed.warnings?.[0] || "The provided text does not appear to be a valid resume or CV.",
        isResume: false,
        detectedType: parsed.detectedType || "unrecognized",
      });
    }

    const aiAssessment = await assessResumeWithAI(parsed);

    const resume = await db.resumes.insert({
      userId: req.user.id,
      filename: title || "Pasted Resume Text",
      storedFilename: `text-resume-${Date.now()}`,
      name: parsed.name,
      skills: parsed.skills,
      structuredSkills: parsed.structuredSkills,
      summary: parsed.summary,
      education: parsed.education,
      experience: parsed.experience,
      projects: parsed.projects,
      certifications: parsed.certifications,
      achievements: parsed.achievements,
      email: parsed.email,
      phone: parsed.phone,
      links: parsed.links,
      score: parsed.score.total,
      scoreBreakdown: parsed.score.breakdown,
      warnings: parsed.warnings,
      metrics: parsed.metrics,
      strengths: parsed.strengths,
      atsRating: parsed.atsRating,
      parsedText: parsed.parsedText,
      aiAssessment,
    });

    res.status(201).json(resume);
  })
);

router.get(
  "/mine",
  authRequired,
  asyncHandler(async (req, res) => {
    const resumes = (await db.resumes.filter((r) => r.userId === req.user.id)).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(resumes);
  })
);

router.get(
  "/:id",
  authRequired,
  asyncHandler(async (req, res) => {
    const resume = await db.resumes.findById(req.params.id);
    if (!resume) return res.status(404).json({ error: "Resume not found" });
    if (resume.userId !== req.user.id && req.user.role === "student") {
      return res.status(403).json({ error: "Not your resume" });
    }
    res.json(resume);
  })
);

router.post(
  "/:id/ai-assessment",
  authRequired,
  asyncHandler(async (req, res) => {
    const resume = await db.resumes.findById(req.params.id);
    if (!resume) return res.status(404).json({ error: "Resume not found" });
    if (resume.userId !== req.user.id && req.user.role === "student") {
      return res.status(403).json({ error: "Not your resume" });
    }
    const assessment = await assessResumeWithAI(resume);
    await db.resumes.update(resume.id, { aiAssessment: assessment });
    res.json(assessment);
  })
);

router.post(
  "/ai-assess",
  authRequired,
  asyncHandler(async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== "string" || text.trim().length < 30) {
      return res.status(400).json({ error: "Please provide resume text with at least 30 characters" });
    }
    const assessment = await assessResumeWithAI(text);
    res.json(assessment);
  })
);


module.exports = router;

