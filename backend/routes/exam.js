const express = require('express');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Create Exam (Advanced)
router.post('/create', verifyAdmin, async (req, res) => {
    const { title, duration, passing_score, start_time, end_time, exam_code, questions } = req.body;

    if (!title || !duration || !exam_code || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Please provide all required fields' });
    }

    try {
        const insertRes = await db.execute({
            sql: 'INSERT INTO exams (title, duration, passing_score, start_time, end_time, exam_code, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
            args: [title, duration, passing_score || 0, start_time, end_time, exam_code, req.user.id]
        });
        
        console.log('Exam Insertion Raw Result:', JSON.stringify(insertRes));
        
        if (!insertRes.rows || insertRes.rows.length === 0) {
            throw new Error('No rows returned from exam insertion');
        }

        const examId = insertRes.rows[0].id;
        console.log('Extracted Exam ID:', examId);

        const batchOps = questions.map(q => {
            const optionsStr = q.type === 'mcq' ? JSON.stringify(q.options) : null;
            return {
                sql: 'INSERT INTO questions (exam_id, question_text, options, correct_answer, explanation, marks, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [examId, q.question_text, optionsStr, q.correct_answer, q.explanation, q.marks || 1, q.type]
            };
        });

        if (batchOps.length > 0) {
            console.log('Executing batch for', batchOps.length, 'questions');
            await db.batch(batchOps);
        }

        res.status(201).json({ message: 'Exam created successfully', examId });
    } catch (err) {
        console.error('SERVER ERROR IN /exam/create:');
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// List Exams
router.get('/list', verifyToken, async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM exams ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Exam by code (Advanced)
router.get('/:code', verifyToken, async (req, res) => {
    const { code } = req.params;
    try {
        const exam = await db.get('SELECT * FROM exams WHERE UPPER(exam_code) = UPPER(?)', [code]);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const questions = await db.all('SELECT id, question_text, options, type, marks, explanation FROM questions WHERE exam_id = ?', [exam.id]);
        
        const formattedQuestions = questions.map(q => {
            if (q.type === 'mcq' && q.options) {
                try { q.options = JSON.parse(q.options); } catch(e) { q.options = []; }
            }
            return q;
        });
        
        res.json({ ...exam, questions: formattedQuestions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ dest: 'uploads/' });

// Parse & Validate Questions from Excel (For Preview)
router.post('/upload-questions', verifyAdmin, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const processedRows = rows.map((row, index) => {
            const rowNum = index + 2;
            const { question, type, options, correct_answer, marks, explanation } = row;
            const errors = [];

            if (!question) errors.push('Missing question');
            if (!type) errors.push('Missing type');
            if (!correct_answer) errors.push('Missing correct_answer');
            if (type && !['mcq', 'coding', 'short_answer', 'mcq'].includes(type)) errors.push(`Invalid type: ${type}`);

            return {
                row: rowNum,
                question_text: question || '',
                type: type || 'mcq',
                options: type === 'mcq' ? (options ? options.split(',').map(s => s.trim()) : []) : [],
                correct_answer: String(correct_answer || ''),
                marks: marks || 1,
                explanation: explanation || '',
                isValid: errors.length === 0,
                errors
            };
        });

        res.json({
            rows: processedRows,
            summary: {
                total: rows.length,
                valid: processedRows.filter(r => r.isValid).length,
                invalid: processedRows.filter(r => !r.isValid).length
            }
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to parse Excel file' });
    }
});

// Bulk Save Questions (Final Step)
router.post('/save-questions-bulk', verifyAdmin, async (req, res) => {
    const { examId, questions } = req.body;
    if (!examId || !questions || !Array.isArray(questions)) {
        return res.status(400).json({ error: 'Missing examId or questions' });
    }

    try {
        const batchOps = questions.map(q => {
            const optionsStr = q.type === 'mcq' ? JSON.stringify(q.options) : null;
            return {
                sql: 'INSERT INTO questions (exam_id, question_text, options, correct_answer, explanation, marks, type) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [examId, q.question_text, optionsStr, q.correct_answer, q.explanation, q.marks, q.type]
            };
        });

        await db.batch(batchOps);
        res.json({ message: 'Questions saved successfully', count: questions.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Student Management - View All
router.get('/admin/students', verifyAdmin, async (req, res) => {
    const { search } = req.query;
    let query = "SELECT id, name, email FROM users WHERE role = 'student'";
    let params = [];
    if (search) {
        query += " AND (name LIKE ? OR email LIKE ?)";
        params = [`%${search}%`, `%${search}%`];
    }
    try {
        const rows = await db.all(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Student Management - Grant Retake
router.post('/admin/grant-retake', verifyAdmin, async (req, res) => {
    const { user_id, exam_id } = req.body;
    try {
        await db.run('DELETE FROM attempts WHERE user_id = ? AND exam_id = ?', [user_id, exam_id]);
        res.json({ message: 'Retake permission granted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
