-- CareerAI MySQL schema
-- Run with: mysql -u root -p careerai < schema.sql
-- (create the database first: CREATE DATABASE careerai;)

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  passwordHash VARCHAR(255) NOT NULL,
  role ENUM('student', 'recruiter', 'admin') NOT NULL DEFAULT 'student',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  filename VARCHAR(255),
  storedFilename VARCHAR(255),
  name VARCHAR(255),
  skills JSON,
  structuredSkills JSON,
  education TEXT,
  experience TEXT,
  projects TEXT,
  email VARCHAR(255),
  phone VARCHAR(64),
  links JSON,
  score INT,
  scoreBreakdown JSON,
  warnings JSON,
  parsedText MEDIUMTEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  requiredSkills JSON,
  location VARCHAR(255) DEFAULT 'Remote',
  workplaceType ENUM('remote', 'hybrid', 'on-site') DEFAULT 'remote',
  experienceLevel ENUM('intern', 'entry', 'mid', 'senior', 'lead') DEFAULT 'mid',
  jobType ENUM('full-time', 'part-time', 'contract', 'internship') DEFAULT 'full-time',
  salary VARCHAR(255),
  source VARCHAR(64) DEFAULT 'platform',
  sourceJobId VARCHAR(255),
  url VARCHAR(512),
  postedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  lastSyncedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  isActive BOOLEAN DEFAULT TRUE,
  createdBy INT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  jobId INT NOT NULL,
  status ENUM('Applied', 'Assessment', 'Interview', 'Offer', 'Rejected') NOT NULL DEFAULT 'Applied',
  appliedDate DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_user_job (userId, jobId)
) ENGINE=InnoDB;

CREATE INDEX idx_resumes_userId ON resumes(userId);
CREATE INDEX idx_applications_userId ON applications(userId);
CREATE INDEX idx_applications_jobId ON applications(jobId);
CREATE INDEX idx_jobs_createdBy ON jobs(createdBy);
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_postedAt ON jobs(postedAt);
CREATE INDEX idx_jobs_isActive ON jobs(isActive);

-- Migration note: if you already applied an earlier version of this schema
-- (before structuredSkills / the duplicate-application constraint existed),
-- run this instead of recreating the database:
--   ALTER TABLE resumes ADD COLUMN structuredSkills JSON AFTER skills;
--   ALTER TABLE applications ADD UNIQUE KEY uniq_user_job (userId, jobId);
--
-- Migration note (V3 parser upgrade): if you already have a resumes table
-- from before name/links extraction was added, run:
--   ALTER TABLE resumes ADD COLUMN name VARCHAR(255) AFTER storedFilename;
--   ALTER TABLE resumes ADD COLUMN links JSON AFTER phone;
--
-- Migration note (V6 Real-Time Placement Intelligence):
--   ALTER TABLE jobs
--     ADD COLUMN location VARCHAR(255) DEFAULT 'Remote' AFTER requiredSkills,
--     ADD COLUMN workplaceType ENUM('remote', 'hybrid', 'on-site') DEFAULT 'remote' AFTER location,
--     ADD COLUMN experienceLevel ENUM('intern', 'entry', 'mid', 'senior', 'lead') DEFAULT 'mid' AFTER workplaceType,
--     ADD COLUMN jobType ENUM('full-time', 'part-time', 'contract', 'internship') DEFAULT 'full-time' AFTER experienceLevel,
--     ADD COLUMN salary VARCHAR(255) AFTER jobType,
--     ADD COLUMN source VARCHAR(64) DEFAULT 'platform' AFTER salary,
--     ADD COLUMN sourceJobId VARCHAR(255) AFTER source,
--     ADD COLUMN url VARCHAR(512) AFTER sourceJobId,
--     ADD COLUMN postedAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER url,
--     ADD COLUMN lastSyncedAt DATETIME DEFAULT CURRENT_TIMESTAMP AFTER postedAt,
--     ADD COLUMN isActive BOOLEAN DEFAULT TRUE AFTER lastSyncedAt;
--   CREATE INDEX idx_jobs_source ON jobs(source);
--   CREATE INDEX idx_jobs_postedAt ON jobs(postedAt);
--   CREATE INDEX idx_jobs_isActive ON jobs(isActive);
