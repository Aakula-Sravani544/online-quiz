const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('quiz.db');

db.all("SELECT * FROM attempts WHERE exam_id = 4", [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.table(rows);
    }
    db.close();
});
