const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const projectService = require('./project.service');
const { authenticate, adminOnly } = require('../../middleware/auth.middleware');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
      'text/csv',
      'application/json'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * POST /api/projects
 * Create a new project (without file upload)
 */
router.post('/', async (req, res) => {
  try {
    const { name, aboutText, websiteUrl, blogRules, idealBlog } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await projectService.createProject({
      name,
      aboutText,
      websiteUrl,
      blogRules,
      idealBlog
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/create-with-files
 * Create a new project with file upload
 */
router.post('/create-with-files', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    const { name, aboutText, websiteUrl, blogRules, idealBlog } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    // Create the project first
    const project = await projectService.createProject({
      name,
      aboutText,
      websiteUrl,
      blogRules,
      idealBlog
    });

    // Process uploaded files if any
    let fileProcessingResults = [];
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded files for project ${project.id}`);

      for (const file of req.files) {
        try {
          const result = await projectService.processUploadedFile(
            project.id,
            file.path,
            file.originalname,
            file.mimetype
          );
          fileProcessingResults.push(result);
        } catch (fileError) {
          console.error(`Error processing file ${file.originalname}:`, fileError);
          fileProcessingResults.push({
            fileName: file.originalname,
            error: fileError.message
          });
        }
      }
    }

    res.status(201).json({
      project,
      fileProcessingResults,
      filesProcessed: fileProcessingResults.length
    });
  } catch (error) {
    console.error('Create project with files route error:', error);

    // Clean up uploaded files if project creation failed
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects
 * Get all projects
 */
router.get('/', async (req, res) => {
  try {
    const projects = await projectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    console.error('Get projects route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/projects/:id
 * Get a single project
 */
router.get('/:id', async (req, res) => {
  try {
    const project = await projectService.getProjectById(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, aboutText, websiteUrl, blogRules, idealBlog } = req.body;
    const project = await projectService.updateProject(req.params.id, {
      name,
      aboutText,
      websiteUrl,
      blogRules,
      idealBlog
    });
    res.json(project);
  } catch (error) {
    console.error('Update project route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await projectService.deleteProject(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete project route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/projects/:id/upload
 * Upload additional files to an existing project
 */
router.post('/:id/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const projectId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await projectService.processUploadedFile(
      projectId,
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    res.json(result);
  } catch (error) {
    console.error('File upload to project error:', error);

    // Clean up file if it still exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
