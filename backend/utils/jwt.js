const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

async function generateTokens(user) {
  const accessToken = jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = jwt.sign(
    { 
      userId: user.id,
      // Add a unique identifier to prevent collisions
      jti: require('crypto').randomBytes(16).toString('hex')
    },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  
  // Use INSERT ... ON CONFLICT to handle duplicates gracefully
  await pool.query(`
    INSERT INTO refresh_tokens (user_id, token, expires_at) 
    VALUES ($1, $2, $3)
    ON CONFLICT (token) DO NOTHING
  `, [user.id, refreshToken, expiresAt]);

  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken
};