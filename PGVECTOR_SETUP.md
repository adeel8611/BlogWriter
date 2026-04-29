# pgvector Setup Instructions

pgvector requires system-level installation with superuser privileges. Here are the steps to install and configure it:

## Step 1: Install pgvector extension

Run these commands with sudo privileges:

```bash
# Install pgvector package (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql-16-pgvector

# For other Linux distributions, you may need to compile from source:
# git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
# cd pgvector
# make
# sudo make install
```

## Step 2: Enable the extension in your database

After installing pgvector system-wide, connect to your PostgreSQL database and enable the extension:

```bash
# Connect to the database as postgres superuser
sudo -u postgres psql -d blogwriter

# Or if you have a password for postgres user:
PGPASSWORD=<postgres_password> psql -h localhost -U postgres -d blogwriter
```

Then run these SQL commands:

```sql
-- Create the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Step 3: Add the embedding_vector column

Run the SQL script to add the vector column:

```sql
-- Add embedding_vector column to rag_documents table
-- Using 1536 dimensions (OpenAI embedding size)
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- Create index for efficient vector similarity search
CREATE INDEX IF NOT EXISTS rag_documents_embedding_vector_idx ON rag_documents
  USING ivfflat (embedding_vector vector_cosine_ops)
  WITH (lists = 100);

-- Verify the table structure
\d rag_documents
```

## Step 4: Grant necessary permissions

If you want the blogwriter user to be able to work with vectors:

```sql
-- Grant usage on vector type
GRANT USAGE ON SCHEMA public TO blogwriter;
GRANT ALL PRIVILEGES ON TABLE rag_documents TO blogwriter;
```

## Alternative: Use the provided SQL script

After installing pgvector system-wide, you can run the complete setup script:

```bash
# As postgres superuser
sudo -u postgres psql -d blogwriter -f /home/adeel/Desktop/BlogWriter/backend/setup_pgvector.sql
```

## Verification

After setup, verify everything works:

```sql
-- Test vector operations
SELECT '[1,2,3]'::vector;

-- Check the table has the new column
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'rag_documents' AND column_name = 'embedding_vector';
```

## Notes

- The vector dimension (1536) matches OpenAI's text-embedding-ada-002 model
- ivfflat index is used for approximate nearest neighbor search
- The index uses cosine similarity (vector_cosine_ops)
- Adjust the `lists` parameter based on your dataset size (typical values: sqrt(rows))
