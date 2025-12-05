const express = require('express');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// GET /api/templates - Get shared templates
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        ct.name as class_type_name,
        u.first_name || ' ' || u.last_name as shared_by_name,
        COUNT(cw.id) as workout_count
      FROM classes c
      LEFT JOIN class_types ct ON c.class_type_id = ct.id
      LEFT JOIN users u ON c.shared_by = u.id
      LEFT JOIN class_workouts cw ON c.id = cw.class_id
      WHERE c.is_template = true AND c.is_shared_template = true
      GROUP BY c.id, ct.name, u.first_name, u.last_name
      ORDER BY c.shared_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/templates/:classId/share - Share class as template
router.post('/:classId/share', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { templateName } = req.body;

    const result = await pool.query(`
      UPDATE classes
      SET is_template = true,
          is_shared_template = true,
          shared_by = $1,
          shared_at = CURRENT_TIMESTAMP,
          template_name = $2
      WHERE id = $3
      RETURNING *
    `, [req.user.id, templateName, classId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Notify all instructors
    const instructorsResult = await pool.query(`
      SELECT email, first_name FROM users 
      WHERE role = 'instructor' AND is_active = true
    `);

    const instructorEmails = instructorsResult.rows.map(r => r.email);

    await sendEmail({
      to: instructorEmails,
      subject: `New Class Template Available: ${templateName}`,
      text: `Hi Team,

A new class template is now available in the app: "${templateName}"

Shared by: ${req.user.first_name} ${req.user.last_name}

You can find this template in the Templates section and use it for your upcoming classes.

Best,
Inferna Fitness`
    });

    res.json({
      message: 'Template shared successfully',
      template: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/templates/:templateId/use - Create class from template
router.post('/:templateId/use', authenticate, async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const { scheduledAt, name } = req.body;

    const templateResult = await pool.query(
      'SELECT * FROM classes WHERE id = $1 AND is_template = true',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];

    const classResult = await pool.query(`
      INSERT INTO classes 
        (name, class_type_id, instructor_id, scheduled_at, total_duration, is_draft)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING *
    `, [
      name || template.name,
      template.class_type_id,
      req.user.id,
      scheduledAt,
      template.total_duration
    ]);

    const newClass = classResult.rows[0];

    // Copy workouts from template
    await pool.query(`
      INSERT INTO class_workouts 
        (class_id, workout_id, sequence_order, duration_override, transition_time, instructor_cues)
      SELECT $1, workout_id, sequence_order, duration_override, transition_time, instructor_cues
      FROM class_workouts
      WHERE class_id = $2
    `, [newClass.id, templateId]);

    res.status(201).json(newClass);
  } catch (error) {
    next(error);
  }
});

module.exports = router;