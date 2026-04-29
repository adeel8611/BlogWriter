const express = require('express');
const router = express.Router();
const crawlerService = require('./crawler.service');
const { authenticate, adminOnly } = require('../../middleware/auth.middleware');

/**
 * POST /api/crawl/:projectId
 * Crawl a website for a project (admin only)
 */
router.post('/:projectId', authenticate, adminOnly, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Website URL is required' });
    }

    const result = await crawlerService.crawlWebsite(projectId, url);
    res.json(result);
  } catch (error) {
    console.error('Crawl route error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
