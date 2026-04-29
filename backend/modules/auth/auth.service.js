const pool = require('../../database/connection');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  /**
   * Register a new user and create session
   */
  async register(username, email, password, role = 'user') {
    try {
      // Check if user already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Username or email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const userId = uuidv4();
      const result = await pool.query(`
        INSERT INTO users (id, username, email, password_hash, role)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, username, email, role, created_at
      `, [userId, username, email, passwordHash, role]);

      const user = result.rows[0];

      // Create session for auto-login
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      await pool.query(`
        INSERT INTO user_sessions (id, user_id, token, expires_at)
          VALUES ($1, $2, $3, $4)
      `, [uuidv4(), userId, token, expiresAt]);

      return {
        user,
        token,
        expiresAt
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      // Find user by email
      const userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid email or password');
      }

      const user = userResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Create session
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      await pool.query(`
        INSERT INTO user_sessions (id, user_id, token, expires_at)
          VALUES ($1, $2, $3, $4)
      `, [uuidv4(), user.id, token, expiresAt]);

      // Remove user's old sessions (optional, keep only last 5 sessions)
      await pool.query(`
        DELETE FROM user_sessions
          WHERE user_id = $1 AND id NOT IN (
            SELECT id FROM user_sessions
              WHERE user_id = $1
              ORDER BY created_at DESC
              LIMIT 5
          )
      `, [user.id]);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token,
        expiresAt
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(token) {
    try {
      await pool.query(
        'DELETE FROM user_sessions WHERE token = $1',
        [token]
      );
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId) {
    try {
      const result = await pool.query(
        'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers() {
    try {
      const result = await pool.query(`
        SELECT id, username, email, role, created_at
        FROM users
        ORDER BY created_at DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }

  /**
   * Update user role (admin only)
   */
  async updateUserRole(userId, role) {
    try {
      if (!['user', 'admin'].includes(role)) {
        throw new Error('Invalid role');
      }

      const result = await pool.query(`
        UPDATE users
          SET role = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id, username, email, role
      `, [role, userId]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Update user role error:', error);
      throw error;
    }
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(userId) {
    try {
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();