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

const app = express();
const PORT = process.env.PORT || 5005;

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/result', resultRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Serve static files from the React app
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// API index route
app.get('/api', (req, res) => {
    res.send('Quiz Platform API is running...');
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    if (!req.url.startsWith('/api')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        res.status(404).json({ error: 'API route not found' });
    }
});

// Only skip app.listen if we are on Vercel (which uses serverless functions)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
