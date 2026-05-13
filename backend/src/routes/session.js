const express = require('express');
const router = express.Router();

// GET /api/session/roles - Available interview roles
router.get('/roles', (req, res) => {
  const roles = [
    { id: 'software-engineer', label: 'Software Engineer', icon: '💻', category: 'Engineering' },
    { id: 'frontend-developer', label: 'Frontend Developer', icon: '🎨', category: 'Engineering' },
    { id: 'backend-developer', label: 'Backend Developer', icon: '⚙️', category: 'Engineering' },
    { id: 'fullstack-developer', label: 'Full Stack Developer', icon: '🔄', category: 'Engineering' },
    { id: 'data-scientist', label: 'Data Scientist', icon: '📊', category: 'Data & AI' },
    { id: 'machine-learning-engineer', label: 'ML Engineer', icon: '🤖', category: 'Data & AI' },
    { id: 'data-analyst', label: 'Data Analyst', icon: '📈', category: 'Data & AI' },
    { id: 'devops-engineer', label: 'DevOps Engineer', icon: '🚀', category: 'Infrastructure' },
    { id: 'cloud-architect', label: 'Cloud Architect', icon: '☁️', category: 'Infrastructure' },
    { id: 'cybersecurity-analyst', label: 'Cybersecurity Analyst', icon: '🔐', category: 'Security' },
    { id: 'product-manager', label: 'Product Manager', icon: '📋', category: 'Management' },
    { id: 'project-manager', label: 'Project Manager', icon: '📅', category: 'Management' },
    { id: 'hr-manager', label: 'HR Manager', icon: '👥', category: 'HR' },
    { id: 'business-analyst', label: 'Business Analyst', icon: '📐', category: 'Business' },
    { id: 'ux-designer', label: 'UX Designer', icon: '✏️', category: 'Design' },
    { id: 'marketing-manager', label: 'Marketing Manager', icon: '📢', category: 'Marketing' }
  ];
  res.json(roles);
});

module.exports = router;
