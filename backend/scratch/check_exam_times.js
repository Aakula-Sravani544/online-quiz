const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('quiz.db');

db.all('SELECT title, exam_code, start_time, end_time FROM exams', [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        rows.forEach(r => {
            console.log(`Title: ${r.title}, Code: ${r.exam_code}\n  Start: ${r.start_time}\n  End:   ${r.end_time}`);
        });
    }
    db.close();
});
