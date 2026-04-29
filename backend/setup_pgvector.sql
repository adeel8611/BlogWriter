-- Check and install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Add embedding_vector column to rag_documents table
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- Create index for efficient vector similarity search
CREATE INDEX IF NOT EXISTS rag_documents_embedding_vector_idx ON rag_documents
  USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100);

-- Verify the table structure
\d rag_documents
