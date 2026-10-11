// utils/validation.js
const { z } = require("zod");

// Middleware factory: validates req.body against a Zod schema, returns a
// clean 400 with field-level messages on failure instead of letting bad
// input reach the database layer.
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
      return res.status(400).json({ error: message });
    }
    req.body = result.data;
    next();
  };
}

// Password policy: at least 8 characters, at least one letter and one
// number. Stronger than the previous "6+ characters, anything goes" rule.
const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: passwordSchema,
  role: z.enum(["student", "recruiter"]).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  expectedRole: z.enum(["student", "recruiter", "admin"]).optional(),
});

const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255),
  password: passwordSchema,
  role: z.enum(["student", "recruiter", "admin"]),
});

const jobSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(255),
  company: z.string().trim().min(1, "Company is required").max(255),
  description: z.string().trim().min(20, "Description should be at least 20 characters"),
  requiredSkills: z.array(z.string()).optional(),
  location: z.string().trim().optional(),
  workplaceType: z.enum(["remote", "hybrid", "on-site"]).optional(),
  experienceLevel: z.enum(["intern", "entry", "mid", "senior", "lead"]).optional(),
  jobType: z.enum(["full-time", "part-time", "contract", "internship"]).optional(),
  salary: z.string().trim().optional(),
  url: z.string().trim().optional(),
});

const applicationSchema = z.object({
  jobId: z.union([z.string(), z.number()]).refine((v) => !Number.isNaN(Number(v)), "jobId must be a number"),
  status: z.enum(["Applied", "Assessment", "Interview", "Offer", "Rejected"]).optional(),
});

module.exports = {
  validateBody,
  registerSchema,
  loginSchema,
  createAccountSchema,
  jobSchema,
  applicationSchema,
};
