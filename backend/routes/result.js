const express = require('express');
const { verifyToken } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Get all submissions for Admin
router.get('/admin/all', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
    
    try {
        const rows = await db.all(`
            SELECT a.id as attempt_id, a.user_id, a.exam_id, a.score, a.submitted_at, u.name as student_name, e.title, e.passing_score
            FROM attempts a 
            JOIN users u ON a.user_id = u.id 
            JOIN exams e ON a.exam_id = e.id 
            ORDER BY a.submitted_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Detailed Result
router.get('/details/:attemptId', verifyToken, async (req, res) => {
    const { attemptId } = req.params;
    
    try {
        const row = await db.get(`
            SELECT a.*, e.title, e.passing_score 
            FROM attempts a 
            JOIN exams e ON a.exam_id = e.id 
            WHERE a.id = ?
        `, [attemptId]);
        
        if (!row) return res.status(404).json({ error: 'Result not found' });

        const answers = await db.all(`
            SELECT ans.*, q.question_text, q.correct_answer, q.explanation, q.marks as q_marks
            FROM answers ans
            JOIN questions q ON ans.question_id = q.id
            WHERE ans.attempt_id = ?
        `, [attemptId]);

        // Calc total possible marks
        const total = await db.get('SELECT SUM(marks) as total FROM questions WHERE exam_id = ?', [row.exam_id]);
        
        res.json({ 
            ...row, 
            answers, 
            total_possible_marks: total.total || 0 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get results by userId
router.get('/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    
    if (req.user.role !== 'admin' && String(req.user.id) !== String(userId)) {
        return res.status(403).json({ error: 'Unauthorized to view these results' });
    }

    try {
        const rows = await db.all(`
            SELECT a.id as attempt_id, a.score, a.submitted_at, e.title, e.duration 
            FROM attempts a 
            JOIN exams e ON a.exam_id = e.id 
            WHERE a.user_id = ? 
            ORDER BY a.submitted_at DESC
        `, [userId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

// Global Rankings
router.get('/leaderboard/all', verifyToken, async (req, res) => {
    try {
        const rows = await db.all(`
            SELECT u.name, SUM(a.score) as score, SUM(a.time_taken) as time_taken, COUNT(a.id) as exams_taken
            FROM attempts a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.status = 'submitted'
            GROUP BY u.id
            ORDER BY score DESC, time_taken ASC 
            LIMIT 50
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Detailed Leaderboard per Exam
router.get('/leaderboard/:examId', verifyToken, async (req, res) => {
    const { examId } = req.params;
    try {
        const rows = await db.all(`
            SELECT u.name, a.score, a.time_taken, a.submitted_at 
            FROM attempts a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.exam_id = ? AND a.status = 'submitted'
            ORDER BY a.score DESC, a.time_taken ASC, a.submitted_at ASC 
            LIMIT 50
        `, [examId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Question-wise stats for Admin
router.get('/stats/:examId', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    try {
        const rows = await db.all(`
            SELECT q.question_text, COUNT(ans.id) as attempts, SUM(ans.is_correct) as corrects
            FROM questions q
            LEFT JOIN answers ans ON q.id = ans.question_id
            WHERE q.exam_id = ?
            GROUP BY q.id
        `, [req.params.examId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export Results as Excel
router.get('/export/excel/:examId', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Results');
        
        worksheet.columns = [
            { header: 'Student Name', key: 'name', width: 25 },
            { header: 'Score', key: 'score', width: 10 },
            { header: 'Time Taken (s)', key: 'time_taken', width: 15 },
            { header: 'Pass/Fail', key: 'status', width: 15 },
            { header: 'Submitted At', key: 'submitted_at', width: 20 }
        ];

        const rows = await db.all(`
            SELECT u.name, a.score, a.time_taken, a.submitted_at, 
            CASE WHEN a.score >= e.passing_score THEN 'Pass' ELSE 'Fail' END as status
            FROM attempts a 
            JOIN users u ON a.user_id = u.id 
            JOIN exams e ON a.exam_id = e.id
            WHERE a.exam_id = ?
        `, [req.params.examId]);
        
        rows.forEach(row => worksheet.addRow(row));
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=results_${req.params.examId}.xlsx`);
        
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export Results as PDF
router.get('/export/pdf/:examId', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

    try {
        const rows = await db.all(`
            SELECT u.name, a.score, a.time_taken, 
            CASE WHEN a.score >= e.passing_score THEN 'Pass' ELSE 'Fail' END as status
            FROM attempts a 
            JOIN users u ON a.user_id = u.id 
            JOIN exams e ON a.exam_id = e.id
            WHERE a.exam_id = ?
        `, [req.params.examId]);

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=results_${req.params.examId}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text('Exam Results Report', { align: 'center' });
        doc.moveDown();

        rows.forEach(row => {
            doc.fontSize(12).text(`Student: ${row.name} | Score: ${row.score} | Status: ${row.status}`);
            doc.moveDown(0.5);
        });

        doc.end();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
