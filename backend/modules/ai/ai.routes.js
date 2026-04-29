const express = require('express');
const router = express.Router();
const aiService = require('./ai.service');
const blogService = require('../blogs/blog.service');

/**
 * POST /api/ai/generate-blog
 * Generate a blog post using AI
 *
 * Backend loads all context from database:
 * - Blog rules from project
 * - Ideal blog (style guide) from project
 * - RAG documents from vector DB (semantic search)
 * - Skills file (hardcoded, same for all projects)
 */
router.post('/generate-blog', async (req, res) => {
  try {
    const { projectId, topic } = req.body;

    console.log('=== Generate Blog Request ===');
    console.log('Project ID:', projectId);
    console.log('Topic:', topic);
    console.log('=============================');

    if (!projectId || !topic) {
      return res.status(400).json({ error: 'Project ID and topic are required' });
    }

    // Generate blog content using AI
    // Backend automatically loads: rules, ideal blog, RAG, skills
    const generated = await aiService.generateBlog(projectId, topic);

    // Save the generated blog to the database
    const blog = await blogService.createBlog({
      projectId,
      title: generated.title,
      content: generated.content
    });

    // Return the blog with additional generation info
    res.json({
      ...blog,
      contextUsed: generated.contextUsed,
      contextSources: generated.contextSources
    });
  } catch (error) {
    console.error('AI generation route error:', error.message);

    // Return 429 for rate limit errors
    if (error.isRateLimit) {
      console.warn('⚠️  Rate limit error. User should wait before retrying.');
      res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter || 60
      });
      return;
    }

    // Check for payload too large
    if (error.response?.status === 413 || error.message?.includes('payload')) {
      res.status(413).json({
        error: 'Request payload too large. Please try with a shorter topic.',
        suggestion: 'Make sure project blog rules, about text, and ideal blog are not excessively long'
      });
      return;
    }

    // Generic server error
    res.status(500).json({
      error: error.message || 'Failed to generate blog'
    });
  }
});

/**
 * POST /api/ai/generate-blog-preview
 * Generate a blog post preview without saving to database
 */
router.post('/generate-blog-preview', async (req, res) => {
  try {
    const { projectId, topic, rag, mdFile, instructions } = req.body;

    // Log incoming request details
    console.log('=== Generate Blog Preview Request ===');
    console.log('Project ID:', projectId);
    console.log('Topic:', topic);
    console.log('Custom RAG provided:', !!rag);
    if (rag) console.log('RAG content length:', rag.length, 'chars');
    console.log('Custom MD file provided:', !!mdFile);
    if (mdFile) console.log('MD file content length:', mdFile.length, 'chars');
    console.log('Custom instructions provided:', !!instructions);
    if (instructions) console.log('Instructions content length:', instructions.length, 'chars');
    console.log('===================================');

    if (!projectId || !topic) {
      return res.status(400).json({ error: 'Project ID and topic are required' });
    }

    // Generate blog content using AI with optional custom context
    const generated = await aiService.generateBlog(projectId, topic, { rag, mdFile, instructions });

    // Return only the generated content without saving
    res.json({
      title: generated.title,
      content: generated.content,
      contextUsed: generated.contextUsed,
      contextSources: generated.contextSources,
      preview: true
    });
  } catch (error) {
    console.error('AI preview route error:', error);

    // Return 429 for rate limit errors
    if (error.isRateLimit) {
      res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter || 60
      });
      return;
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/regenerate-blog/:blogId
 * Regenerate an existing blog post with updated content
 */
router.post('/regenerate-blog/:blogId', async (req, res) => {
  try {
    const { blogId } = req.params;
    const { topic, rag, mdFile, instructions } = req.body;

    // Log incoming request details
    console.log('=== Regenerate Blog Request ===');
    console.log('Blog ID:', blogId);
    console.log('Topic:', topic);
    console.log('Custom RAG provided:', !!rag);
    if (rag) console.log('RAG content length:', rag.length, 'chars');
    console.log('Custom MD file provided:', !!mdFile);
    if (mdFile) console.log('MD file content length:', mdFile.length, 'chars');
    console.log('Custom instructions provided:', !!instructions);
    if (instructions) console.log('Instructions content length:', instructions.length, 'chars');
    console.log('==============================');

    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    // Get the existing blog to get projectId
    const existingBlog = await blogService.getBlogById(blogId);
    if (!existingBlog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Generate new content with optional custom context
    const generated = await aiService.generateBlog(existingBlog.project_id, topic, { rag, mdFile, instructions });

    // Update the existing blog
    const updatedBlog = await blogService.updateBlog(blogId, {
      title: generated.title,
      content: generated.content
    });

    res.json({
      ...updatedBlog,
      contextUsed: generated.contextUsed,
      contextSources: generated.contextSources
    });
  } catch (error) {
    console.error('AI regeneration route error:', error);

    // Return 429 for rate limit errors
    if (error.isRateLimit) {
      res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter || 60
      });
      return;
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/publish/:blogId
 * Publish a blog post to external platform
 */
router.post('/publish/:blogId', async (req, res) => {
  try {
    const { blogId } = req.params;
    const blog = await blogService.getBlogById(blogId);

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Publish to external API
    const result = await aiService.publishToExternalAPI(blog);

    // Update blog status
    await blogService.approveBlog(blogId);

    res.json({
      success: true,
      publishedUrl: result.publishedUrl,
      publishedAt: result.publishedAt
    });
  } catch (error) {
    console.error('AI publish route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/ai/status
 * Get AI service status and configuration
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      service: 'AI Service (Ollama)',
      apiConfigured: !!process.env.OLLAMA_API_URL,
      apiUrl: process.env.OLLAMA_API_URL || 'Not configured',
      model: aiService.model,
      maxTokens: aiService.maxTokens,
      temperature: aiService.temperature,
      queueSize: aiService.requestQueue.length,
      isProcessingQueue: aiService.isProcessingQueue
    };

    res.json(status);
  } catch (error) {
    console.error('AI status route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/generate-topics
 * Generate blog topic suggestions based on project context
 */
router.post('/generate-topics', async (req, res) => {
  try {
    const { projectId, count = 5 } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Get project details
    const pool = require('../../database/connection');
    const projectResult = await pool.query(
      'SELECT name, about_text, blog_rules FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Generate topics based on project context
    const topics = await aiService.generateTopics(project, count);

    res.json({ topics });
  } catch (error) {
    console.error('AI topic generation route error:', error);

    // Return 429 for rate limit errors
    if (error.isRateLimit) {
      res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter || 60
      });
      return;
    }

    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
