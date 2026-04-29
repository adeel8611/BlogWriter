import React, { useState, useEffect } from 'react';
import api from '../services/api';

function AdminDashboard({ onBack, projects }) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [crawlingSchedules, setCrawlingSchedules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'users') {
        const usersData = await api.getUsers();
        setUsers(usersData);
      } else if (activeTab === 'crawling') {
        const [schedulesData, statsData] = await Promise.all([
          api.getCrawlingSchedules(),
          api.getCrawlingStats()
        ]);
        setCrawlingSchedules(schedulesData);
        setStats(statsData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await api.updateUserRole(userId, newRole);
      fetchData();
    } catch (err) {
      alert('Failed to update user role: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;

    try {
      await api.deleteUser(userId);
      fetchData();
    } catch (err) {
      alert('Failed to delete user: ' + err.message);
    }
  };

  const handleImmediateCrawl = async (projectId, projectName) => {
    if (!window.confirm(`Are you sure you want to immediately crawl "${projectName}"?`)) return;

    try {
      await api.immediateCrawl(projectId);
      alert('Crawl completed successfully');
      fetchData();
    } catch (err) {
      alert('Failed to crawl: ' + err.message);
    }
  };

  const handleUpdateSchedule = async (projectId, currentSchedule) => {
    const newScheduleType = window.prompt(
      'Enter schedule type (immediate, daily, weekly, monthly):',
      currentSchedule?.schedule_type || 'weekly'
    );

    if (!newScheduleType || !['immediate', 'daily', 'weekly', 'monthly'].includes(newScheduleType)) {
      alert('Invalid schedule type');
      return;
    }

    const intervalDays = newScheduleType === 'weekly' ? parseInt(window.prompt('Enter interval in days:', '7')) || 7 : null;

    try {
      await api.updateCrawlingSchedule(projectId, {
        scheduleType: newScheduleType,
        intervalDays
      });
      fetchData();
    } catch (err) {
      alert('Failed to update schedule: ' + err.message);
    }
  };

  const handleToggleSchedule = async (scheduleId, currentActive) => {
    try {
      await api.toggleCrawlingSchedule(scheduleId, !currentActive);
      fetchData();
    } catch (err) {
      alert('Failed to toggle schedule: ' + err.message);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Admin Dashboard</h2>
        <button onClick={onBack}>Back to Projects</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? '' : 'secondary'}
          style={{ marginRight: '10px' }}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('crawling')}
          className={activeTab === 'crawling' ? '' : 'secondary'}
        >
          Crawling Configuration
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>}

      {error && <div className="error">{error}</div>}

      {!loading && !error && activeTab === 'users' && (
        <div>
          <h3>User Management ({users.length})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Username</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Role</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>{user.username}</td>
                  <td style={{ padding: '10px' }}>{user.email}</td>
                  <td style={{ padding: '10px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '3px',
                        backgroundColor: user.role === 'admin' ? '#e74c3c' : '#3498db',
                        color: 'white',
                        fontSize: '12px'
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '10px' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '10px' }}>
                    <button
                      onClick={() => handleToggleUserRole(user.id, user.role)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '12px',
                        marginRight: '5px'
                      }}
                    >
                      {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      className="danger"
                      style={{
                        padding: '5px 10px',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && activeTab === 'crawling' && (
        <div>
          <h3>Crawling Configuration</h3>
          {stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '5px',
                textAlign: 'center'
              }}>
                <h4 style={{ margin: '0 0 5px 0' }}>{stats.total}</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Total Schedules</p>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#d4edda',
                borderRadius: '5px',
                textAlign: 'center'
              }}>
                <h4 style={{ margin: '0 0 5px 0' }}>{stats.active}</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#155724' }}>Active</p>
              </div>
              <div style={{
                padding: '15px',
                backgroundColor: '#fff3cd',
                borderRadius: '5px',
                textAlign: 'center'
              }}>
                <h4 style={{ margin: '0 0 5px 0' }}>{stats.due}</h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#856404' }}>Due for Crawl</p>
              </div>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Project</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Schedule</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Next Crawl</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {crawlingSchedules.map(schedule => (
                <tr key={schedule.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>
                    <strong>{schedule.project_name}</strong>
                    <br />
                    <small style={{ color: '#666' }}>{schedule.website_url}</small>
                  </td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '3px',
                      backgroundColor: '#95a5a6',
                      color: 'white',
                      fontSize: '12px',
                      textTransform: 'capitalize'
                    }}>
                      {schedule.schedule_type}
                    </span>
                    {schedule.interval_days && (
                      <small style={{ display: 'block', color: '#666', marginTop: '3px' }}>
                        Every {schedule.interval_days} days
                      </small>
                    )}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button
                      onClick={() => handleToggleSchedule(schedule.id, schedule.active)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '12px',
                        backgroundColor: schedule.active ? '#2ecc71' : '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      {schedule.active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {schedule.next_crawl_at
                      ? new Date(schedule.next_crawl_at).toLocaleString()
                      : 'Manual only'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <button
                      onClick={() => handleImmediateCrawl(schedule.project_id, schedule.project_name)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '12px',
                        marginRight: '5px'
                      }}
                    >
                      Crawl Now
                    </button>
                    <button
                      onClick={() => handleUpdateSchedule(schedule.project_id, schedule)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '12px'
                      }}
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Add Crawling Schedule</h4>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
              Configure automatic crawling for any project by visiting the project details page.
            </p>
            <button onClick={onBack()}>Go to Projects</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;