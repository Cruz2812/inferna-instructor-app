# Inferna Backend API

REST API for the Inferna Instructor App.

## 🚀 Setup

1. Install dependencies:
```bash
npm install
```

2. Create database:
```bash
psql -U postgres
CREATE DATABASE inferna_db;
CREATE USER inferna_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE inferna_db TO inferna_user;
\q
```

3. Apply schema:
```bash
psql -U inferna_user -d inferna_db -f schema.sql
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env file with your credentials
```

5. Start server:
```bash
npm run dev
```

## 🧪 Testing
```bash
npm test
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Workouts
- `GET /api/workouts` - List workouts
- `GET /api/workouts/:id` - Get workout details
- `POST /api/workouts` - Create workout
- `PUT /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout
- `POST /api/workouts/:id/duplicate` - Duplicate workout
- `GET /api/workouts/drafts/list` - Get user's drafts

### Classes
- `GET /api/classes` - List classes
- `GET /api/classes/:id` - Get class details
- `POST /api/classes` - Create class
- `PUT /api/classes/:id` - Update class
- `DELETE /api/classes/:id` - Delete class

### Submissions
- `POST /api/submissions` - Submit workout
- `GET /api/submissions` - List submissions
- `PUT /api/submissions/:id/approve` - Approve (admin)
- `PUT /api/submissions/:id/reject` - Reject (admin)

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Mariana Tek
- `POST /api/mariana/sync` - Sync schedule
- `GET /api/mariana/schedule` - Get cached schedule

## 🔒 Security

- JWT authentication with 15min access tokens
- Refresh tokens with 7 day expiry
- bcrypt password hashing (10 rounds)
- Rate limiting (100 req/15min)
- Helmet security headers
- CORS protection
- SQL injection prevention
- XSS protection

## 📊 Database Schema

23 tables including:
- users, workouts, classes
- injury_risks, class_types
- workout_submissions, audit_logs
- mt_schedule_cache, user_settings
- And more...

See `schema.sql` for complete structure.