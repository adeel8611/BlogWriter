const pool = require('../../database/connection');
const ragService = require('../rag/rag.service');
const documentService = require('../documents/document.service');
const adminCrawlingService = require('../admin/admin.crawling.service');
const { v4: uuidv4 } = require('uuid');

class ProjectService {
  /**
   * Create a new project
   */
  async createProject(projectData) {
    const { name, aboutText, websiteUrl, blogRules, idealBlog } = projectData;

    try {
      const result = await pool.query(
        `INSERT INTO projects (name, about_text, website_url, blog_rules, ideal_blog)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, aboutText, websiteUrl, blogRules, idealBlog]
      );

      const project = result.rows[0];

      // Store about text in RAG
      if (aboutText) {
        await ragService.storeDocument(project.id, aboutText, 'about', {
          project_name: name
        });
      }

      // Store ideal blog in RAG if provided
      if (idealBlog) {
        await ragService.storeDocument(project.id, idealBlog, 'ideal_blog', {
          project_name: name,
          type: 'ideal_blog'
        });
      }

      // Automatically set up 7-day crawling schedule if website URL is provided
      if (websiteUrl) {
        try {
          await adminCrawlingService.updateCrawlingSchedule(project.id, 'weekly', 7);
          console.log(`✅ Created 7-day crawling schedule for project: ${name}`);
        } catch (scheduleError) {
          console.error('⚠️  Failed to create crawling schedule:', scheduleError.message);
          // Don't throw error - project is still created successfully
        }
      }

      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Get all projects
   */
  async getAllProjects() {
    try {
      const result = await pool.query(
        'SELECT * FROM projects ORDER BY created_at DESC'
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  /**
   * Get a single project by ID
   */
  async getProjectById(projectId) {
    try {
      const result = await pool.query(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error fetching project:', error);
      throw error;
    }
  }

  /**
   * Update a project
   */
  async updateProject(projectId, projectData) {
    const { name, aboutText, websiteUrl, blogRules, idealBlog } = projectData;

    try {
      const result = await pool.query(
        `UPDATE projects
         SET name = $1, about_text = $2, website_url = $3, blog_rules = $4, ideal_blog = $5
         WHERE id = $6
         RETURNING *`,
        [name, aboutText, websiteUrl, blogRules, idealBlog, projectId]
      );

      if (result.rows.length === 0) {
        throw new Error('Project not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId) {
    try {
      const result = await pool.query(
        'DELETE FROM projects WHERE id = $1 RETURNING id',
        [projectId]
      );

      if (result.rows.length === 0) {
        throw new Error('Project not found');
      }

      // RAG documents will be automatically deleted due to CASCADE
      return { success: true, message: 'Project deleted successfully' };
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Process uploaded file for a project
   */
  async processUploadedFile(projectId, filePath, fileName, mimeType) {
    try {
      console.log(`Processing uploaded file for project ${projectId}: ${fileName}`);

      // Extract text from file
      const text = await documentService.extractTextFromFile(filePath, mimeType);

      if (!text || text.trim().length === 0) {
        throw new Error('No text could be extracted from the file');
      }

      console.log(`Extracted ${text.length} characters from ${fileName}`);

      // Chunk the text
      const chunks = documentService.chunkText(text, 1000);
      console.log(`Created ${chunks.length} chunks from ${fileName}`);

      // Store chunks in RAG
      let storedCount = 0;
      for (const chunk of chunks) {
        await ragService.storeDocument(projectId, chunk, 'file', {
          source_file: fileName,
          file_type: mimeType,
          chunk_index: storedCount
        });
        storedCount++;
      }

      // Clean up the uploaded file
      const fs = require('fs');
      fs.unlinkSync(filePath);

      return {
        success: true,
        fileName,
        extractedChars: text.length,
        chunksStored: storedCount,
        message: `Successfully processed ${fileName}: extracted ${text.length} characters into ${storedCount} chunks`
      };
    } catch (error) {
      console.error('Error processing uploaded file:', error);

      // Clean up the uploaded file even if processing failed
      const fs = require('fs');
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      throw error;
    }
  }
}

module.exports = new ProjectService();
