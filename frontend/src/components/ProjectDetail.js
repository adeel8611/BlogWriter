import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

function ProjectDetail({ project, user, onBack, onProjectUpdate }) {
  const [activeTab, setActiveTab] = useState('blogs');
  const [blogs, setBlogs] = useState([]);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [topic, setTopic] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchBlogs();
    fetchUploadedFiles();
  }, [project.id]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const data = await api.getProjectBlogs(project.id);
      setBlogs(data);
      setError(null);
    } catch (err) {
      setError('Failed to load blogs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const data = await api.getUploadedFiles(project.id);
      setUploadedFiles(data);
    } catch (err) {
      console.error('Error fetching uploaded files:', err);
    }
  };

  const handleGenerateBlog = async () => {
    if (!topic.trim()) return;

    try {
      setGenerating(true);
      setError(null);

      const result = await api.generateBlog(project.id, topic);
      await fetchBlogs();
      setSuccess(`Blog generated using ${result.contextUsed} context chunks`);
      setTopic('');
    } catch (err) {
      setError('Failed to generate blog: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCrawlWebsite = async () => {
    if (!project.website_url) {
      setError('No website URL configured for this project');
      return;
    }

    try {
      setCrawling(true);
      setError(null);
      const result = await api.crawlWebsite(project.id, project.website_url);
      setSuccess(result.message);
    } catch (err) {
      setError('Failed to crawl website: ' + err.message);
    } finally {
      setCrawling(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // Check if file already exists
      const existingFile = uploadedFiles.find(f => f.source_file === file.name);
      if (existingFile) {
        setError(`File "${file.name}" has already been uploaded by ${existingFile.username || 'another user'}. Please use a different file name or contact the uploader.`);
        e.target.value = '';
        setUploading(false);
        return;
      }

      const result = await api.uploadDocument(project.id, file);
      setSuccess(`${user.username} uploaded ${file.name}`);
      await fetchUploadedFiles();
    } catch (err) {
      setError('Failed to upload document: ' + err.message);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleSelectBlog = (blog) => {
    setSelectedBlog(blog);
    setActiveTab('editor');
  };

  const handleUpdateBlog = async (blogData) => {
    try {
      setLoading(true);
      await api.updateBlog(selectedBlog.id, blogData);
      await fetchBlogs();
      setSelectedBlog(prev => ({ ...prev, ...blogData }));
      setSuccess('Blog updated successfully');
    } catch (err) {
      setError('Failed to update blog');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBlog = async () => {
    if (!window.confirm('Are you sure you want to publish this blog?')) return;

    try {
      setLoading(true);
      const result = await api.approveBlog(selectedBlog.id);
      await fetchBlogs();
      setSuccess(`Blog published! URL: ${result.publishedUrl}`);
      setSelectedBlog(null);
      setActiveTab('blogs');
    } catch (err) {
      setError('Failed to publish blog: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;

    try {
      setLoading(true);
      await api.deleteBlog(blogId);
      await fetchBlogs();
      setSuccess('Blog deleted successfully');
      if (selectedBlog && selectedBlog.id === blogId) {
        setSelectedBlog(null);
        setActiveTab('blogs');
      }
    } catch (err) {
      setError('Failed to delete blog');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="secondary">
        ← Back to Projects
      </button>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>{project.name}</h2>
        {project.about_text && <p>{project.about_text}</p>}
        {project.website_url && (
          <p>
            <strong>Website:</strong>{' '}
            <a href={project.website_url} target="_blank" rel="noopener noreferrer">
              {project.website_url}
            </a>
          </p>
        )}
        {project.blog_rules && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
            <strong>Writing Rules:</strong>
            <p style={{ marginTop: '5px' }}>{project.blog_rules}</p>
          </div>
        )}
      </div>

      <div className="nav-tabs">
        <div
          className={`nav-tab ${activeTab === 'blogs' ? 'active' : ''}`}
          onClick={() => setActiveTab('blogs')}
        >
          Blogs ({blogs.length})
        </div>
        <div
          className={`nav-tab ${activeTab === 'generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('generate')}
        >
          Generate Blog
        </div>
        {selectedBlog && (
          <div
            className={`nav-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            Editor
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {activeTab === 'blogs' && (
        <div>
          {loading ? (
            <div className="loading">Loading blogs...</div>
          ) : blogs.length === 0 ? (
            <div className="card">
              <p>No blogs yet. Generate your first blog!</p>
            </div>
          ) : (
            blogs.map((blog) => (
              <div key={blog.id} className="blog-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3>
                    {blog.title}
                    <span className={`status ${blog.status}`}>{blog.status}</span>
                  </h3>
                  <p>{blog.content.substring(0, 200)}...</p>
                  <button
                    onClick={() => handleSelectBlog(blog)}
                    style={{ marginTop: '10px' }}
                  >
                    View & Edit
                  </button>
                </div>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBlog(blog.id);
                  }}
                  title="Delete blog"
                >
                  🗑️
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="card">
          <h3>Generate New Blog</h3>

          <div style={{ marginBottom: '20px' }}>
            <h4>Step 1: Gather Context (Optional)</h4>

            <div style={{ marginBottom: '15px' }}>
              {user?.role === 'admin' && (
                <h5>Option A: Crawl Website</h5>
              )}
              <p style={{ marginBottom: '10px', fontSize: '14px' }}>
                {user?.role === 'admin' ? 'Crawl your website to gather more context for AI generation.' : 'Contact your admin to configure website crawling for this project.'}
              </p>
              {isAdmin && project.website_url && (
                <button
                  onClick={handleCrawlWebsite}
                  disabled={crawling}
                  style={{ marginBottom: '10px' }}
                >
                  {crawling ? 'Crawling...' : 'Crawl Website'}
                </button>
              )}
              {!isAdmin && (
                <p style={{ fontSize: '12px', color: '#666' }}>
                  Website crawling is only available to administrators.
                </p>
              )}
            </div>

            <div>
              <h5>Option B: Upload Document</h5>
              <p style={{ marginBottom: '10px', fontSize: '14px' }}>
                Upload PDF, Word, Excel, or text files to add context.
              </p>
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.json"
                style={{ marginBottom: '10px' }}
              />
              <div style={{ fontSize: '12px', color: '#666' }}>
                Supported: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV, JSON (Max 10MB)
              </div>

              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                  <h6 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                    Uploaded Documents ({uploadedFiles.length})
                  </h6>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '8px',
                        backgroundColor: '#fff',
                        borderRadius: '3px',
                        marginBottom: '5px',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600' }}>
                          {file.source_file}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          Uploaded by: {file.username || 'Unknown'} •
                          {file.chunk_count} chunk{file.chunk_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#999' }}>
                        {new Date(file.first_uploaded).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <h4>Step 2: Generate Blog</h4>
            <div className="form-group">
              <label htmlFor="topic">Blog Topic *</label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Best practices for remote work"
              />
            </div>

           

            <button
              onClick={handleGenerateBlog}
              disabled={generating || !topic.trim()}
            >
              {generating ? 'Generating...' : 'Generate Blog'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'editor' && selectedBlog && (
        <BlogEditor
          blog={selectedBlog}
          onUpdate={handleUpdateBlog}
          onApprove={handleApproveBlog}
          onDelete={() => handleDeleteBlog(selectedBlog.id)}
          loading={loading}
        />
      )}
    </div>
  );
}

function BlogEditor({ blog, onUpdate, onApprove, onDelete, loading }) {
  const [content, setContent] = useState(blog.content);
  const [title, setTitle] = useState(blog.title);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = () => {
    onUpdate({ title, content });
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3>Blog Editor</h3>
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="secondary"
            style={{ marginRight: '10px' }}
          >
            {showPreview ? 'Edit' : 'Preview'}
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={showPreview}
        />
      </div>

      {showPreview ? (
        <div className="markdown-preview">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <div className="form-group">
          <label htmlFor="content">Content (Markdown)</label>
          <textarea
            id="content"
            className="editor"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button onClick={handleSave} disabled={loading}>
          Save Changes
        </button>
        {blog.status !== 'published' && (
          <button onClick={onApprove} className="success" disabled={loading}>
            Approve & Publish
          </button>
        )}
        <button onClick={onDelete} className="danger" disabled={loading}>
          Delete
        </button>
      </div>
    </div>
  );
}

export default ProjectDetail;
