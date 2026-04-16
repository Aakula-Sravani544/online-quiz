const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./database');

const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exam');
const quizRoutes = require('./routes/quiz');
const resultRoutes = require('./routes/result');

const app = express();
const PORT = process.env.PORT || 5005;

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(cors({
  origin: 'http://localhost:5175',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/result', resultRoutes);

app.get('/', (req, res) => {
    res.send('Quiz Platform API is running...');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
