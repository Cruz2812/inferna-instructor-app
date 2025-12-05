const express = require('express');
const { authenticate } = require('../middleware/auth');
const { 
  syncInstructorSchedule, 
  getCachedSchedule 
} = require('../services/marianatek');

const router = express.Router();

// POST /api/mariana/sync - Sync schedule
router.post('/sync', authenticate, async (req, res, next) => {
  try {
    const classes = await syncInstructorSchedule(req.user.id, req.user.email);

    res.json({
      message: 'Schedule synced successfully',
      count: classes.length,
      classes
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/mariana/schedule - Get cached schedule
router.get('/schedule', authenticate, async (req, res, next) => {
  try {
    const schedule = await getCachedSchedule(req.user.email);

    res.json(schedule);
  } catch (error) {
    next(error);
  }
});

module.exports = router;