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

// Download Sample Template
router.get('/template/questions', (req, res) => {
    const workbook = xlsx.utils.book_new();
    const data = [
        ['question', 'type', 'options', 'correct_answer', 'marks', 'explanation'],
        ['What is 2+2?', 'mcq', '3, 4, 5, 2', '4', 1, 'Basic addition'],
        ['Write a function to sum a & b', 'coding', '', 'function sum(a,b){ return a+b; }', 2, 'JavaScript function syntax'],
        ['What is the capital of France?', 'short_answer', '', 'Paris', 1, 'Geography basics']
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sample');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=quiz_template.xlsx');
    res.send(buffer);
});

// Parse & Validate Questions from Excel (For Preview)
router.post('/upload-questions', verifyAdmin, upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const processedRows = rows.map((row, index) => {
            const rowNum = index + 2;
            
            // Robust Header Normalization & Fuzzy Matching
            const rawKeys = Object.keys(row);
            const getField = (keywords) => {
                const key = rawKeys.find(k => {
                    const clean = String(k).toLowerCase().replace(/[\s_-]/g, '');
                    return keywords.some(kw => clean.includes(kw));
                });
                return key ? row[key] : null;
            };

            // Enhanced Fallback: If no match, try to find the longest string for question
            let questionText = getField(['question', 'qtext', 'detail', 'content', 'title']);
            if (!questionText) {
                // Heuristic: The largest text field is likely the question
                const textKeys = rawKeys.filter(k => typeof row[k] === 'string' && row[k].length > 10);
                if (textKeys.length > 0) questionText = row[textKeys[0]];
                else questionText = row[rawKeys[0]]; // Final fallback to col 1
            }

            const typeValue = (String(getField(['type', 'category', 'kind']) || 'mcq')).toLowerCase().replace(/[\s_-]/g, '');
            const correctAnswer = getField(['answer', 'correct', 'solution', 'key', 'res', 'val']);
            const marksValue = getField(['marks', 'weight', 'point', 'score', 'pts', 'val']);
            const explanationText = getField(['explanation', 'context', 'reason', 'desc', 'why']) || '';
            const optionsText = getField(['options', 'choices', 'list', 'opts', 'vals']) || '';

            const errors = [];
            if (!questionText) errors.push('Missing question text');
            if (!correctAnswer) errors.push('Missing answer');
            
            const validTypes = ['mcq', 'coding', 'short_answer'];
            if (!validTypes.includes(typeValue)) {
                // Try to infer type from options
                if (optionsText) errors.push(`Invalid type: ${typeValue}`);
            }

            return {
                row: rowNum,
                question_text: String(questionText || ''),
                type: validTypes.includes(typeValue) ? typeValue : 'mcq',
                options: typeValue === 'mcq' || optionsText ? (String(optionsText).split(',').map(s => s.trim())) : [],
                correct_answer: String(correctAnswer || ''),
                marks: Number(marksValue) || 1,
                explanation: String(explanationText),
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
        console.error('Excel Parse Error:', err);
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
        await db.batch([
            {
                sql: 'DELETE FROM answers WHERE attempt_id IN (SELECT id FROM attempts WHERE user_id = ? AND exam_id = ?)',
                args: [user_id, exam_id]
            },
            {
                sql: 'DELETE FROM attempts WHERE user_id = ? AND exam_id = ?',
                args: [user_id, exam_id]
            }
        ]);
        res.json({ message: 'Retake permission granted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
