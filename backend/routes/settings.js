const express = require('express');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings - Get user settings
router.get('/', authenticate, async (req, res, next) => {
  try {
    let result = await pool.query(
      'SELECT * FROM user_app_settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO user_app_settings (user_id)
        VALUES ($1)
        RETURNING *
      `, [req.user.id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings - Update user settings
router.put('/', authenticate, async (req, res, next) => {
  try {
    const {
      biometricUnlockEnabled,
      sessionTimeoutMinutes,
      screenshotBlockingEnabled,
      hapticFeedbackEnabled,
      autoDeleteCacheHours,
      mtAutoSyncEnabled,
      mtSyncIntervalMinutes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO user_app_settings (
        user_id,
        biometric_unlock_enabled,
        session_timeout_minutes,
        screenshot_blocking_enabled,
        haptic_feedback_enabled,
        auto_delete_cache_hours,
        mt_auto_sync_enabled,
        mt_sync_interval_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        biometric_unlock_enabled = COALESCE($2, user_app_settings.biometric_unlock_enabled),
        session_timeout_minutes = COALESCE($3, user_app_settings.session_timeout_minutes),
        screenshot_blocking_enabled = COALESCE($4, user_app_settings.screenshot_blocking_enabled),
        haptic_feedback_enabled = COALESCE($5, user_app_settings.haptic_feedback_enabled),
        auto_delete_cache_hours = COALESCE($6, user_app_settings.auto_delete_cache_hours),
        mt_auto_sync_enabled = COALESCE($7, user_app_settings.mt_auto_sync_enabled),
        mt_sync_interval_minutes = COALESCE($8, user_app_settings.mt_sync_interval_minutes),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      req.user.id,
      biometricUnlockEnabled,
      sessionTimeoutMinutes,
      screenshotBlockingEnabled,
      hapticFeedbackEnabled,
      autoDeleteCacheHours,
      mtAutoSyncEnabled,
      mtSyncIntervalMinutes
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/notifications - Get notification preferences
router.get('/notifications', authenticate, async (req, res, next) => {
  try {
    let result = await pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      result = await pool.query(
        'INSERT INTO notification_preferences (user_id) VALUES ($1) RETURNING *',
        [req.user.id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/notifications - Update notification preferences
router.put('/notifications', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      INSERT INTO notification_preferences (
        user_id,
        email_workout_submitted,
        email_workout_approved,
        email_workout_rejected,
        email_template_published,
        email_mt_sync_failed,
        push_class_starting_soon,
        push_schedule_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        email_workout_submitted = COALESCE($2, notification_preferences.email_workout_submitted),
        email_workout_approved = COALESCE($3, notification_preferences.email_workout_approved),
        email_workout_rejected = COALESCE($4, notification_preferences.email_workout_rejected),
        email_template_published = COALESCE($5, notification_preferences.email_template_published),
        email_mt_sync_failed = COALESCE($6, notification_preferences.email_mt_sync_failed),
        push_class_starting_soon = COALESCE($7, notification_preferences.push_class_starting_soon),
        push_schedule_updated = COALESCE($8, notification_preferences.push_schedule_updated)
      RETURNING *
    `, [
      req.user.id,
      req.body.emailWorkoutSubmitted,
      req.body.emailWorkoutApproved,
      req.body.emailWorkoutRejected,
      req.body.emailTemplatePublished,
      req.body.emailMtSyncFailed,
      req.body.pushClassStartingSoon,
      req.body.pushScheduleUpdated
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;