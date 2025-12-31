const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET /api/workouts/injury-risks - Fetch all available injury risks
router.get('/injury-risks', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        description,
        severity
      FROM injury_risks
      ORDER BY 
        CASE severity 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END,
        name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching injury risks:', error);
    res.status(500).json({ error: 'Failed to fetch injury risks' });
  }
});

// Helper function to get workout with all related data
async function getWorkoutWithRelations(workoutId) {
  // Get main workout data
  const workoutResult = await pool.query(
    `SELECT 
      w.*,
      u.email as created_by_name
    FROM workouts w
    LEFT JOIN users u ON w.created_by = u.id
    WHERE w.id = $1`,
    [workoutId]
  );

  if (workoutResult.rows.length === 0) {
    return null;
  }

  const workout = workoutResult.rows[0];

  // Get media
  const mediaResult = await pool.query(
    `SELECT 
      id,
      media_type as type,
      file_path as "filePath",
      thumbnail_path as "thumbnailPath",
      duration
    FROM workout_media
    WHERE workout_id = $1
    ORDER BY created_at ASC`,
    [workoutId]
  );
  workout.media = mediaResult.rows;

  // Get injury risks with details
  const risksResult = await pool.query(
    `SELECT 
      ir.id,
      ir.name,
      ir.description,
      ir.severity,
      wir.notes
    FROM workout_injury_risks wir
    JOIN injury_risks ir ON wir.injury_risk_id = ir.id
    WHERE wir.workout_id = $1
    ORDER BY 
      CASE ir.severity 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
      END`,
    [workoutId]
  );
  workout.injury_risks = risksResult.rows;

  // Get tags
  const tagsResult = await pool.query(
    `SELECT tag
    FROM workout_alias_tags
    WHERE workout_id = $1
    ORDER BY tag ASC`,
    [workoutId]
  );
  workout.tags = tagsResult.rows.map(row => row.tag);

  return workout;
}

// GET /api/workouts - Fetch workouts with optional search
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = `
      SELECT 
        w.id,
        w.name,
        w.description,
        w.default_duration,
        w.difficulty,
        w.equipment,
        w.created_at,
        w.updated_at,
        (SELECT COUNT(*) FROM workout_media WHERE workout_id = w.id) as media_count,
        (SELECT COUNT(*) FROM workout_injury_risks WHERE workout_id = w.id) as risk_count,
        COALESCE(
          (SELECT json_agg(tag ORDER BY tag) 
           FROM workout_alias_tags 
           WHERE workout_id = w.id), 
          '[]'::json
        ) as tags
      FROM workouts w
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (
        w.name ILIKE $1 OR
        w.description ILIKE $1 OR
        EXISTS (
          SELECT 1 FROM workout_alias_tags 
          WHERE workout_id = w.id 
          AND tag ILIKE $1
        )
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY w.name ASC`;

    const result = await pool.query(query, params);
    
    // Convert tags from JSON to array and add injury_risks placeholder
    const workouts = result.rows.map(w => ({
      ...w,
      tags: w.tags || [],
      injury_risks: Array(w.risk_count).fill(null), // Placeholder for list view
      media: Array(w.media_count).fill(null) // Placeholder for list view
    }));
    
    res.json(workouts);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// GET /api/workouts/:id - Fetch single workout with all relations
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const workout = await getWorkoutWithRelations(id);

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json(workout);
  } catch (error) {
    console.error('Error fetching workout:', error);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

// POST /api/workouts - Create new workout
router.post('/', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      name,
      description,
      default_duration,
      difficulty,
      equipment,
      tags,
      injury_risk_ids
    } = req.body;

    // Validation
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Workout name is required and must be at least 3 characters' 
      });
    }

    if (!default_duration || default_duration <= 0) {
      return res.status(400).json({ 
        error: 'Default duration must be greater than 0' 
      });
    }

    const validDifficulties = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return res.status(400).json({ 
        error: 'Invalid difficulty level' 
      });
    }

    // Check for duplicate workout name
    const duplicateCheck = await client.query(
      'SELECT id FROM workouts WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'A workout with this name already exists' 
      });
    }

    // Create workout
    const workoutResult = await client.query(
      `INSERT INTO workouts (
        name,
        description,
        default_duration,
        difficulty,
        equipment,
        created_by,
        approval_status,
        is_template,
        is_submission_draft,
        last_edited_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())
      RETURNING id`,
      [
        name.trim(),
        description || null,
        default_duration,
        difficulty || 'all_levels',
        equipment || [],
        req.user.id,
        'pending',
        false,
        false
      ]
    );

    const workoutId = workoutResult.rows[0].id;

    // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tag of tags) {
        if (tag && tag.trim()) {
          await client.query(
            'INSERT INTO workout_alias_tags (workout_id, tag) VALUES ($1, $2)',
            [workoutId, tag.trim().toLowerCase()]
          );
        }
      }
    }

    // Add injury risks if provided
    if (injury_risk_ids && Array.isArray(injury_risk_ids) && injury_risk_ids.length > 0) {
      for (const riskId of injury_risk_ids) {
        await client.query(
          'INSERT INTO workout_injury_risks (workout_id, injury_risk_id) VALUES ($1, $2)',
          [workoutId, riskId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch the complete workout with relations
    const completeWorkout = await getWorkoutWithRelations(workoutId);
    res.status(201).json(completeWorkout);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating workout:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  } finally {
    client.release();
  }
});

// PUT /api/workouts/:id - Update workout
router.put('/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      name,
      description,
      default_duration,
      difficulty,
      equipment,
      tags,
      injury_risk_ids
    } = req.body;

    // Check if workout exists
    const existingWorkout = await client.query(
      'SELECT id FROM workouts WHERE id = $1',
      [id]
    );

    if (existingWorkout.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Validation
    if (!name || name.trim().length < 3) {
      return res.status(400).json({ 
        error: 'Workout name is required and must be at least 3 characters' 
      });
    }

    if (!default_duration || default_duration <= 0) {
      return res.status(400).json({ 
        error: 'Default duration must be greater than 0' 
      });
    }

    const validDifficulties = ['beginner', 'intermediate', 'advanced', 'all_levels'];
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return res.status(400).json({ 
        error: 'Invalid difficulty level' 
      });
    }

    // Check for duplicate workout name (excluding current workout)
    const duplicateCheck = await client.query(
      'SELECT id FROM workouts WHERE LOWER(name) = LOWER($1) AND id != $2',
      [name.trim(), id]
    );

    if (duplicateCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'A workout with this name already exists' 
      });
    }

    // Update workout
    await client.query(
      `UPDATE workouts SET
        name = $1,
        description = $2,
        default_duration = $3,
        difficulty = $4,
        equipment = $5,
        last_edited_at = NOW(),
        updated_at = NOW()
      WHERE id = $6`,
      [
        name.trim(),
        description || null,
        default_duration,
        difficulty || 'all_levels',
        equipment || [],
        id
      ]
    );

    // Update tags - delete old ones and insert new ones
    if (tags !== undefined) {
      await client.query('DELETE FROM workout_alias_tags WHERE workout_id = $1', [id]);
      
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tag of tags) {
          if (tag && tag.trim()) {
            await client.query(
              'INSERT INTO workout_alias_tags (workout_id, tag) VALUES ($1, $2)',
              [id, tag.trim().toLowerCase()]
            );
          }
        }
      }
    }

    // Update injury risks - delete old ones and insert new ones
    if (injury_risk_ids !== undefined) {
      await client.query('DELETE FROM workout_injury_risks WHERE workout_id = $1', [id]);
      
      if (Array.isArray(injury_risk_ids) && injury_risk_ids.length > 0) {
        for (const riskId of injury_risk_ids) {
          await client.query(
            'INSERT INTO workout_injury_risks (workout_id, injury_risk_id) VALUES ($1, $2)',
            [id, riskId]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Fetch the complete updated workout
    const completeWorkout = await getWorkoutWithRelations(id);
    res.json(completeWorkout);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating workout:', error);
    res.status(500).json({ error: 'Failed to update workout' });
  } finally {
    client.release();
  }
});

// DELETE /api/workouts/:id - Delete workout
router.delete('/:id', authenticate, async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if workout exists
    const existingWorkout = await client.query(
      'SELECT id FROM workouts WHERE id = $1',
      [id]
    );

    if (existingWorkout.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Check if workout is used in any classes
    const usageCheck = await client.query(
      'SELECT COUNT(*) as count FROM class_workouts WHERE workout_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'Cannot delete workout - it is currently used in one or more classes' 
      });
    }

    // Delete related records (cascade should handle this, but being explicit)
    await client.query('DELETE FROM workout_alias_tags WHERE workout_id = $1', [id]);
    await client.query('DELETE FROM workout_injury_risks WHERE workout_id = $1', [id]);
    await client.query('DELETE FROM workout_media WHERE workout_id = $1', [id]);
    
    // Delete workout
    await client.query('DELETE FROM workouts WHERE id = $1', [id]);

    await client.query('COMMIT');

    res.json({ 
      message: 'Workout deleted successfully',
      id 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting workout:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  } finally {
    client.release();
  }
});

module.exports = router;