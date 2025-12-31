const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Submit class for featured review
router.post('/classes/:id/submit', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log('=== SUBMIT FOR FEATURED ===');
    console.log('Class ID:', id);
    console.log('User ID:', req.user.id);

    // Verify user owns the class
    const classCheck = await pool.query(
      'SELECT instructor_id, is_draft, name FROM classes WHERE id = $1',
      [id]
    );

    if (classCheck.rows.length === 0) {
      console.log('ERROR: Class not found');
      return res.status(404).json({ error: 'Class not found' });
    }

    const classData = classCheck.rows[0];
    console.log('Class found:', classData.name);

    if (classData.instructor_id !== req.user.id) {
      console.log('ERROR: User does not own this class');
      return res.status(403).json({ error: 'Access denied' });
    }

    if (classData.is_draft) {
      console.log('ERROR: Cannot submit draft classes');
      return res.status(400).json({ error: 'Cannot submit draft classes' });
    }

    // Update status
    await pool.query(
      `UPDATE classes 
       SET featured_status = 'pending', 
           featured_submitted_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [id]
    );

    console.log('SUCCESS: Class submitted for review');
    res.json({ message: 'Class submitted for featured review' });
  } catch (error) {
    console.error('ERROR in submit featured:', error);
    next(error);
  }
});

// Get pending featured submissions (admin only)
router.get('/pending', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(`
      SELECT 
        c.*,
        u.email as instructor_email,
        COUNT(cw.id) as workout_count
      FROM classes c
      JOIN users u ON c.instructor_id = u.id
      LEFT JOIN class_workouts cw ON c.id = cw.class_id
      WHERE c.featured_status = 'pending'
      GROUP BY c.id, u.email
      ORDER BY c.featured_submitted_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Approve/Reject featured submission (admin only)
router.patch('/classes/:id/review', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await pool.query(
      `UPDATE classes 
       SET featured_status = $1,
           is_featured = $2,
           featured_reviewed_at = CURRENT_TIMESTAMP,
           featured_reviewed_by = $3
       WHERE id = $4`,
      [approved ? 'approved' : 'rejected', approved, req.user.id, id]
    );

    res.json({ message: `Class ${approved ? 'approved' : 'rejected'}` });
  } catch (error) {
    next(error);
  }
});

module.exports = router;