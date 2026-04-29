const pool = require('../../database/connection');
const embeddingService = require('./embedding.service');

class RAGService {
  /**
   * Store a document in the RAG system
   */
  async storeDocument(projectId, content, sourceType, metadata = {}, userId = null) {
    try {
      // First, try with embedding vector
      try {
        const embedding = await embeddingService.generateEmbedding(content);

        const query = `
          INSERT INTO rag_documents (project_id, content, source_type, user_id, embedding_vector, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;

        const result = await pool.query(query, [
          projectId,
          content,
          sourceType,
          userId,
          `[${embedding.join(',')}]`,
          metadata
        ]);

        console.log(`Stored RAG document: ${result.rows[0].id}, source: ${sourceType}`);
        return result.rows[0];
      } catch (vectorError) {
        // If embedding_vector column doesn't exist, fallback to storing without it
        if (vectorError.code === '42703') { // column does not exist
          console.log('Storing RAG document without vector (fallback mode)');

          const fallbackQuery = `
            INSERT INTO rag_documents (project_id, content, source_type, user_id, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `;

          const result = await pool.query(fallbackQuery, [
            projectId,
            content,
            sourceType,
            userId,
            metadata
          ]);

          console.log(`Stored RAG document: ${result.rows[0].id}, source: ${sourceType} (no vector)`);
          return result.rows[0];
        } else {
          throw vectorError;
        }
      }
    } catch (error) {
      console.error('Error storing RAG document:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant documents for a query
   */
  async retrieveDocuments(projectId, query, topK = 5) {
    try {
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      const queryVector = `[${queryEmbedding.join(',')}]`;

      // Using PostgreSQL pgvector for similarity search
      const pgQuery = `
        SELECT id, content, source_type, metadata,
               1 - (embedding_vector <=> $1::vector) as similarity
        FROM rag_documents
        WHERE project_id = $2
        ORDER BY embedding_vector <=> $1::vector
        LIMIT $3
      `;

      const result = await pool.query(pgQuery, [queryVector, projectId, topK]);

      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        sourceType: row.source_type,
        metadata: row.metadata,
        similarity: row.similarity
      }));
    } catch (error) {
      // Fallback to simple text search if pgvector fails
      console.warn('Vector search failed, using text search fallback:', error.message);
      return this.textSearchFallback(projectId, query, topK);
    }
  }

  /**
   * Fallback text search when vector search is unavailable
   */
  async textSearchFallback(projectId, query, topK = 5) {
    try {
      const queryText = query.toLowerCase();
      const terms = queryText.split(/\s+/).filter(t => t.length > 2);

      if (terms.length === 0) return [];

      const whereClause = terms.map((_, i) => `LOWER(content) LIKE $${i + 2}`).join(' OR ');
      const searchParams = terms.map(term => `%${term}%`);

      const pgQuery = `
        SELECT id, content, source_type, metadata, 0.5 as similarity
        FROM rag_documents
        WHERE project_id = $1 AND (${whereClause})
        LIMIT $${terms.length + 2}
      `;

      const result = await pool.query(pgQuery, [projectId, ...searchParams, topK]);

      return result.rows.map(row => ({
        id: row.id,
        content: row.content,
        sourceType: row.source_type,
        metadata: row.metadata,
        similarity: row.similarity
      }));
    } catch (error) {
      console.error('Fallback text search also failed:', error);
      return [];
    }
  }

  /**
   * Get all documents for a project with user information
   */
  async getProjectDocuments(projectId) {
    try {
      const result = await pool.query(
        `SELECT
          rd.id,
          rd.content,
          rd.source_type,
          rd.metadata,
          rd.created_at,
          u.id as user_id,
          u.username,
          u.email
        FROM rag_documents rd
        LEFT JOIN users u ON rd.user_id = u.id
        WHERE rd.project_id = $1
        ORDER BY rd.created_at DESC`,
        [projectId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching project documents:', error);
      throw error;
    }
  }

  /**
   * Clear all documents for a project
   */
  async clearProjectDocuments(projectId) {
    try {
      const result = await pool.query(
        'DELETE FROM rag_documents WHERE project_id = $1 RETURNING id',
        [projectId]
      );
      console.log(`Cleared ${result.rowCount} documents for project ${projectId}`);
      return result.rowCount;
    } catch (error) {
      console.error('Error clearing project documents:', error);
      throw error;
    }
  }

  /**
   * Get unique uploaded files for a project (grouped by filename)
   */
  async getUploadedFiles(projectId) {
    try {
      const result = await pool.query(
        `SELECT DISTINCT
          rd.metadata->>'source_file' as source_file,
          rd.metadata->>'file_type' as file_type,
          rd.source_type,
          u.id as user_id,
          u.username,
          u.email,
          MIN(rd.created_at) as first_uploaded,
          MAX(rd.created_at) as last_uploaded,
          COUNT(rd.id) as chunk_count
        FROM rag_documents rd
        LEFT JOIN users u ON rd.user_id = u.id
        WHERE rd.project_id = $1
          AND rd.source_type = 'crawl'
          AND rd.metadata ? 'source_file'
        GROUP BY rd.metadata->>'source_file', rd.metadata->>'file_type', rd.source_type, u.id, u.username, u.email
        ORDER BY first_uploaded DESC`,
        [projectId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      throw error;
    }
  }
}

module.exports = new RAGService();
