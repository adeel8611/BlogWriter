import React, { useState } from 'react';

function ProjectForm({ onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    name: '',
    aboutText: '',
    websiteUrl: '',
    blogRules: '',
    idealBlog: ''
  });
  const [files, setFiles] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData, files);
  };

  return (
    <div className="card">
      <h2>Create New Project</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Project Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="My Tech Blog"
          />
        </div>

        <div className="form-group">
          <label htmlFor="aboutText">About This Project</label>
          <textarea
            id="aboutText"
            name="aboutText"
            value={formData.aboutText}
            onChange={handleChange}
            placeholder="Describe what this project is about..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="websiteUrl">Website URL to Crawl</label>
          <input
            type="url"
            id="websiteUrl"
            name="websiteUrl"
            value={formData.websiteUrl}
            onChange={handleChange}
            placeholder="https://example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="blogRules">Blog Writing Rules</label>
          <textarea
            id="blogRules"
            name="blogRules"
            value={formData.blogRules}
            onChange={handleChange}
            placeholder="Write in a friendly, conversational tone. Use examples. Keep paragraphs short..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="idealBlog">Ideal Blog Sample</label>
          <textarea
            id="idealBlog"
            name="idealBlog"
            value={formData.idealBlog}
            onChange={handleChange}
            placeholder="Paste an ideal blog post here that will serve as a style guide for AI generation..."
            rows="8"
          />
          <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
            This blog will be used as a reference for tone, style, and structure when generating new blogs.
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="files">Upload Documents (PDF, DOCX, XLSX, TXT, CSV, JSON)</label>
          <input
            type="file"
            id="files"
            name="files"
            onChange={handleFileChange}
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.json"
          />
          <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
            Max file size: 10MB. Upload documents about your project to use as reference for blog generation.
          </small>
        </div>

        {files.length > 0 && (
          <div className="file-list" style={{ marginBottom: '20px' }}>
            <h4>Selected Files ({files.length}):</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {files.map((file, index) => (
                <li key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                  <span style={{ marginRight: '10px' }}>{file.name}</span>
                  <small style={{ color: '#666', marginRight: '10px' }}>
                    ({(file.size / 1024).toFixed(2)} KB)
                  </small>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#e74c3c',
                      cursor: 'pointer',
                      padding: '2px 6px'
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Project'}
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
      </form>
    </div>
  );
}

export default ProjectForm;
