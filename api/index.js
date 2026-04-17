const express = require('express');
const cors = require('cors');
const authRoutes = require('../backend/routes/auth');
const examRoutes = require('../backend/routes/exam');
const quizRoutes = require('../backend/routes/quiz');
const resultRoutes = require('../backend/routes/result');
const dashboardRoutes = require('../backend/routes/dashboard');

const app = express();
app.use(cors());
app.use(express.json());

// Set up routes specifically for the /api prefix
app.get('/api/health', (req, res) => res.json({ status: 'ok', vercel: true, now: new Date().toISOString() }));
app.use('/api', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/result', resultRoutes);
app.use('/api/dashboard', dashboardRoutes);

module.exports = app;
