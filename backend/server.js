// server.js

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const workoutsRoutes = require('./routes/workouts');
const classRoutes = require('./routes/classes');
const submissionRoutes = require('./routes/submissions');
const marianaRoutes = require('./routes/mariana');
const consentRoutes = require('./routes/consent');
const templateRoutes = require('./routes/templates');
const settingsRoutes = require('./routes/settings');
const featuredRoutes = require('./routes/featured');

const { errorHandler } = require('./middleware/errorHandler');
const { auditLogger } = require('./middleware/auditLogger');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ============================================================================
// GENERAL MIDDLEWARE
// ============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));
app.use(auditLogger);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutsRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/mariana', marianaRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/featured', featuredRoutes); 

console.log('\n📍 REGISTERED ROUTES:');
console.log('   ✓ /api/auth');
console.log('   ✓ /api/workouts');
console.log('   ✓ /api/classes');
console.log('   ✓ /api/submissions');
console.log('   ✓ /api/mariana');
console.log('   ✓ /api/consent');
console.log('   ✓ /api/templates');
console.log('   ✓ /api/settings');
console.log('   ✓ /api/featured');  // ✅ Should see this!
console.log('');

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

// ============================================================================
// START SERVER
// ============================================================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('\n🚀 ===================================');
    console.log('   INFERNA INSTRUCTOR APP - BACKEND');
    console.log('   ===================================');
    console.log(`   Server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    console.log('   ===================================\n');
    console.log('📧 Test Login Credentials:');
    console.log('   Admin: admin@infernafitness.com');
    console.log('   Instructor: instructor@infernafitness.com');
    console.log('   Password: Admin123!');
    console.log('   ===================================\n');
  });
}

module.exports = app;