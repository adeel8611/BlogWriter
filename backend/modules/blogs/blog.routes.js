const express = require('express');
const router = express.Router();
const blogService = require('./blog.service');

/**
 * POST /api/blogs
 * Create a new blog post
 */
router.post('/', async (req, res) => {
  try {
    const { projectId, title, content } = req.body;

    if (!projectId || !title || !content) {
      return res.status(400).json({
        error: 'Project ID, title, and content are required'
      });
    }

    const blog = await blogService.createBlog({ projectId, title, content });
    res.status(201).json(blog);
  } catch (error) {
    console.error('Create blog route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/blogs/project/:projectId
 * Get all blogs for a project
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const blogs = await blogService.getProjectBlogs(req.params.projectId);
    res.json(blogs);
  } catch (error) {
    console.error('Get blogs route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/blogs/:id
 * Get a single blog
 */
router.get('/:id', async (req, res) => {
  try {
    const blog = await blogService.getBlogById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json(blog);
  } catch (error) {
    console.error('Get blog route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/blogs/:id
 * Update a blog post
 */
router.put('/:id', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title && !content) {
      return res.status(400).json({
        error: 'At least title or content must be provided'
      });
    }

    const blog = await blogService.updateBlog(req.params.id, {
      title,
      content
    });

    res.json(blog);
  } catch (error) {
    console.error('Update blog route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/blogs/:id/approve
 * Approve and publish a blog post
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const result = await blogService.approveBlog(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Approve blog route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/blogs/:id
 * Delete a blog post
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await blogService.deleteBlog(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete blog route error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
