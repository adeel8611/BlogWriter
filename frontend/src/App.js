import React, { useState, useEffect } from 'react';
import ProjectList from './components/ProjectList';
import ProjectForm from './components/ProjectForm';
import ProjectDetail from './components/ProjectDetail';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard';
import api from './services/api';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      setCurrentView('projects');
      fetchProjects();
    }
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData, files = []) => {
    try {
      setLoading(true);

      if (files.length > 0) {
        await api.createProjectWithFiles(projectData, files);
      } else {
        await api.createProject(projectData);
      }

      await fetchProjects();
      setCurrentView('projects');
      setError(null);
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setCurrentView('project-detail');
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setCurrentView('projects');
  };

  const handleDeleteProject = (projectId) => {
    setProjects(projects.filter(p => p.id !== projectId));
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentView('projects');
    fetchProjects();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setUser(null);
      setCurrentView('login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!user) {
    return (
      <div className="App">
        <div className="header">
          <div className="container">
            <h1>BlogWriter</h1>
            <p>AI-Powered Blog Generation with RAG</p>
          </div>
        </div>
        <div className="container" style={{ paddingTop: '50px' }}>
          {currentView === 'login' ? (
            <Login onLogin={handleLogin} onShowSignup={() => setCurrentView('signup')} />
          ) : (
            <Signup onSignup={() => setCurrentView('login')} onLogin={handleLogin} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="header">
        <div className="container">
          <h1>BlogWriter</h1>
          <p>AI-Powered Blog Generation with RAG</p>
        </div>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <strong>Welcome, {user.username}</strong>
            {user.role === 'admin' && (
              <span style={{
                marginLeft: '10px',
                padding: '3px 8px',
                borderRadius: '3px',
                backgroundColor: '#e74c3c',
                color: 'white',
                fontSize: '12px'
              }}>Admin</span>
            )}
          </div>
          <button onClick={handleLogout} className="secondary">Logout</button>
        </div>

        {currentView === 'projects' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <button onClick={() => setCurrentView('create-project')}>
                + Create New Project
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => setCurrentView('admin-dashboard')}
                  className="secondary"
                  style={{ marginLeft: '10px' }}
                >
                  Admin Dashboard
                </button>
              )}
            </div>
            <ProjectList
              projects={projects}
              loading={loading}
              onSelectProject={handleSelectProject}
              onDeleteProject={handleDeleteProject}
            />
          </div>
        )}

        {currentView === 'create-project' && (
          <ProjectForm
            onSubmit={handleCreateProject}
            onCancel={() => setCurrentView('projects')}
            loading={loading}
          />
        )}

        {currentView === 'project-detail' && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            user={user}
            onBack={handleBackToProjects}
            onProjectUpdate={fetchProjects}
          />
        )}

        {currentView === 'admin-dashboard' && user.role === 'admin' && (
          <AdminDashboard
            onBack={() => setCurrentView('projects')}
            projects={projects}
          />
        )}
      </div>
    </div>
  );
}

export default App;
