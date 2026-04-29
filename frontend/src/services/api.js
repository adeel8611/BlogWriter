const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Get auth token from localStorage
const getToken = () => localStorage.getItem('token');

// Helper function to create headers with auth
const getAuthHeaders = () => {
  const token = getToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const api = {
  // Projects
  getProjects: async () => {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  getProject: async (id) => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`);
    if (!response.ok) throw new Error('Failed to fetch project');
    return response.json();
  },

  createProject: async (projectData) => {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    if (!response.ok) throw new Error('Failed to create project');
    return response.json();
  },

  createProjectWithFiles: async (projectData, files) => {
    const formData = new FormData();
    formData.append('name', projectData.name);
    if (projectData.aboutText) formData.append('aboutText', projectData.aboutText);
    if (projectData.websiteUrl) formData.append('websiteUrl', projectData.websiteUrl);
    if (projectData.blogRules) formData.append('blogRules', projectData.blogRules);
    if (projectData.idealBlog) formData.append('idealBlog', projectData.idealBlog);

    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE_URL}/projects/create-with-files`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to create project with files');
    return response.json();
  },

  updateProject: async (id, projectData) => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
  },

  deleteProject: async (id) => {
    const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete project');
    return response.json();
  },

  // Blogs
  getProjectBlogs: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/blogs/project/${projectId}`);
    if (!response.ok) throw new Error('Failed to fetch blogs');
    return response.json();
  },

  getBlog: async (id) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${id}`);
    if (!response.ok) throw new Error('Failed to fetch blog');
    return response.json();
  },

  createBlog: async (blogData) => {
    const response = await fetch(`${API_BASE_URL}/blogs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blogData)
    });
    if (!response.ok) throw new Error('Failed to create blog');
    return response.json();
  },

  updateBlog: async (id, blogData) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blogData)
    });
    if (!response.ok) throw new Error('Failed to update blog');
    return response.json();
  },

  approveBlog: async (id) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to approve blog');
    return response.json();
  },

  deleteBlog: async (id) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete blog');
    return response.json();
  },

  // AI
  generateBlog: async (projectId, topic) => {
    const response = await fetch(`${API_BASE_URL}/ai/generate-blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, topic })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate blog');
    }
    return response.json();
  },

  // Crawler
  crawlWebsite: async (projectId, url) => {
    const response = await fetch(`${API_BASE_URL}/crawl/${projectId}`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!response.ok) throw new Error('Failed to crawl website');
    return response.json();
  },

  // Documents
  uploadDocument: async (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/documents/upload/${projectId}`, {
      method: 'POST',
      body: formData,
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to upload document');
    return response.json();
  },

  getSupportedFileTypes: async () => {
    const response = await fetch(`${API_BASE_URL}/documents/supported-types`);
    if (!response.ok) throw new Error('Failed to get supported file types');
    return response.json();
  },

  getUploadedFiles: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/documents/${projectId}`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to get uploaded files');
    return response.json();
  },

  // Auth
  signup: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed');
    }
    return response.json();
  },

  login: async (credentials) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!response.ok) throw new Error('Invalid email or password');
    return response.json();
  },

  logout: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Logout failed');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return response.json();
  },

  getCurrentUser: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to get current user');
    return response.json();
  },

  // Admin - Users
  getUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to get users');
    return response.json();
  },

  updateUserRole: async (userId, role) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
    if (!response.ok) throw new Error('Failed to update user role');
    return response.json();
  },

  deleteUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  // Admin - Crawling
  getCrawlingSchedules: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/crawling-schedules`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to get crawling schedules');
    return response.json();
  },

  updateCrawlingSchedule: async (projectId, config) => {
    const response = await fetch(`${API_BASE_URL}/admin/crawling-schedules`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, ...config })
    });
    if (!response.ok) throw new Error('Failed to update crawling schedule');
    return response.json();
  },

  toggleCrawlingSchedule: async (scheduleId, active) => {
    const response = await fetch(`${API_BASE_URL}/admin/crawling-schedules/${scheduleId}/toggle`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
    if (!response.ok) throw new Error('Failed to toggle crawling schedule');
    return response.json();
  },

  immediateCrawl: async (projectId) => {
    const response = await fetch(`${API_BASE_URL}/admin/crawl-immediate/${projectId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to crawl');
    return response.json();
  },

  getCrawlingStats: async () => {
    const response = await fetch(`${API_BASE_URL}/admin/crawling-stats`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to get crawling stats');
    return response.json();
  }
};

export default api;
