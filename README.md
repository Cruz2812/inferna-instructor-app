# Inferna Instructor App

A comprehensive mobile application for Pilates instructors to manage classes, workouts, and schedules.

## 🏗️ Project Structure

- **backend/** - Node.js/Express REST API
- **mobile/** - React Native mobile app (Expo)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn
- Expo Go app (for mobile testing)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
psql -U postgres -f schema.sql
npm run dev
```

Backend runs on http://localhost:3000

### Mobile Setup
```bash
cd mobile
npm install
npm start
# Scan QR code with Expo Go app
```

## 📚 Documentation

See individual README files:
- [Backend Documentation](./backend/README.md)
- [Mobile Documentation](./mobile/README.md)

## 🧪 Testing
```bash
cd backend
npm test
```

## 🔐 Test Credentials

- **Admin**: admin@infernafitness.com / Admin123!
- **Instructor**: instructor@infernafitness.com / Admin123!

## 📱 Features

- ✅ User authentication with JWT
- ✅ Workout catalog with search & filters
- ✅ Class management
- ✅ Real-time search
- ✅ Mariana Tek integration
- ✅ Offline support
- ✅ Role-based access control

## 🛠️ Tech Stack

**Backend:**
- Node.js, Express
- PostgreSQL
- JWT authentication
- Bcrypt encryption

**Mobile:**
- React Native (Expo)
- Redux Toolkit
- React Navigation
- Axios

## 📄 License

Proprietary - Inferna Fitness

## 👥 Authors

- Development Team