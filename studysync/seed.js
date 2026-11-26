// Optional: fill the database with a week of realistic sample sessions so the dashboard looks alive in a demo.
// Usage: npm run seed      (add --reset to wipe existing sessions first)
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(process.env.DB_FILE || path.join(__dirname, 'studysync.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Study',
    notes TEXT DEFAULT '', started_at TEXT NOT NULL, duration_min REAL NOT NULL CHECK (duration_min > 0)
  );
  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, subject TEXT NOT NULL UNIQUE COLLATE NOCASE,
    target_hours REAL NOT NULL CHECK (target_hours > 0), created_at TEXT NOT NULL
  );
`);
if (process.argv.includes('--reset')) {
  db.exec('DELETE FROM sessions');
  db.exec('DELETE FROM goals');
}

const plan = [
  ['Data Structures', 'Study', 'Linked lists and stacks', [60, 45, 0, 75, 50, 0, 40]],
  ['Mathematics', 'Revision', 'Unit 2 problems', [30, 0, 60, 40, 0, 45, 0]],
  ['DBMS', 'Project', 'StudySync schema + API', [0, 40, 50, 0, 90, 60, 80]],
  ['Physics Lab', 'Assignment', 'Record writing', [0, 25, 0, 35, 0, 0, 30]],
  ['Break', 'Break', 'Phone / scrolling', [20, 30, 25, 15, 35, 40, 20]],
];
const ins = db.prepare('INSERT INTO sessions (subject, category, notes, started_at, duration_min) VALUES (?,?,?,?,?)');
let n = 0;
plan.forEach(([subject, category, notes, mins], idx) => {
  mins.forEach((m, i) => {
    if (!m) return;
    const daysAgo = 6 - i; // i=6 -> today
    const d = new Date(Date.now() - daysAgo * 86400000);
    d.setUTCHours(4 + idx * 2, 30, 0, 0); // spread through the day (UTC), safely inside the same local day
    if (d.getTime() > Date.now()) d.setTime(Date.now() - (idx + 1) * 60000);
    ins.run(subject, category, notes, d.toISOString(), m);
    n++;
  });
});
const insGoal = db.prepare('INSERT OR IGNORE INTO goals (subject, target_hours, created_at) VALUES (?, ?, ?)');
insGoal.run('Data Structures', 5, new Date().toISOString());
insGoal.run('DBMS', 4, new Date().toISOString());
insGoal.run('Mathematics', 3, new Date().toISOString());

console.log(`Seeded ${n} sample sessions and 3 weekly goals.`);
