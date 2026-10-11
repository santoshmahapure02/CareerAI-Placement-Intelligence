const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authRequired, requireRole, JWT_SECRET } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { validateBody, registerSchema, loginSchema, createAccountSchema } = require("../utils/validation");

const router = express.Router();

// Public registration allows self-service "student" or "recruiter" signup
// (both are normal, unprivileged account types - this mirrors how real
// platforms like LinkedIn or Indeed let job-seekers AND employers self
// register). "admin" is never accepted here - that was a real
// vulnerability: a public request could previously pass role:"admin" and
// get administrative access. Admin accounts can only be provisioned by an
// existing admin via /auth/create-account below.
router.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const allUsers = await db.users.all();
    
    const safeRole = role === "recruiter" ? "recruiter" : "student";

    const existing = await db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return res.status(409).json({ error: "Email already registered. Please sign in instead." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.users.insert({ name, email, passwordHash, role: safeRole });

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

// Admin-only: provision a recruiter or admin account. This is the only
// legitimate way to create a non-self-service account (i.e. "admin").
router.post(
  "/create-account",
  authRequired,
  requireRole("admin"),
  validateBody(createAccountSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    const existing = await db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.users.insert({ name, email, passwordHash, role });
    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  })
);

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password, expectedRole } = req.body;
    const user = await db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "No account found with this email. Please register first." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    if (expectedRole && user.role !== expectedRole) {
      const isRecruiter = user.role === "recruiter";
      return res.status(403).json({
        error: `This account is registered as a ${isRecruiter ? "Recruiter" : "Student"}. Please select the ${isRecruiter ? "Recruiter" : "Student"} tab to sign in.`,
        registeredRole: user.role,
      });
    }

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  })
);

router.get(
  "/me",
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await db.users.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  })
);

module.exports = router;
