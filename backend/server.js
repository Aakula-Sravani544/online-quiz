const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./database');

const path = require('path');
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exam');
const quizRoutes = require('./routes/quiz');
const resultRoutes = require('./routes/result');
const dashboardRoutes = require('./routes/dashboard');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5005;

// Environment Validation
const requiredEnv = ['JWT_SECRET', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN'];
requiredEnv.forEach(env => {
    if (!process.env[env]) {
        console.error(`CRITICAL: Environment variable ${env} is missing!`);
    }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory at:', uploadsDir);
}

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 3. CORS Fix (IMPORTANT)
app.use(cors({
  origin: ["https://online-quiz-pi-ten.vercel.app", "https://online-quiz-79f9u8pm6-sravsaakula23-3401s-projects.vercel.app", "http://localhost:5173"],
  credentials: true
}));

app.use(express.json());

// 1. Backend Verification - Test Route
app.get("/test", (req, res) => res.send("Backend working on Render"));

// Routes
app.use('/api', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/result', resultRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
