const express = require('express');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// POST /api/submissions - Submit workout for approval
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { workoutId, notes } = req.body;

    if (!workoutId) {
      return res.status(400).json({ error: 'Workout ID required' });
    }

    const workoutResult = await pool.query(
      'SELECT * FROM workouts WHERE id = $1 AND created_by = $2',
      [workoutId, req.user.id]
    );

    if (workoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found or access denied' });
    }

    const result = await pool.query(`
      INSERT INTO workout_submissions 
        (workout_id, submitted_by, status, submission_notes)
      VALUES ($1, $2, 'pending', $3)
      RETURNING *
    `, [workoutId, req.user.id, notes]);

    await pool.query(
      'UPDATE workouts SET approval_status = $1, is_submission_draft = false WHERE id = $2',
      ['pending', workoutId]
    );

    const adminResult = await pool.query(
      "SELECT email FROM users WHERE role IN ('admin', 'manager') AND is_active = true"
    );

    const adminEmails = adminResult.rows.map(r => r.email);
    
    await sendEmail({
      to: adminEmails,
      subject: 'New Workout Submission - Inferna',
      text: `${req.user.first_name} ${req.user.last_name} has submitted a workout for approval.\n\nWorkout: ${workoutResult.rows[0].name}\nNotes: ${notes || 'None'}`
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/submissions - Get submissions
router.get('/', authenticate, async (req, res, next) => {
  try {
    let query = `
      SELECT 
        ws.*,
        w.name as workout_name,
        u.first_name || ' ' || u.last_name as submitted_by_name,
        r.first_name || ' ' || r.last_name as reviewed_by_name
      FROM workout_submissions ws
      JOIN workouts w ON ws.workout_id = w.id
      JOIN users u ON ws.submitted_by = u.id
      LEFT JOIN users r ON ws.reviewed_by = r.id
    `;

    const params = [];
    
    if (req.user.role === 'instructor') {
      query += ' WHERE ws.submitted_by = $1';
      params.push(req.user.id);
    }

    query += ' ORDER BY ws.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// PUT /api/submissions/:id/approve - Approve submission
router.put('/:id/approve', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const submissionResult = await pool.query(`
      SELECT ws.*, w.name as workout_name, u.email as submitter_email
      FROM workout_submissions ws
      JOIN workouts w ON ws.workout_id = w.id
      JOIN users u ON ws.submitted_by = u.id
      WHERE ws.id = $1
    `, [id]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    await pool.query(`
      UPDATE workout_submissions 
      SET status = 'approved', 
          reviewed_by = $1, 
          review_notes = $2,
          admin_comments = $2,
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [req.user.id, notes, id]);

    await pool.query(
      'UPDATE workouts SET approval_status = $1, approved_by = $2 WHERE id = $3',
      ['approved', req.user.id, submission.workout_id]
    );

    await sendEmail({
      to: submission.submitter_email,
      subject: 'Workout Approved - Inferna',
      text: `Your workout "${submission.workout_name}" has been approved!\n\n${notes ? 'Notes: ' + notes : ''}`
    });

    res.json({ message: 'Workout approved successfully' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/submissions/:id/reject - Reject submission
router.put('/:id/reject', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Rejection notes required' });
    }

    const submissionResult = await pool.query(`
      SELECT ws.*, w.name as workout_name, u.email as submitter_email
      FROM workout_submissions ws
      JOIN workouts w ON ws.workout_id = w.id
      JOIN users u ON ws.submitted_by = u.id
      WHERE ws.id = $1
    `, [id]);

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    await pool.query(`
      UPDATE workout_submissions 
      SET status = 'rejected', 
          reviewed_by = $1, 
          review_notes = $2,
          admin_comments = $2,
          reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [req.user.id, notes, id]);

    await pool.query(
      'UPDATE workouts SET approval_status = $1, approval_notes = $2 WHERE id = $3',
      ['rejected', notes, submission.workout_id]
    );

    await sendEmail({
      to: submission.submitter_email,
      subject: 'Workout Needs Revision - Inferna',
      text: `Your workout "${submission.workout_name}" needs some revisions.\n\nFeedback: ${notes}`
    });

    res.json({ message: 'Workout rejected with feedback' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;