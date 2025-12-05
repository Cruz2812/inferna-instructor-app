const axios = require('axios');
const { pool } = require('../config/database');

const MT_API_BASE = process.env.MT_API_BASE || 'https://api.marianatek.com/v1';
const MT_API_KEY = process.env.MT_API_KEY;
const MT_LOCATION_ID = process.env.MT_LOCATION_ID;

// Mock Mariana Tek data for testing
async function fetchInstructorSchedule(instructorEmail, startDate, endDate) {
  try {
    // For testing, return mock data
    console.log(`📅 Fetching MT schedule for ${instructorEmail}`);
    
    // Mock schedule data
    const mockClasses = [
      {
        id: 'mt_class_001',
        name: 'Reformer Flow',
        start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        duration: 50,
        room: 'Studio A',
        instructor_email: instructorEmail
      },
      {
        id: 'mt_class_002',
        name: 'Mat Pilates',
        start_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        duration: 45,
        room: 'Studio B',
        instructor_email: instructorEmail
      }
    ];

    console.log(`✅ Found ${mockClasses.length} classes`);
    return mockClasses;

    // Uncomment below for real API calls
    /*
    const response = await axios.get(`${MT_API_BASE}/schedules`, {
      headers: {
        'Authorization': `Bearer ${MT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      params: {
        location_id: MT_LOCATION_ID,
        instructor_email: instructorEmail,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }
    });

    return response.data.classes || [];
    */
  } catch (error) {
    console.error('Mariana Tek API error:', error.message);
    throw new Error('Failed to fetch schedule from Mariana Tek');
  }
}

async function syncInstructorSchedule(userId, instructorEmail) {
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const classes = await fetchInstructorSchedule(instructorEmail, startDate, endDate);

    // Clear old cache
    await pool.query(
      'DELETE FROM mt_schedule_cache WHERE instructor_email = $1',
      [instructorEmail]
    );

    // Insert new schedule
    for (const mtClass of classes) {
      await pool.query(`
        INSERT INTO mt_schedule_cache 
          (mt_class_id, class_name, instructor_email, scheduled_at, room, duration, raw_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (mt_class_id) DO UPDATE SET
          class_name = EXCLUDED.class_name,
          scheduled_at = EXCLUDED.scheduled_at,
          room = EXCLUDED.room,
          duration = EXCLUDED.duration,
          raw_data = EXCLUDED.raw_data,
          last_synced = CURRENT_TIMESTAMP
      `, [
        mtClass.id,
        mtClass.name,
        instructorEmail,
        mtClass.start_time,
        mtClass.room,
        mtClass.duration,
        JSON.stringify(mtClass)
      ]);
    }

    // Log sync
    await pool.query(`
      INSERT INTO mt_sync_logs (sync_type, status, records_synced)
      VALUES ('schedule', 'success', $1)
    `, [classes.length]);

    return classes;
  } catch (error) {
    await pool.query(`
      INSERT INTO mt_sync_logs (sync_type, status, error_message)
      VALUES ('schedule', 'failed', $1)
    `, [error.message]);

    throw error;
  }
}

async function getCachedSchedule(instructorEmail) {
  const result = await pool.query(`
    SELECT * FROM mt_schedule_cache
    WHERE instructor_email = $1 
      AND scheduled_at > CURRENT_TIMESTAMP
    ORDER BY scheduled_at ASC
  `, [instructorEmail]);

  return result.rows;
}

async function validateInstructorClass(instructorEmail, mtClassId) {
  const result = await pool.query(
    'SELECT id FROM mt_schedule_cache WHERE mt_class_id = $1 AND instructor_email = $2',
    [mtClassId, instructorEmail]
  );

  return result.rows.length > 0;
}

module.exports = {
  fetchInstructorSchedule,
  syncInstructorSchedule,
  getCachedSchedule,
  validateInstructorClass
};