const express = require('express');
const router = express.Router();
const authService = require('./auth.service');
const { authenticate, adminOnly } = require('../../middleware/auth.middleware');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await authService.register(username, email, password);
    res.status(201).json(user);
  } catch (error) {
    console.error('Registration route error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    console.error('Login route error:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const result = await authService.logout(token);
    res.json(result);
  } catch (error) {
    console.error('Logout route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    res.json(user);
  } catch (error) {
    console.error('Get current user route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/users
 * Get all users (admin only)
 */
router.get('/users', authenticate, adminOnly, async (req, res) => {
  try {
    const users = await authService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get all users route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/auth/users/:id/role
 * Update user role (admin only)
 */
router.put('/users/:id/role', authenticate, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const user = await authService.updateUserRole(req.params.id, role);
    res.json(user);
  } catch (error) {
    console.error('Update user role route error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Delete user (admin only)
 */
router.delete('/users/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const result = await authService.deleteUser(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Delete user route error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;