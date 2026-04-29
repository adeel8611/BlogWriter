# BlogWriter - AI-Powered Blog Generation Platform with RAG

A full-stack MVP for an AI-powered blog generation platform that uses Retrieval-Augmented Generation (RAG) to create contextually relevant blog posts.

## 🚀 Features

- **Project Management**: Create and manage multiple writing projects
- **Web Crawling**: Automatically crawl websites to gather context
- **RAG System**: Store and retrieve relevant content using vector embeddings
- **AI Generation**: Generate blog posts using Claude API with context awareness
- **Blog Editing**: Edit generated blogs in a markdown editor with live preview
- **Publishing Workflow**: Approve and publish blogs to external platforms
- **Context Learning**: Published blogs are added back to RAG for future improvements

## 🏗️ Architecture

```
BlogWriter/
├── backend/                 # Node.js/Express API
│   ├── modules/
│   │   ├── projects/       # Project CRUD operations
│   │   ├── blogs/          # Blog management & publishing
│   │   ├── rag/            # RAG implementation with pgvector
│   │   ├── crawler/        # Web scraping module
│   │   └── ai/             # Claude API integration
│   ├── database/
│   │   ├── connection.js   # PostgreSQL connection
│   │   └── init.js         # Database initialization
│   ├── server.js           # Express server
│   └── package.json
└── frontend/               # React application
    ├── src/
    │   ├── components/     # React components
    │   ├── services/       # API client
    │   ├── App.js          # Main app component
    │   └── index.css       # Global styles
    └── package.json
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with pgvector extension
- **AI**: Anthropic Claude API
- **Crawling**: Cheerio
- **Embeddings**: Hash-based (MVP) - replace with OpenAI/CoHere in production

### Frontend
- **Framework**: React 18
- **Styling**: CSS (no framework for simplicity)
- **Markdown**: react-markdown
- **HTTP**: Fetch API

## 📋 Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v14 or higher) with pgvector extension
3. **Anthropic API Key**

## 🔧 Installation & Setup

### Step 1: Install Dependencies

```bash
cd /home/adeel/Desktop/BlogWriter

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Install PostgreSQL and pgvector

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Install pgvector extension (adjust version as needed)
sudo apt install postgresql-14-pgvector

# Start PostgreSQL service
sudo service postgresql start
```

### Step 3: Create Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql
```

```sql
CREATE DATABASE blogwriter;
CREATE USER blogwriter WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE blogwriter TO blogwriter;
\q
```

### Step 4: Configure Environment Variables

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

Update `.env` with your values:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blogwriter
DB_USER=blogwriter
DB_PASSWORD=password123

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Publishing API
PUBLISHING_API_URL=https://api.example.com/publish
PUBLISHING_API_KEY=your_publishing_key

# Server
PORT=3001
```

### Step 5: Initialize Database Schema

```bash
cd backend

# Enable pgvector extension and create tables
npm run init-db
```

This will create all required tables:
- `projects` - Store writing project information
- `blogs` - Store generated and published blogs
- `rag_documents` - Store embeddings for RAG system

## 🚀 Running the Application

### Terminal 1: Start Backend

```bash
cd /home/adeel/Desktop/BlogWriter/backend
npm run dev
```

Expected output:
```
Server running on port 3001
Health check: http://localhost:3001/health
Connected to PostgreSQL database
```

### Terminal 2: Start Frontend

```bash
cd /home/adeel/Desktop/BlogWriter/frontend
npm start
```

The browser will automatically open at `http://localhost:3000`

## 🎯 Quick Start Tutorial

### 1. Create a Project

- Click "Create New Project"
- Enter project details:
  - **Name**: "My Tech Blog"
  - **About**: "A blog about technology and programming"
  - **Website URL**: "https://example.com"
  - **Writing Rules**: "Write in a friendly, conversational tone. Use examples."
- Click "Create Project"

### 2. Crawl Website for Context

- Select your project
- Go to "Generate Blog" tab
- Click "Crawl Website" to gather context from the website
- Wait for crawling to complete

### 3. Generate a Blog

- Enter a blog topic: "Best practices for React development"
- Click "Generate Blog"
- Wait for AI to generate the content

### 4. Edit the Blog

- Click "View & Edit" on the generated blog
- Make any necessary edits in the markdown editor
- Toggle between "Edit" and "Preview" modes
- Click "Save Changes"

### 5. Approve and Publish

- Click "Approve & Publish"
- The blog will be:
  - Sent to the publishing API (mock for now)
  - Stored in the database with "published" status
  - Added to RAG for future context

### 6. Verify RAG Learning

- Generate another blog on a related topic
- Notice improved context from previous blogs

## 📊 Database Schema

### Projects Table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  about_text TEXT,
  website_url TEXT,
  blog_rules TEXT,
  created_at TIMESTAMP
);
```

### Blogs Table
```sql
CREATE TABLE blogs (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  title VARCHAR(500),
  content TEXT,
  status VARCHAR(50) CHECK (status IN ('draft', 'approved', 'published')),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### RAG Documents Table
```sql
CREATE TABLE rag_documents (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  content TEXT NOT NULL,
  source_type VARCHAR(50) CHECK (source_type IN ('about', 'crawl', 'blog')),
  embedding_vector vector(384),
  metadata JSONB,
  created_at TIMESTAMP
);
```

## 🔌 API Endpoints

### Projects
- `POST /api/projects` - Create a project
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get a single project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Blogs
- `POST /api/blogs` - Create a blog
- `GET /api/blogs/project/:projectId` - Get project blogs
- `GET /api/blogs/:id` - Get a single blog
- `PUT /api/blogs/:id` - Update a blog
- `POST /api/blogs/:id/approve` - Approve and publish a blog
- `DELETE /api/blogs/:id` - Delete a blog

### AI
- `POST /api/ai/generate-blog` - Generate a blog using AI

### Crawler
- `POST /api/crawl/:projectId` - Crawl a website

## 🧠 RAG Implementation

### Embedding Strategy

The MVP uses a simple hash-based embedding approach for demonstration. **For production**, replace `embedding.service.js` with a real embedding service:

**Option 1: OpenAI Embeddings**
```javascript
const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: text
});
```

**Option 2: Sentence Transformers (Python bridge)**
```javascript
// Call a Python microservice
const response = await axios.post('http://localhost:5000/embed', { text });
```

### Vector Search

The system uses PostgreSQL's pgvector extension for similarity search:

```sql
SELECT content, 1 - (embedding_vector <=> query_vector) as similarity
FROM rag_documents
WHERE project_id = $1
ORDER BY embedding_vector <=> query_vector
LIMIT $2
```

## 🎯 Quick Commands

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib postgresql-14-pgvector

# Start PostgreSQL
sudo service postgresql start

# Setup database
sudo -u postgres psql -c "CREATE DATABASE blogwriter;"
sudo -u postgres psql -c "CREATE USER blogwriter WITH PASSWORD 'password123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE blogwriter TO blogwriter;"

# Initialize database schema
cd backend && npm run init-db

# Start backend
cd backend && npm run dev

# Start frontend (new terminal)
cd frontend && npm start
```

## 🐛 Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start it if not running
sudo service postgresql start

# Enable pgvector extension
sudo -u postgres psql -d blogwriter -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### "Connection refused" error

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start it if not running
sudo service postgresql start
```

### "database does not exist" error

```bash
# Recreate the database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS blogwriter;"
sudo -u postgres psql -c "CREATE DATABASE blogwriter;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE blogwriter TO blogwriter;"

# Reinitialize schema
cd backend && npm run init-db
```

### Port already in use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Module not found errors

```bash
# Reinstall dependencies
cd backend && rm -rf node_modules package-lock.json && npm install
cd ../frontend && rm -rf node_modules package-lock.json && npm install
```

### Frontend blank page

Check browser console for errors. Usually a CORS or API connection issue.

### Backend won't start

```bash
# Check if port is in use
lsof -i :3001

# View logs
npm run dev
```

## 🔐 Security Considerations

This is an MVP and lacks several security features:

1. **No Authentication**: Add JWT or session-based auth
2. **No Rate Limiting**: Implement rate limiting for API endpoints
3. **No Input Validation**: Add proper validation and sanitization
4. **No CSRF Protection**: Add CSRF tokens for forms
5. **Environment Variables**: Never commit `.env` files

## 🚀 Production Improvements

1. **Real Embeddings**: Integrate OpenAI, CoHere, or local models
2. **Authentication**: Add user authentication and authorization
3. **Better Crawler**: Use Puppeteer for JavaScript-rendered sites
4. **Streaming**: Implement streaming for AI responses
5. **Queue System**: Use Redis/Bull for background jobs
6. **Monitoring**: Add logging and monitoring
7. **Testing**: Add unit and integration tests
8. **Docker**: Containerize the application
9. **CI/CD**: Set up automated deployment

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blogwriter
DB_USER=blogwriter
DB_PASSWORD=your_secure_password

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Publishing API
PUBLISHING_API_URL=https://api.example.com/publish
PUBLISHING_API_KEY=your_publishing_key

# Server
PORT=3001
```

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

This is an MVP for educational purposes. Feel free to fork and enhance!

## 📞 Support

For issues or questions:
- Check the logs in each terminal for error messages
- Make sure PostgreSQL is running: `sudo service postgresql status`
- Verify your .env file has the correct database credentials
- Ensure your Anthropic API key is valid

## 🎉 You're Ready!

Once both servers are running, open your browser to:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/health

Happy blogging! 🚀
