/**
 * Embedding Service using a simple approach
 * For production, consider using OpenAI embeddings or a local model
 */

class EmbeddingService {
  constructor() {
    // Using a free embedding API endpoint
    // In production, replace with your preferred embedding service
    this.embeddingApiUrl = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
    this.apiKey = process.env.HUGGINGFACE_API_KEY || '';
  }

  /**
   * Generate embeddings for a single text
   */
  async generateEmbedding(text) {
    try {
      // For MVP, we'll use a simple hash-based embedding
      // This is NOT production-ready - replace with real embeddings
      return this.generateSimpleEmbedding(text);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate simple hash-based embedding (for MVP only)
   * Replace this with real embedding API in production
   */
  generateSimpleEmbedding(text) {
    const dim = 384; // Match sentence-transformers dimension
    const embedding = new Array(dim).fill(0);

    // Simple hash-based approach for MVP
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    // Fill embedding with pseudo-random values based on hash
    for (let i = 0; i < dim; i++) {
      const seed = (hash + i * 9301 + 49297) % 233280;
      embedding[i] = (seed / 233280) * 2 - 1; // Range [-1, 1]
    }

    return embedding;
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts) {
    const embeddings = [];
    for (const text of texts) {
      const embedding = await this.generateEmbedding(text);
      embeddings.push(embedding);
    }
    return embeddings;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

module.exports = new EmbeddingService();
