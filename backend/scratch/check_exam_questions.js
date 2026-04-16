const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('quiz.db');

db.get("SELECT id FROM exams WHERE exam_code = 'SAFE123'", [], (err, exam) => {
    if (exam) {
        db.all("SELECT id, question_text FROM questions WHERE exam_id = ?", [exam.id], (err, rows) => {
            console.log(`Exam SAFE123 (ID: ${exam.id}) has ${rows.length} questions.`);
            db.close();
        });
    } else {
        console.log('Exam SAFE123 not found.');
        db.close();
    }
});
