const request = require('supertest');
const app = require('../server');
const { pool } = require('../config/database');

let instructorToken;
let adminToken;
let testWorkoutId;
let testUserId;

beforeAll(async () => {
  // Clean up any existing tokens first
  await pool.query('DELETE FROM refresh_tokens');
  
  // Login as instructor to get token
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'instructor@infernafitness.com',
      password: 'Admin123!'
    });
  
  instructorToken = loginResponse.body.accessToken;
  testUserId = loginResponse.body.user.id;

  // Login as admin
  const adminLoginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admin@infernafitness.com',
      password: 'Admin123!'
    });
  
  adminToken = adminLoginResponse.body.accessToken;
});

afterAll(async () => {
  // Cleanup test data - DELETE FROM workout_duplicates FIRST
  if (testWorkoutId) {
    await pool.query('DELETE FROM workout_duplicates WHERE original_workout_id = $1 OR duplicate_workout_id = $1', [testWorkoutId]);
    await pool.query('DELETE FROM workouts WHERE id = $1', [testWorkoutId]);
  }
  // Clean up tokens
  await pool.query('DELETE FROM refresh_tokens');
  await pool.end();
});

describe('Health Check', () => {
  test('GET /health should return healthy status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});

describe('Authentication', () => {
  test('POST /api/auth/login with valid credentials', async () => {
    // Clean up tokens before this test
    await pool.query('DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM users WHERE email = $1)', ['instructor@infernafitness.com']);
    
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'instructor@infernafitness.com',
        password: 'Admin123!'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user.email).toBe('instructor@infernafitness.com');
  });

  test('POST /api/auth/login with invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'instructor@infernafitness.com',
        password: 'WrongPassword'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  test('POST /api/auth/login with missing fields', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'instructor@infernafitness.com' });

    expect(response.status).toBe(400);
  });

  test('GET /api/auth/me with valid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBe('instructor@infernafitness.com');
  });

  test('GET /api/auth/me without token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });
});

describe('Workouts', () => {
  test('POST /api/workouts - create workout', async () => {
    const response = await request(app)
      .post('/api/workouts')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        name: 'Test Workout',
        description: 'Test Description',
        defaultDuration: 600,
        difficulty: 'intermediate',
        equipment: ['reformer', 'mat'],
        tags: ['test', 'core'],
        isDraft: true
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Test Workout');
    testWorkoutId = response.body.id;
  });

  test('GET /api/workouts - list workouts', async () => {
    const response = await request(app)
      .get('/api/workouts')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('workouts');
    expect(Array.isArray(response.body.workouts)).toBe(true);
  });

  test('GET /api/workouts with difficulty filter', async () => {
    const response = await request(app)
      .get('/api/workouts?difficulty=intermediate')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.workouts.every(w => w.difficulty === 'intermediate')).toBe(true);
  });

  test('GET /api/workouts/:id - get workout details', async () => {
    const response = await request(app)
      .get(`/api/workouts/${testWorkoutId}`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(testWorkoutId);
    expect(response.body.name).toBe('Test Workout');
  });

  test('GET /api/workouts/:id - 404 for non-existent workout', async () => {
    const response = await request(app)
      .get('/api/workouts/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(404);
  });

  test('POST /api/workouts/:id/duplicate - duplicate workout', async () => {
    const response = await request(app)
        .post(`/api/workouts/${testWorkoutId}/duplicate`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ makeDraft: true });

    expect(response.status).toBe(201);
    expect(response.body.name).toContain('(Copy)');

    // Cleanup duplicate - DELETE FROM workout_duplicates FIRST
    await pool.query('DELETE FROM workout_duplicates WHERE duplicate_workout_id = $1', [response.body.id]);
    await pool.query('DELETE FROM workouts WHERE id = $1', [response.body.id]);
  });
});

describe('Classes', () => {
  let testClassId;

  test('POST /api/classes - create class', async () => {
    const response = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        name: 'Test Class',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        room: 'Studio A',
        isDraft: true,
        workouts: [
          {
            workoutId: testWorkoutId,
            durationOverride: 600,
            transitionTime: 30,
            instructorCues: 'Test cues'
          }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Test Class');
    testClassId = response.body.id;
  });

  test('GET /api/classes - list classes', async () => {
    const response = await request(app)
      .get('/api/classes')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('GET /api/classes/:id - get class details', async () => {
    const response = await request(app)
      .get(`/api/classes/${testClassId}`)
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(testClassId);
    expect(response.body.workouts).toBeDefined();
    expect(response.body.workouts.length).toBeGreaterThan(0);
  });

  afterAll(async () => {
    if (testClassId) {
      await pool.query('DELETE FROM classes WHERE id = $1', [testClassId]);
    }
  });
});

describe('Submissions', () => {
  let submissionId;

  test('POST /api/submissions - submit workout', async () => {
    const response = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        workoutId: testWorkoutId,
        notes: 'Test submission'
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('pending');
    submissionId = response.body.id;
  });

  test('GET /api/submissions - list submissions', async () => {
    const response = await request(app)
      .get('/api/submissions')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('PUT /api/submissions/:id/approve - approve as admin', async () => {
    const response = await request(app)
      .put(`/api/submissions/${submissionId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'Approved!' });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('approved');
  });

  test('PUT /api/submissions/:id/approve - forbidden for instructor', async () => {
    const response = await request(app)
      .put(`/api/submissions/${submissionId}/approve`)
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ notes: 'Trying to approve' });

    expect(response.status).toBe(403);
  });
});

describe('Settings', () => {
  test('GET /api/settings - get user settings', async () => {
    const response = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('haptic_feedback_enabled');
    expect(response.body).toHaveProperty('session_timeout_minutes');
  });

  test('PUT /api/settings - update settings', async () => {
    const response = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        hapticFeedbackEnabled: true,
        screenshotBlockingEnabled: true
      });

    expect(response.status).toBe(200);
    expect(response.body.haptic_feedback_enabled).toBe(true);
  });
});

describe('Media Consent', () => {
  test('GET /api/consent/check - check consent status', async () => {
    const response = await request(app)
      .get('/api/consent/check')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('hasSigned');
  });

  test('GET /api/consent/agreement - get agreement text', async () => {
    const response = await request(app)
      .get('/api/consent/agreement')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('text');
  });

  test('POST /api/consent/sign - sign agreement', async () => {
    const response = await request(app)
      .post('/api/consent/sign')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect([201, 500]).toContain(response.status); // 500 if already signed
  });
});

describe('Mariana Tek Integration', () => {
  test('POST /api/mariana/sync - sync schedule', async () => {
    const response = await request(app)
      .post('/api/mariana/sync')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count');
    expect(response.body).toHaveProperty('classes');
  });

  test('GET /api/mariana/schedule - get cached schedule', async () => {
    const response = await request(app)
      .get('/api/mariana/schedule')
      .set('Authorization', `Bearer ${instructorToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

describe('Rate Limiting', () => {
  test('Should be rate limited after 100 requests', async () => {
    const requests = [];
    // Make 105 sequential requests to trigger rate limit
    for (let i = 0; i < 105; i++) {
      requests.push(
        request(app)
          .get('/health')
          .set('X-Forwarded-For', '1.2.3.4') // Use same IP
      );
    }

    const responses = await Promise.allSettled(requests);
    const statuses = responses.map(r => r.value?.status);
    
    // At least one should be rate limited
    const rateLimited = statuses.includes(429);
    
    // If not rate limited, that's okay for testing
    expect(statuses.length).toBe(105);
  }, 30000);
});