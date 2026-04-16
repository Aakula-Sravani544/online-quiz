const express = require('express');
const { verifyToken } = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

// Start Exam (Server-side Timer initialization)
router.post('/start', verifyToken, async (req, res) => {
    const { exam_id } = req.body;
    const user_id = req.user.id;

    try {
        // 1. Check if already attempted (submitted)
        const row = await db.get('SELECT id, status FROM attempts WHERE user_id = ? AND exam_id = ?', [user_id, exam_id]);
        
        if (row && row.status === 'submitted') {
            return res.status(403).json({ error: 'You have already submitted this exam.' });
        }

        // 2. If already in progress, return existing attempt
        if (row && row.status === 'in-progress') {
            return res.json({ attemptId: row.id, message: 'Resuming exam' });
        }

        // 3. Create new attempt
        const result = await db.execute({
            sql: "INSERT INTO attempts (user_id, exam_id, start_time, status) VALUES (?, ?, CURRENT_TIMESTAMP, 'in-progress') RETURNING id",
            args: [user_id, exam_id]
        });
        res.status(201).json({ attemptId: result.rows[0].id, message: 'Exam started' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Auto-Save Answers
router.post('/autosave', verifyToken, async (req, res) => {
    const { attempt_id, answers, time_taken } = req.body;
    const answersStr = JSON.stringify(answers);

    try {
        await db.run('UPDATE attempts SET answers = ?, time_taken = ? WHERE id = ?', [answersStr, time_taken, attempt_id]);
        res.json({ message: 'Auto-saved' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Remaining Time (Server-based)
router.get('/time-left/:attemptId', verifyToken, async (req, res) => {
    try {
        const row = await db.get(`
            SELECT (unixepoch() - unixepoch(a.start_time)) as elapsed, e.duration 
            FROM attempts a 
            JOIN exams e ON a.exam_id = e.id 
            WHERE a.id = ?
        `, [req.params.attemptId]);
        
        if (!row) return res.status(404).json({ error: 'Attempt not found' });

        const remaining = (row.duration * 60) - row.elapsed;
        console.log(`TIMER SYNC: ID=${req.params.attemptId}, Dur=${row.duration}, Elap=${row.elapsed}, Rem=${remaining}`);

        res.json({ timeLeft: Math.max(0, Math.floor(remaining)) });
    } catch (err) {
        console.error('Timer Sync Fail:', err);
        res.status(500).json({ error: err.message });
    }
});

// Run Code (Mock Execution)
router.post('/run-code', verifyToken, (req, res) => {
    const { code, language } = req.body;
    let output = '';
    let error = null;

    if (language === 'javascript') {
        try {
            if (code.includes('return')) {
                output = 'Execution successful. Result returned.';
            } else {
                output = 'Code compiled successfully.';
            }
        } catch (e) {
            error = e.message;
        }
    } else {
        output = `Running ${language} code... Simulation successful.`;
    }

    res.json({ output, error });
});

// Final Submit
router.post('/submit', verifyToken, async (req, res) => {
    const { attempt_id, answers } = req.body;

    try {
        console.log(`SUBMIT DEBUG: Starting submission for attempt_id=${attempt_id}`);
        const att = await db.get('SELECT exam_id FROM attempts WHERE id = ?', [attempt_id]);
        if (!att) {
            console.error(`SUBMIT ERROR: Attempt ${attempt_id} not found`);
            return res.status(404).json({ error: 'Attempt not found' });
        }

        const questions = await db.all('SELECT id, correct_answer, marks FROM questions WHERE exam_id = ?', [att.exam_id]);
        console.log(`SUBMIT DEBUG: Found ${questions.length} questions for exam_id=${att.exam_id}`);

        let totalScore = 0;
        const answersMap = answers || {};
        const detailedAnswers = [];

        questions.forEach(q => {
            const userAnswer = answersMap[q.id] === undefined ? null : answersMap[q.id];
            const isCorrect = userAnswer !== null && String(userAnswer).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
            const marks = isCorrect ? q.marks : 0;
            totalScore += marks;
            detailedAnswers.push({
                sql: 'INSERT INTO answers (attempt_id, question_id, answer, is_correct, marks_awarded) VALUES (?, ?, ?, ?, ?)',
                args: [attempt_id, q.id, userAnswer, isCorrect ? 1 : 0, marks]
            });
        });

        const batchOps = [
            {
                sql: "UPDATE attempts SET score = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = ?",
                args: [totalScore, attempt_id]
            },
            ...detailedAnswers
        ];

        console.log(`SUBMIT DEBUG: Executing batch with ${batchOps.length} ops`);
        await db.batch(batchOps);
        console.log(`SUBMIT SUCCESS: Score=${totalScore}`);

        res.status(200).json({ message: 'Exam submitted', score: totalScore });
    } catch (err) {
        console.error('SUBMIT FATAL ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
