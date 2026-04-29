require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Start scheduled crawler if enabled
if (process.env.ENABLE_SCHEDULER === 'true') {
  require('./scheduler');
  console.log('📅 Scheduled crawler enabled');
}

const projectRoutes = require('./modules/projects/project.routes');
const blogRoutes = require('./modules/blogs/blog.routes');
const crawlerRoutes = require('./modules/crawler/crawler.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const documentRoutes = require('./modules/documents/document.routes');
const authRoutes = require('./modules/auth/auth.routes');
const adminRoutes = require('./modules/admin/admin.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/projects', projectRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/crawl', crawlerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
