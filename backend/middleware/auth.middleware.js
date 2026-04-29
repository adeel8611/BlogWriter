const pool = require('../database/connection');

/**
 * Authentication middleware
 * Verifies user session and adds user info to request
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify session
    const sessionResult = await pool.query(`
      SELECT us.*, u.username, u.email, u.role
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.token = $1 AND us.expires_at > CURRENT_TIMESTAMP
    `, [token]);

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = {
      id: sessionResult.rows[0].user_id,
      username: sessionResult.rows[0].username,
      email: sessionResult.rows[0].email,
      role: sessionResult.rows[0].role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Admin-only middleware
 * Verifies user has admin role
 */
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * User-only middleware
 * Verifies user has user role (allows both user and admin)
 */
const userOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Optional authentication middleware
 * Adds user info if authenticated, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const sessionResult = await pool.query(`
        SELECT us.*, u.username, u.email, u.role
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.token = $1 AND us.expires_at > CURRENT_TIMESTAMP
      `, [token]);

      if (sessionResult.rows.length > 0) {
        req.user = {
          id: sessionResult.rows[0].user_id,
          username: sessionResult.rows[0].username,
          email: sessionResult.rows[0].email,
          role: sessionResult.rows[0].role
        };
      }
    }
    next();
  } catch (error) {
    // Don't block request on auth error, just continue without user info
    next();
  }
};

module.exports = {
  authenticate,
  adminOnly,
  userOnly,
  optionalAuth
};