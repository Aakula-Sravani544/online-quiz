const express = require('express');
const { verifyToken } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// 1. GET /api/dashboard/stats
router.get('/stats', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    try {
        console.log('STATS: Fetching total exams...');
        const exams = await db.get('SELECT COUNT(*) as count FROM exams');
        console.log('STATS: Fetching total students...');
        const students = await db.get('SELECT COUNT(*) as count FROM users WHERE role = ?', ['student']);
        console.log('STATS: Fetching total submissions...');
        const submissions = await db.get('SELECT COUNT(*) as count FROM attempts WHERE status = ?', ['submitted']);
        
        console.log('STATS: Fetching active exams...');
        const activeExams = await db.get(`
            SELECT COUNT(*) as count FROM exams 
            WHERE strftime('%s', 'now') BETWEEN strftime('%s', start_time) AND strftime('%s', end_time)
        `);

        res.json({
            totalExams: exams?.count || 0,
            totalStudents: students?.count || 0,
            totalSubmissions: submissions?.count || 0,
            activeExams: activeExams?.count || 0
        });
    } catch (err) {
        console.error('DASHBOARD STATS ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. GET /api/dashboard/charts
router.get('/charts', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    try {
        console.log('CHARTS: Fetching score distribution...');
        const scores = await db.all('SELECT score FROM attempts WHERE status = ?', ['submitted']);
        const distribution = {
            '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0, '100+': 0
        };
        scores.forEach(s => {
            const val = Number(s.score) || 0;
            if (val <= 20) distribution['0-20']++;
            else if (val <= 40) distribution['21-40']++;
            else if (val <= 60) distribution['41-60']++;
            else if (val <= 80) distribution['61-80']++;
            else if (val <= 100) distribution['81-100']++;
            else distribution['100+']++;
        });

        console.log('CHARTS: Fetching submissions over time...');
        const timeSeries = await db.all(`
            SELECT date(submitted_at) as date, COUNT(*) as count 
            FROM attempts 
            WHERE status = 'submitted' AND submitted_at >= date('now', '-7 days')
            GROUP BY date(submitted_at)
            ORDER BY date(submitted_at) ASC
        `);

        res.json({
            scoreDistribution: Object.entries(distribution).map(([range, count]) => ({ range, count })),
            submissionsOverTime: timeSeries
        });
    } catch (err) {
        console.error('DASHBOARD CHARTS ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. GET /api/dashboard/recent
router.get('/recent', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    try {
        const rows = await db.all(`
            SELECT a.id, u.name as student_name, e.title as exam_name, a.score, a.submitted_at
            FROM attempts a 
            JOIN users u ON a.user_id = u.id 
            JOIN exams e ON a.exam_id = e.id 
            WHERE a.status = 'submitted'
            ORDER BY a.submitted_at DESC 
            LIMIT 5
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
