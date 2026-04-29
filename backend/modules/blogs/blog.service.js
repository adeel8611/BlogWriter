const pool = require('../../database/connection');
const ragService = require('../rag/rag.service');
const aiService = require('../ai/ai.service');

class BlogService {
  /**
   * Create a new blog post
   */
  async createBlog(blogData) {
    const { projectId, title, content } = blogData;

    try {
      const result = await pool.query(
        `INSERT INTO blogs (project_id, title, content, status)
         VALUES ($1, $2, $3, 'draft')
         RETURNING *`,
        [projectId, title, content]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating blog:', error);
      throw error;
    }
  }

  /**
   * Generate and create a blog post
   */
  async generateAndCreateBlog(projectId, topic) {
    try {
      // Generate blog using AI
      const generated = await aiService.generateBlog(projectId, topic);

      // Create blog in database
      const blog = await this.createBlog({
        projectId,
        title: generated.title,
        content: generated.content
      });

      return {
        ...blog,
        contextUsed: generated.contextUsed,
        contextSources: generated.contextSources
      };
    } catch (error) {
      console.error('Error generating blog:', error);
      throw error;
    }
  }

  /**
   * Get all blogs for a project
   */
  async getProjectBlogs(projectId) {
    try {
      const result = await pool.query(
        'SELECT * FROM blogs WHERE project_id = $1 ORDER BY created_at DESC',
        [projectId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching blogs:', error);
      throw error;
    }
  }

  /**
   * Get a single blog by ID
   */
  async getBlogById(blogId) {
    try {
      const result = await pool.query(
        'SELECT * FROM blogs WHERE id = $1',
        [blogId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching blog:', error);
      throw error;
    }
  }

  /**
   * Update a blog post
   */
  async updateBlog(blogId, blogData) {
    const { title, content } = blogData;

    try {
      const result = await pool.query(
        `UPDATE blogs
         SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [title, content, blogId]
      );

      if (result.rows.length === 0) {
        throw new Error('Blog not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating blog:', error);
      throw error;
    }
  }

  /**
   * Approve and publish a blog post
   */
  async approveBlog(blogId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get blog details
      const blogResult = await client.query(
        'SELECT * FROM blogs WHERE id = $1',
        [blogId]
      );

      if (blogResult.rows.length === 0) {
        throw new Error('Blog not found');
      }

      const blog = blogResult.rows[0];

      // Publish to external API
      const publishResult = await aiService.publishToExternalAPI({
        id: blog.id,
        title: blog.title,
        content: blog.content,
        projectId: blog.project_id
      });

      // Update blog status
      await client.query(
        `UPDATE blogs
         SET status = 'published', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [blogId]
      );

      // Store blog content in RAG for future context
      await ragService.storeDocument(blog.project_id, blog.content, 'blog', {
        blog_id: blog.id,
        blog_title: blog.title,
        published_url: publishResult.publishedUrl,
        published_at: publishResult.publishedAt
      });

      await client.query('COMMIT');

      return {
        success: true,
        publishedUrl: publishResult.publishedUrl,
        publishedAt: publishResult.publishedAt
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error approving blog:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a blog post
   */
  async deleteBlog(blogId) {
    try {
      const result = await pool.query(
        'DELETE FROM blogs WHERE id = $1 RETURNING id',
        [blogId]
      );

      if (result.rows.length === 0) {
        throw new Error('Blog not found');
      }

      return { success: true, message: 'Blog deleted successfully' };
    } catch (error) {
      console.error('Error deleting blog:', error);
      throw error;
    }
  }
}

module.exports = new BlogService();
