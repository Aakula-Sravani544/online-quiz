const { createClient } = require('@libsql/client');
require('dotenv').config();

if (!process.env.TURSO_DATABASE_URL) {
    console.error('CRITICAL ERROR: TURSO_DATABASE_URL is not defined!');
}

const db = createClient({
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
});

// Helper for single row
db.get = async (sql, params = []) => {
    const rs = await db.execute({ sql, args: params });
    return rs.rows[0] ? { ...rs.rows[0] } : null;
};

// Helper for many rows
db.all = async (sql, params = []) => {
    const rs = await db.execute({ sql, args: params });
    return rs.rows.map(row => ({ ...row }));
};

// Helper for insert/update (returns lastInsertRowid approx)
db.run = async (sql, params = []) => {
    const rs = await db.execute({ sql, args: params });
    const lastID = rs.lastInsertRowid ? Number(rs.lastInsertRowid) : null;
    console.log('db.run Result:', { lastID, affected: rs.rowsAffected });
    return { lastID, changes: rs.rowsAffected };
};

// Initialization function
async function initializeTables() {
    try {
        console.log('Connecting to Turso...');
        
        // Users table
        await db.execute(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'student'
        )`);

        // Exams table
        await db.execute(`CREATE TABLE IF NOT EXISTS exams (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            duration INTEGER NOT NULL,
            passing_score INTEGER DEFAULT 0,
            start_time TEXT,
            end_time TEXT,
            exam_code TEXT UNIQUE NOT NULL,
            admin_id INTEGER,
            FOREIGN KEY (admin_id) REFERENCES users (id)
        )`);

        // Questions table
        await db.execute(`CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            exam_id INTEGER,
            question_text TEXT NOT NULL,
            options TEXT,
            correct_answer TEXT,
            explanation TEXT,
            marks INTEGER DEFAULT 1,
            type TEXT NOT NULL,
            FOREIGN KEY (exam_id) REFERENCES exams (id)
        )`);

        // Attempts table
        await db.execute(`CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            exam_id INTEGER,
            answers TEXT,
            score REAL DEFAULT 0,
            status TEXT DEFAULT 'in-progress',
            start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
            submitted_at DATETIME,
            time_taken INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (exam_id) REFERENCES exams (id)
        )`);

        // Detailed Answers table
        await db.execute(`CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            attempt_id INTEGER,
            question_id INTEGER,
            answer TEXT,
            is_correct INTEGER DEFAULT 0,
            marks_awarded INTEGER DEFAULT 0,
            FOREIGN KEY (attempt_id) REFERENCES attempts (id),
            FOREIGN KEY (question_id) REFERENCES questions (id)
        )`);

        console.log('Turso Tables Initialized.');
    } catch (err) {
        console.error('Turso Initialization Error:', err);
    }
}

initializeTables();

module.exports = db;
