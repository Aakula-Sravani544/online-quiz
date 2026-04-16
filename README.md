# QuizFlow 🚀

QuizFlow is a high-performance, full-stack online examination platform built with **React**, **Node.js**, and **Turso (LibSQL)**. It features role-based access control, real-time exam timers, and a versatile question engine.

## ✨ Features

- **Admin Dashboard**: 
  - Build assessments with MCQ, Short Answer, and Coding questions.
  - Grade student performance and view real-time analytics.
  - Export results to PDF and Excel.
- **Student Dashboard**: 
  - Join exams via unique access codes.
  - Interactive quiz environment with server-synchronized timers.
  - Review scores and historical performance.
- **Cloud Powered**: Fully migrated to **Turso Cloud** for high-availability distributed data.
- **Rich Aesthetics**: Premium UI with Glassmorphism and modern design principles.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS (or Vanilla CSS), Axios, Lucide React.
- **Backend**: Node.js, Express, LibSQL (Turso), JWT Authentication, PDFKit.
- **Database**: Turso (Distributed SQLite).

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Turso CLI (for database management)

### 2. Configuration
Create a `.env` file in the `backend/` directory:
```env
PORT=5005
JWT_SECRET=your_secret_key
TURSO_DATABASE_URL=libsql://your-db-url.turso.io
TURSO_AUTH_TOKEN=your_auth_token
```

### 3. Installation
Install dependencies for both frontend and backend:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Running the Application
Start both services concurrently:
```bash
# In backend/
npm run dev (or node server.js)

# In frontend/
npm run dev
```

Visit `http://localhost:5175` to access the portal.

## 🛡️ Security
- **JWT Authentication**: All routes are protected with token-based authorization.
- **Middleware**: Specific `verifyAdmin` and `verifyToken` filters ensure data integrity.

## 📄 License
MIT License.
