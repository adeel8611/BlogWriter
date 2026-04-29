const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const documentService = require('./document.service');
const { authenticate, optionalAuth } = require('../../middleware/auth.middleware');

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
 * POST /api/documents/upload/:projectId
 * Upload and process a document
 */
router.post('/upload/:projectId', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`File uploaded: ${req.file.filename}, size: ${req.file.size} bytes`);

    // Process and store the document
    const result = await documentService.processAndStoreDocument(
      projectId,
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      req.user.id
    );

    res.json(result);
  } catch (error) {
    console.error('Document upload error:', error);

    // Clean up file if it still exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/documents/supported-types
 * Get list of supported file types
 */
router.get('/supported-types', (req, res) => {
  const types = documentService.getSupportedFileTypes();
  res.json(types);
});

/**
 * GET /api/documents/:projectId
 * Get uploaded files for a project
 */
router.get('/:projectId', optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const ragService = require('../rag/rag.service');

    const files = await ragService.getUploadedFiles(projectId);
    res.json(files);
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
