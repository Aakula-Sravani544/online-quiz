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

// Serve static files from the React app
const frontendPath = path.join(__dirname, '../frontend/dist');
console.log('Frontend Static Path:', frontendPath);

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok', vercel: !!process.env.VERCEL, now: new Date().toISOString() }));
app.use('/api', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/result', resultRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Only serve static files + catchall if NOT on Vercel
// Vercel handles static serving and routing via vercel.json
if (!process.env.VERCEL) {
    app.use(express.static(frontendPath));

    app.get(/.*/, (req, res) => {
        if (!req.url.startsWith('/api')) {
            const indexPath = path.join(frontendPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                console.error('CRITICAL: index.html not found at', indexPath);
                res.status(500).send('Frontend build missing. Please run build script.');
            }
        } else {
            res.status(404).json({ error: 'API route not found' });
        }
    });
} else {
    // On Vercel, provide a basic 404 for missing API routes
    app.all('/api/*', (req, res) => {
        res.status(404).json({ error: `API route ${req.method} ${req.url} not found on Vercel` });
    });
}

// Only skip app.listen if we are on Vercel (which uses serverless functions)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
