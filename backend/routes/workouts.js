const express = require('express');
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/workouts - Browse catalog with filters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { 
      search, 
      difficulty, 
      status = 'approved',
      page = 1, 
      limit = 20 
    } = req.query;

    let query = `
      SELECT 
        w.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', wm.id,
          'type', wm.media_type,
          'filePath', wm.file_path
        )) FILTER (WHERE wm.id IS NOT NULL) as media,
        json_agg(DISTINCT wat.tag) FILTER (WHERE wat.tag IS NOT NULL) as tags,
        json_agg(DISTINCT jsonb_build_object(
          'id', ir.id,
          'name', ir.name,
          'severity', ir.severity
        )) FILTER (WHERE ir.id IS NOT NULL) as injury_risks
      FROM workouts w
      LEFT JOIN workout_media wm ON w.id = wm.workout_id
      LEFT JOIN workout_alias_tags wat ON w.id = wat.workout_id
      LEFT JOIN workout_injury_risks wir ON w.id = wir.workout_id
      LEFT JOIN injury_risks ir ON wir.injury_risk_id = ir.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (req.user.role === 'instructor') {
      query += ` AND w.approval_status = 'approved'`;
    } else if (status !== 'all') {
      query += ` AND w.approval_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (w.name ILIKE $${paramIndex} OR w.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (difficulty) {
      query += ` AND w.difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    query += ` GROUP BY w.id ORDER BY w.name ASC`;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    res.json({
      workouts: result.rows,
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/workouts/:id - Get workout details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        w.*,
        json_agg(DISTINCT jsonb_build_object(
          'id', wm.id,
          'type', wm.media_type,
          'filePath', wm.file_path,
          'thumbnailPath', wm.thumbnail_path,
          'duration', wm.duration
        )) FILTER (WHERE wm.id IS NOT NULL) as media,
        json_agg(DISTINCT wat.tag) FILTER (WHERE wat.tag IS NOT NULL) as tags,
        json_agg(DISTINCT jsonb_build_object(
          'id', ir.id,
          'name', ir.name,
          'severity', ir.severity,
          'description', ir.description,
          'notes', wir.notes
        )) FILTER (WHERE ir.id IS NOT NULL) as injury_risks,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM workouts w
      LEFT JOIN workout_media wm ON w.id = wm.workout_id
      LEFT JOIN workout_alias_tags wat ON w.id = wat.workout_id
      LEFT JOIN workout_injury_risks wir ON w.id = wir.workout_id
      LEFT JOIN injury_risks ir ON wir.injury_risk_id = ir.id
      LEFT JOIN users u ON w.created_by = u.id
      WHERE w.id = $1
      GROUP BY w.id, u.first_name, u.last_name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST /api/workouts - Create new workout
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { 
      name, 
      description, 
      defaultDuration, 
      difficulty, 
      equipment, 
      tags, 
      injuryRisks,
      isDraft = true 
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Workout name required' });
    }

    const status = isDraft ? 'draft' : 'pending';

    const result = await pool.query(`
      INSERT INTO workouts 
        (name, description, default_duration, difficulty, equipment, created_by, approval_status, is_submission_draft)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, description, defaultDuration, difficulty, equipment, req.user.id, status, isDraft]);

    const workout = result.rows[0];

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        await pool.query(
          'INSERT INTO workout_alias_tags (workout_id, tag) VALUES ($1, $2)',
          [workout.id, tag]
        );
      }
    }

    if (injuryRisks && injuryRisks.length > 0) {
      for (const risk of injuryRisks) {
        await pool.query(
          'INSERT INTO workout_injury_risks (workout_id, injury_risk_id, notes) VALUES ($1, $2, $3)',
          [workout.id, risk.id, risk.notes]
        );
      }
    }

    res.status(201).json(workout);
  } catch (error) {
    next(error);
  }
});

// GET /api/workouts/drafts - Get user's drafts
router.get('/drafts/list', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT w.*, 
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - w.last_edited_at)) as seconds_since_edit
      FROM workouts w
      WHERE w.created_by = $1 
        AND w.is_submission_draft = true
      ORDER BY w.last_edited_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// POST /api/workouts/:id/duplicate - Duplicate workout
router.post('/:id/duplicate', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { makeDraft = false } = req.body;

    const originalResult = await pool.query(
      'SELECT * FROM workouts WHERE id = $1',
      [id]
    );

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const original = originalResult.rows[0];

    const duplicateResult = await pool.query(`
      INSERT INTO workouts 
        (name, description, default_duration, difficulty, equipment, 
         created_by, approval_status, is_submission_draft)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      original.name + ' (Copy)',
      original.description,
      original.default_duration,
      original.difficulty,
      original.equipment,
      req.user.id,
      makeDraft ? 'draft' : 'pending',
      makeDraft
    ]);

    const duplicate = duplicateResult.rows[0];

    await pool.query(
      'INSERT INTO workout_duplicates (original_workout_id, duplicate_workout_id, duplicated_by) VALUES ($1, $2, $3)',
      [id, duplicate.id, req.user.id]
    );

    await pool.query(`
      INSERT INTO workout_alias_tags (workout_id, tag)
      SELECT $1, tag FROM workout_alias_tags WHERE workout_id = $2
    `, [duplicate.id, id]);

    await pool.query(`
      INSERT INTO workout_injury_risks (workout_id, injury_risk_id, notes)
      SELECT $1, injury_risk_id, notes FROM workout_injury_risks WHERE workout_id = $2
    `, [duplicate.id, id]);

    res.status(201).json(duplicate);
  } catch (error) {
    next(error);
  }
});

// PUT /api/workouts/:id - Update workout
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, defaultDuration, difficulty, equipment } = req.body;

    const checkResult = await pool.query(
      'SELECT created_by FROM workouts WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    if (
      req.user.role === 'instructor' && 
      checkResult.rows[0].created_by !== req.user.id
    ) {
      return res.status(403).json({ error: 'Cannot edit workout created by another instructor' });
    }

    const result = await pool.query(`
      UPDATE workouts 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          default_duration = COALESCE($3, default_duration),
          difficulty = COALESCE($4, difficulty),
          equipment = COALESCE($5, equipment)
      WHERE id = $6
      RETURNING *
    `, [name, description, defaultDuration, difficulty, equipment, id]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/workouts/:id - Delete workout
router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM workouts WHERE id = $1', [id]);
    res.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;