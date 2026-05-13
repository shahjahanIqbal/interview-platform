const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'));
  }
});

async function extractTextFromBuffer(buffer, mimetype, originalname) {
  const ext = path.extname(originalname).toLowerCase();

  if (ext === '.txt') {
    return buffer.toString('utf-8');
  }

  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      return data.text;
    } catch (err) {
      throw new Error('Failed to parse PDF: ' + err.message);
    }
  }

  if (ext === '.docx' || ext === '.doc') {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (err) {
      throw new Error('Failed to parse DOCX: ' + err.message);
    }
  }

  return buffer.toString('utf-8');
}

function analyzeResume(text) {
  const analysis = {
    rawText: text,
    summary: '',
    experiences: [],
    projects: [],
    skills: [],
    education: [],
    gaps: [],
    highlights: []
  };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Extract skills (look for common skill sections)
  const skillKeywords = ['skills', 'technologies', 'tools', 'languages', 'frameworks', 'stack'];
  let inSkillSection = false;
  const techWords = ['python', 'javascript', 'react', 'node', 'java', 'sql', 'aws', 'docker', 'kubernetes',
    'typescript', 'html', 'css', 'mongodb', 'postgresql', 'git', 'linux', 'c++', 'go', 'rust',
    'tensorflow', 'pytorch', 'machine learning', 'deep learning', 'nlp', 'api', 'rest', 'graphql'];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (skillKeywords.some(k => lower.includes(k))) {
      inSkillSection = true;
    }
    if (inSkillSection && line.length < 200) {
      const foundTechs = techWords.filter(t => lower.includes(t));
      analysis.skills.push(...foundTechs);
    }
  }
  analysis.skills = [...new Set(analysis.skills)].slice(0, 20);

  // Extract years/dates for experience gap analysis
  const yearPattern = /\b(20\d{2}|19\d{2})\b/g;
  const allYears = [];
  let match;
  while ((match = yearPattern.exec(text)) !== null) {
    allYears.push(parseInt(match[1]));
  }

  const sortedYears = [...new Set(allYears)].sort();
  for (let i = 1; i < sortedYears.length; i++) {
    if (sortedYears[i] - sortedYears[i - 1] > 1) {
      analysis.gaps.push({
        from: sortedYears[i - 1],
        to: sortedYears[i],
        duration: sortedYears[i] - sortedYears[i - 1]
      });
    }
  }

  // Extract project section
  const projectKeywords = ['project', 'built', 'developed', 'created', 'implemented', 'designed'];
  for (const line of lines) {
    if (projectKeywords.some(k => line.toLowerCase().includes(k)) && line.length > 20) {
      analysis.projects.push(line.substring(0, 150));
    }
  }
  analysis.projects = analysis.projects.slice(0, 5);

  // Experience sections
  const expKeywords = ['experience', 'worked', 'engineer', 'developer', 'analyst', 'manager', 'intern'];
  for (const line of lines) {
    if (expKeywords.some(k => line.toLowerCase().includes(k)) && line.length > 20 && line.length < 200) {
      analysis.experiences.push(line.substring(0, 150));
    }
  }
  analysis.experiences = analysis.experiences.slice(0, 8);

  // Build summary for AI context
  const summaryParts = [];
  if (analysis.skills.length) summaryParts.push(`Skills: ${analysis.skills.join(', ')}`);
  if (analysis.experiences.length) summaryParts.push(`Experience highlights: ${analysis.experiences.slice(0, 3).join('; ')}`);
  if (analysis.projects.length) summaryParts.push(`Projects: ${analysis.projects.slice(0, 2).join('; ')}`);
  if (analysis.gaps.length) summaryParts.push(`Employment gaps detected: ${analysis.gaps.map(g => `${g.from}-${g.to} (${g.duration} year gap)`).join(', ')}`);

  analysis.summary = summaryParts.join('. ');
  analysis.highlights = [
    analysis.skills.length > 0 ? `${analysis.skills.length} technical skills identified` : null,
    analysis.projects.length > 0 ? `${analysis.projects.length} projects found` : null,
    analysis.experiences.length > 0 ? `${analysis.experiences.length} experience entries` : null,
    analysis.gaps.length > 0 ? `${analysis.gaps.length} potential employment gap(s)` : null
  ].filter(Boolean);

  return analysis;
}

// POST /api/resume/upload
router.post('/upload', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const text = await extractTextFromBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract meaningful text from the resume' });
    }

    const analysis = analyzeResume(text);

    res.json({
      success: true,
      filename: req.file.originalname,
      analysis: {
        skills: analysis.skills,
        experiences: analysis.experiences,
        projects: analysis.projects,
        gaps: analysis.gaps,
        highlights: analysis.highlights,
        summary: analysis.summary,
        rawTextLength: text.length
      },
      context: analysis.summary // This gets passed to the AI for question generation
    });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to process resume' });
  }
});

module.exports = router;
