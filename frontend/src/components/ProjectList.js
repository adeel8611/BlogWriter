import React from 'react';
import api from '../services/api';

function ProjectList({ projects, loading, onSelectProject, onDeleteProject }) {
  const handleDelete = async (e, projectId) => {
    e.stopPropagation(); // Prevent triggering project selection

    if (!window.confirm('Are you sure you want to delete this project? This will also delete all associated blogs and documents.')) {
      return;
    }

    try {
      await api.deleteProject(projectId);
      if (onDeleteProject) {
        onDeleteProject(projectId);
      }
    } catch (error) {
      alert('Failed to delete project: ' + error.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading projects...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="card">
        <p>No projects yet. Create your first project to get started!</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Projects</h2>
      {projects.map((project) => (
        <div
          key={project.id}
          className="project-item"
          onClick={() => onSelectProject(project)}
        >
          <div className="project-item-content">
            <h3>{project.name}</h3>
            {project.about_text && (
              <p>{project.about_text.substring(0, 150)}...</p>
            )}
            {project.website_url && (
              <p>
                <small>{project.website_url}</small>
              </p>
            )}
          </div>
          <button
            className="delete-button"
            onClick={(e) => handleDelete(e, project.id)}
            title="Delete project"
          >
            🗑️
          </button>
        </div>
      ))}
    </div>
  );
}

export default ProjectList;
