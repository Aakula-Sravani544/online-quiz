const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(__dirname, process.env.DB_NAME || 'quiz.db');
const db = new sqlite3.Database(dbPath);

console.log('Seeding database with sample data...');

db.serialize(() => {
    // Drop existing tables
    db.run('DROP TABLE IF EXISTS leaderboard');
    db.run('DROP TABLE IF EXISTS answers');
    db.run('DROP TABLE IF EXISTS attempts');
    db.run('DROP TABLE IF EXISTS questions');
    db.run('DROP TABLE IF EXISTS exams');
    db.run('DROP TABLE IF EXISTS users');

    // Create tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'student'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        duration INTEGER NOT NULL,
        passing_score INTEGER DEFAULT 0,
        start_time DATETIME,
        end_time DATETIME,
        exam_code TEXT UNIQUE NOT NULL,
        admin_id INTEGER,
        FOREIGN KEY (admin_id) REFERENCES users (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER,
        question_text TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT,
        explanation TEXT,
        marks INTEGER DEFAULT 1,
        type TEXT CHECK(type IN ('mcq', 'coding', 'short_answer')) NOT NULL,
        FOREIGN KEY (exam_id) REFERENCES exams (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS attempts (
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

    db.run(`CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id INTEGER,
        question_id INTEGER,
        answer TEXT,
        is_correct INTEGER DEFAULT 0,
        marks_awarded INTEGER DEFAULT 0,
        FOREIGN KEY (attempt_id) REFERENCES attempts (id),
        FOREIGN KEY (question_id) REFERENCES questions (id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        exam_id INTEGER,
        score REAL,
        time_taken INTEGER,
        rank INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (exam_id) REFERENCES exams (id)
    )`);

    const salt = bcrypt.genSaltSync(10);
    const adminHash = bcrypt.hashSync('admin123', salt);
    const student1Hash = bcrypt.hashSync('student123', salt);
    const student2Hash = bcrypt.hashSync('student123', salt);

    // Insert Admin
    db.run(`INSERT INTO users (name, email, password, role) VALUES ('Admin User', 'admin@quiz.com', ?, 'admin')`, [adminHash]);
    
    // Insert Students
    db.run(`INSERT INTO users (name, email, password, role) VALUES ('Alice Johnson', 'alice@quiz.com', ?, 'student')`, [student1Hash]);
    db.run(`INSERT INTO users (name, email, password, role) VALUES ('Bob Smith', 'bob@quiz.com', ?, 'student')`, [student2Hash]);

    // Insert Exams with Start/End Time
    const now = new Date();
    const startTime = new Date(now.getTime() - 3600000).toISOString(); // 1 hour ago
    const endTime = new Date(now.getTime() + 86400000).toISOString(); // 1 day from now

    db.run(`INSERT INTO exams (title, duration, passing_score, start_time, end_time, exam_code, admin_id) VALUES ('Full Stack JS', 60, 50, ?, ?, 'FS101', 1)`, [startTime, endTime]);
    db.run(`INSERT INTO exams (title, duration, passing_score, start_time, end_time, exam_code, admin_id) VALUES ('Python Masters', 45, 40, ?, ?, 'PY202', 1)`, [startTime, endTime]);

    // Insert Questions
    db.run(`INSERT INTO questions (exam_id, question_text, options, correct_answer, marks, type, explanation) VALUES (1, 'What is 2+2?', '["3","4","5","6"]', '4', 10, 'mcq', 'Basic arithmetic calculation.')`);
    db.run(`INSERT INTO questions (exam_id, question_text, options, correct_answer, marks, type, explanation) VALUES (1, 'Write a "hello world" function.', NULL, 'function hello(){return "hello world"}', 20, 'coding', 'Standard JS function return string.')`);
    db.run(`INSERT INTO questions (exam_id, question_text, options, correct_answer, marks, type, explanation) VALUES (1, 'Who created JS?', NULL, 'Brendan Eich', 10, 'short_answer', 'Brendan Eich created JS in 10 days at Netscape.')`);

    console.log('Seed completed successfully with advanced schema!');
    db.close();
});
