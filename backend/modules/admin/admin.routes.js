const express = require('express');
const router = express.Router();
const adminCrawlingService = require('./admin.crawling.service');
const { authenticate, adminOnly } = require('../../middleware/auth.middleware');

/**
 * POST /api/admin/crawling-schedules
 * Create or update crawling schedule for a project
 */
router.post('/crawling-schedules', authenticate, adminOnly, async (req, res) => {
  try {
    const { projectId, scheduleType, intervalDays } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!['immediate', 'daily', 'weekly', 'monthly'].includes(scheduleType)) {
      return res.status(400).json({ error: 'Invalid schedule type' });
    }

    const schedule = await adminCrawlingService.updateCrawlingSchedule(
      projectId,
      scheduleType,
      intervalDays
    );

    res.json(schedule);
  } catch (error) {
    console.error('Create/Update crawling schedule route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/crawling-schedules
 * Get all crawling schedules
 */
router.get('/crawling-schedules', authenticate, adminOnly, async (req, res) => {
  try {
    const schedules = await adminCrawlingService.getAllCrawlingSchedules();
    res.json(schedules);
  } catch (error) {
    console.error('Get all crawling schedules route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/crawling-schedules/:projectId
 * Get crawling schedule for a specific project
 */
router.get('/crawling-schedules/project/:projectId', authenticate, adminOnly, async (req, res) => {
  try {
    const schedule = await adminCrawlingService.getCrawlingSchedule(req.params.projectId);

    if (!schedule) {
      return res.status(404).json({ error: 'Crawling schedule not found for this project' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Get crawling schedule route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/crawling-schedules/:id/toggle
 * Activate/deactivate crawling schedule
 */
router.put('/crawling-schedules/:id/toggle', authenticate, adminOnly, async (req, res) => {
  try {
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Active status must be a boolean' });
    }

    const schedule = await adminCrawlingService.toggleCrawlingSchedule(
      req.params.id,
      active
    );

    res.json(schedule);
  } catch (error) {
    console.error('Toggle crawling schedule route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/crawling-schedules/:id
 * Delete crawling schedule
 */
router.delete('/crawling-schedules/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const result = await adminCrawlingService.deleteCrawlingSchedule(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete crawling schedule route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/crawl-immediate/:projectId
 * Perform immediate crawl for a project
 */
router.post('/crawl-immediate/:projectId', authenticate, adminOnly, async (req, res) => {
  try {
    const result = await adminCrawlingService.performImmediateCrawl(req.params.projectId);
    res.json(result);
  } catch (error) {
    console.error('Perform immediate crawl route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/crawling-stats
 * Get crawling statistics
 */
router.get('/crawling-stats', authenticate, adminOnly, async (req, res) => {
  try {
    const stats = await adminCrawlingService.getCrawlingStats();
    res.json(stats);
  } catch (error) {
    console.error('Get crawling stats route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/crawl-due
 * Process all due crawls (for cron job)
 */
router.post('/crawl-due', authenticate, adminOnly, async (req, res) => {
  try {
    const dueCrawls = await adminCrawlingService.getDueCrawls();
    const results = [];

    for (const crawl of dueCrawls) {
      try {
        const result = await adminCrawlingService.performImmediateCrawl(crawl.project_id);
        results.push({
          projectId: crawl.project_id,
          projectName: crawl.project_name,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          projectId: crawl.project_id,
          projectName: crawl.project_name,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('Process due crawls route error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;