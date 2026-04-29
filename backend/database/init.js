const pool = require('./connection');

async function initializeDatabase() {
  try {
    console.log('Initializing database...');

    // Try to enable pgvector extension (optional for MVP)
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
      console.log('✅ pgvector extension enabled');
    } catch (err) {
      console.warn('⚠️  pgvector extension not available. Vector search will use fallback text search.');
      console.warn('   To enable vector search, install pgvector:');
      console.warn('   sudo apt install postgresql-16-pgvector');
    }

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create projects table
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          about_text TEXT,
          website_url TEXT,
          blog_rules TEXT,
          ideal_blog TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err) {
      // If projects table already exists but doesn't have user_id, add it
      if (err.message.includes('duplicate key')) {
        console.log('Projects table exists, checking for missing columns...');
        try {
          await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
          console.log('✅ Added user_id column to projects table');
        } catch (alterErr) {
          if (!alterErr.message.includes('already exists')) {
            console.error('Error adding user_id column:', alterErr.message);
          }
        }
      } else {
        throw err;
      }
    }

    // Add ideal_blog column to existing projects table if it doesn't exist
    try {
      await pool.query('ALTER TABLE projects ADD COLUMN IF NOT EXISTS ideal_blog TEXT');
      console.log('✅ Added ideal_blog column to projects table');
    } catch (alterErr) {
      if (!alterErr.message.includes('already exists')) {
        console.warn('Could not add ideal_blog column to projects:', alterErr.message);
      }
    }

    // Create blogs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(500),
        content TEXT,
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create rag_documents table (with optional vector column)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS rag_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('about', 'crawl', 'blog', 'ideal_blog', 'file')),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          embedding_vector vector(384),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (err) {
      // If vector type doesn't exist, create table without it
      if (err.message.includes('type "vector" does not exist')) {
        console.log('Creating rag_documents table without vector support...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS rag_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('about', 'crawl', 'blog', 'ideal_blog', 'file')),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      } else if (err.message.includes('violates check constraint')) {
        console.log('Updating rag_documents source_type check constraint to include new types...');
        // Drop and recreate table with new constraint
        await pool.query(`DROP TABLE IF EXISTS rag_documents CASCADE`);
        await pool.query(`
          CREATE TABLE rag_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('about', 'crawl', 'blog', 'ideal_blog', 'file')),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            embedding_vector vector(384),
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('✅ Recreated rag_documents table with updated source_type constraint');
      } else {
        throw err;
      }
    }

    // Add user_id column to existing rag_documents table if it doesn't exist
    try {
      await pool.query('ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL');
      console.log('✅ Added user_id column to rag_documents table');
    } catch (alterErr) {
      if (!alterErr.message.includes('already exists')) {
        console.warn('Could not add user_id column to rag_documents:', alterErr.message);
      }
    }

    // Create indexes for better RAG performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_rag_documents_project_id
      ON rag_documents(project_id);
    `);

    // Create index on user_id only if column exists
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_rag_documents_user_id
        ON rag_documents(user_id);
      `);
    } catch (err) {
      if (!err.message.includes('does not exist')) {
        console.warn('Could not create idx_rag_documents_user_id:', err.message);
      }
    }

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_blogs_project_id
      ON blogs(project_id);
    `);

    // Create crawling schedules table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crawling_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN ('immediate', 'daily', 'weekly', 'monthly')),
        interval_days INTEGER,
        last_crawled_at TIMESTAMP,
        next_crawl_at TIMESTAMP,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_project_id UNIQUE (project_id)
      );
    `);

    // Create user sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crawling_schedules_project_id
      ON crawling_schedules(project_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
      ON user_sessions(user_id);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token
      ON user_sessions(token);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
      ON user_sessions(expires_at);
    `);

    // Create index on user_id only if column exists
    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_projects_user_id
        ON projects(user_id);
      `);
    } catch (err) {
      if (!err.message.includes('does not exist')) {
        console.warn('Could not create idx_projects_user_id:', err.message);
      }
    }

    console.log('Database initialized successfully!');
    console.log('Tables: users, projects, blogs, rag_documents');

    // Create default admin user if it doesn't exist
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');

    try {
      const existingAdmin = await pool.query('SELECT id FROM users WHERE role = $1', ['admin']);
      if (existingAdmin.rows.length === 0) {
        const adminId = uuidv4();
        const passwordHash = await bcrypt.hash('admin123', 10);

        await pool.query(`
          INSERT INTO users (id, username, email, password_hash, role)
          VALUES ($1, $2, $3, $4, $5)
        `, [adminId, 'admin', 'admin@blogwriter.com', passwordHash, 'admin']);

        console.log('✅ Default admin user created:');
        console.log('   Username: admin');
        console.log('   Email: admin@blogwriter.com');
        console.log('   Password: admin123');
        console.log('   Please change this password after first login!');
      } else {
        console.log('ℹ️  Admin user already exists');
      }
    } catch (err) {
      console.error('Error creating default admin user:', err);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
