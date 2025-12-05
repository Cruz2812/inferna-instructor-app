const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const CURRENT_AGREEMENT_VERSION = '1.0';
const AGREEMENT_TEXT = `
INFERNA PILATES - MEDIA & CONTENT RELEASE AGREEMENT

By signing this agreement, I (the "Instructor") confirm that:

1. MEDIA OWNERSHIP & RIGHTS
   - I am the person featured in any photos or videos I upload
   - I own all rights to the content I submit
   - No clients, minors, or unauthorized persons appear in the media
   - I grant Inferna Pilates non-exclusive rights to store, display, and use this content internally

2. CONTENT ACCURACY
   - All movements demonstrated are safe and accurate
   - I have verified proper form and technique
   - I understand this content will be used by other instructors

3. LIBRARY CONTRIBUTION
   - Submitted content becomes part of Inferna's proprietary workout library
   - Inferna may use this content for training and instruction purposes
   - I retain credit as the creator

4. LIABILITY
   - I confirm all safety considerations have been noted
   - I have documented any injury risks or modifications needed
   - I understand Inferna will rely on this information for client safety

By clicking "I Agree," I electronically sign this agreement and consent to these terms.

Version: ${CURRENT_AGREEMENT_VERSION}
Effective Date: December 1, 2025
`;

// GET /api/consent/check - Check if user has signed
router.get('/check', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT * FROM media_consent_agreements
      WHERE user_id = $1 AND agreement_version = $2
      ORDER BY signed_at DESC
      LIMIT 1
    `, [req.user.id, CURRENT_AGREEMENT_VERSION]);

    res.json({
      hasSigned: result.rows.length > 0,
      lastSigned: result.rows[0]?.signed_at || null,
      currentVersion: CURRENT_AGREEMENT_VERSION
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/consent/agreement - Get agreement text
router.get('/agreement', authenticate, (req, res) => {
  res.json({
    version: CURRENT_AGREEMENT_VERSION,
    text: AGREEMENT_TEXT
  });
});

// POST /api/consent/sign - Sign agreement
router.post('/sign', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      INSERT INTO media_consent_agreements 
        (user_id, agreement_version, agreement_text, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      req.user.id,
      CURRENT_AGREEMENT_VERSION,
      AGREEMENT_TEXT,
      req.ip,
      req.get('user-agent')
    ]);

    res.status(201).json({
      message: 'Agreement signed successfully',
      signedAt: result.rows[0].signed_at
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;