import React, { useState } from 'react';
import api from '../services/api';

function Login({ onLogin, onShowSignup }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login(formData);
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      onLogin(result.user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="your@email.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="•••••••"
              style={{ paddingRight: '80px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#666',
                fontSize: '14px',
                padding: '4px 8px'
              }}
            >
              {showPassword ? '👁️ Hide' : '👁️ Show'}
            </button>
          </div>
        </div>

        {error && <div className="error" style={{ marginBottom: '15px' }}>{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '14px' }}>
          {/* <p>Default admin credentials:</p> */}
          {/* <p style={{ fontSize: '12px', color: '#666' }}>
            Username: <strong>admin</strong> | Password: <strong>admin123</strong>
          </p> */}
          <hr style={{ margin: '15px 0', border: 'none', borderTop: '1px solid #ddd' }} />
          <p style={{ margin: '0 0 5px 0' }}>Don't have an account?</p>
          <button
            type="button"
            className="secondary"
            onClick={onShowSignup}
            style={{ marginTop: '5px' }}
          >
            Sign Up
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;