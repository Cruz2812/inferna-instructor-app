const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/classes - Get instructor's classes
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status = 'all', scheduled = 'all' } = req.query;

    let query = `
      SELECT 
        c.*,
        ct.name as class_type_name,
        COUNT(cw.id) as workout_count
      FROM classes c
      LEFT JOIN class_types ct ON c.class_type_id = ct.id
      LEFT JOIN class_workouts cw ON c.id = cw.class_id
      WHERE c.instructor_id = $1
    `;

    const params = [req.user.id];

    if (status === 'draft') {
      query += ` AND c.is_draft = true`;
    } else if (status === 'final') {
      query += ` AND c.is_draft = false`;
    }

    if (scheduled === 'upcoming') {
      query += ` AND c.scheduled_at > CURRENT_TIMESTAMP`;
    } else if (scheduled === 'past') {
      query += ` AND c.scheduled_at < CURRENT_TIMESTAMP`;
    }

    query += ` GROUP BY c.id, ct.name ORDER BY c.scheduled_at DESC NULLS LAST`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/classes/:id - Get class details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const classResult = await pool.query(`
      SELECT 
        c.*,
        ct.name as class_type_name,
        ct.description as class_type_description
      FROM classes c
      LEFT JOIN class_types ct ON c.class_type_id = ct.id
      WHERE c.id = $1
    `, [id]);

    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const classData = classResult.rows[0];

    if (
      req.user.role === 'instructor' && 
      classData.instructor_id !== req.user.id
    ) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const workoutsResult = await pool.query(`
      SELECT 
        cw.*,
        w.name as workout_name,
        w.description as workout_description,
        w.difficulty,
        w.default_duration
      FROM class_workouts cw
      JOIN workouts w ON cw.workout_id = w.id
      WHERE cw.class_id = $1
      ORDER BY cw.sequence_order ASC
    `, [id]);

    classData.workouts = workoutsResult.rows;
    res.json(classData);
  } catch (error) {
    next(error);
  }
});

// POST /api/classes - Create new class
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { 
      name, 
      classTypeId, 
      scheduledAt, 
      mtClassId, 
      room, 
      isDraft = true,
      isTemplate = false,
      templateName,
      workouts = []
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Class name required' });
    }

    let totalDuration = 0;
    workouts.forEach(w => {
      totalDuration += (w.durationOverride || w.defaultDuration || 0) + (w.transitionTime || 0);
    });

    const result = await pool.query(`
      INSERT INTO classes 
        (name, class_type_id, instructor_id, scheduled_at, mt_class_id, room, 
         total_duration, is_draft, is_template, template_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      name, 
      classTypeId, 
      req.user.id, 
      scheduledAt, 
      mtClassId, 
      room, 
      Math.ceil(totalDuration / 60), 
      isDraft, 
      isTemplate, 
      templateName
    ]);

    const classData = result.rows[0];

    if (workouts.length > 0) {
      for (let i = 0; i < workouts.length; i++) {
        const w = workouts[i];
        await pool.query(`
          INSERT INTO class_workouts 
            (class_id, workout_id, sequence_order, duration_override, transition_time, instructor_cues)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          classData.id, 
          w.workoutId, 
          i + 1, 
          w.durationOverride, 
          w.transitionTime || 0, 
          w.instructorCues
        ]);
      }
    }

    res.status(201).json(classData);
  } catch (error) {
    next(error);
  }
});

// PUT /api/classes/:id - Update class
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, classTypeId, scheduledAt, room, isDraft, workouts } = req.body;

    const checkResult = await pool.query(
      'SELECT instructor_id FROM classes WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (checkResult.rows[0].instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(`
      UPDATE classes 
      SET name = COALESCE($1, name),
          class_type_id = COALESCE($2, class_type_id),
          scheduled_at = COALESCE($3, scheduled_at),
          room = COALESCE($4, room),
          is_draft = COALESCE($5, is_draft)
      WHERE id = $6
      RETURNING *
    `, [name, classTypeId, scheduledAt, room, isDraft, id]);

    if (workouts) {
      await pool.query('DELETE FROM class_workouts WHERE class_id = $1', [id]);

      for (let i = 0; i < workouts.length; i++) {
        const w = workouts[i];
        await pool.query(`
          INSERT INTO class_workouts 
            (class_id, workout_id, sequence_order, duration_override, transition_time, instructor_cues)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, w.workoutId, i + 1, w.durationOverride, w.transitionTime || 0, w.instructorCues]);
      }
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/classes/:id - Delete class
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query(
      'SELECT instructor_id FROM classes WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (checkResult.rows[0].instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.query('DELETE FROM classes WHERE id = $1', [id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;