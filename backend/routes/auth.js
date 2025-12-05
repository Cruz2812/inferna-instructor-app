const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../config/database');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = await generateTokens(user);

    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      ...tokens
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const tokenResult = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP',
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

    const tokens = await generateTokens(userResult.rows[0]);

    res.json(tokens);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    firstName: req.user.first_name,
    lastName: req.user.last_name,
    role: req.user.role
  });
});

module.exports = router;