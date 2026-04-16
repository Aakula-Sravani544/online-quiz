const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('quiz.db');

db.all('SELECT title, exam_code FROM exams', [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.table(rows);
    }
    db.close();
});
