// API tests using Node's built-in test runner:  npm test
const os = require('os');
const path = require('path');
const fs = require('fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const dbFile = path.join(os.tmpdir(), `studysync-test-${process.pid}.db`);
process.env.DB_FILE = dbFile;
const app = require('./server');

let server, base;
test.before(() => new Promise((resolve) => {
  server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); });
}));
test.after(() => {
  server.close();
  if (app.db && typeof app.db.close === 'function') {
    app.db.close();
  }
  fs.rmSync(dbFile, { force: true });
});

const post = (body) => fetch(`${base}/api/sessions`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

test('rejects a session with no subject', async () => {
  const r = await post({ subject: '  ', duration_min: 30 });
  assert.equal(r.status, 400);
});

test('rejects zero, negative and absurd durations', async () => {
  for (const d of [0, -5, 'abc', 99999, 0.5]) {
    const r = await post({ subject: 'Maths', duration_min: d });
    assert.equal(r.status, 400, `duration ${d} should be rejected`);
    if (d === 0.5) {
      assert.equal((await r.json()).error, 'Sessions must be at least 1 minute');
    }
  }
});

test('rejects an unknown category', async () => {
  const r = await post({ subject: 'Maths', category: 'Gaming', duration_min: 20 });
  assert.equal(r.status, 400);
});

test('creates and lists sessions, newest first', async () => {
  const a = await (await post({ subject: 'Maths', category: 'Study', duration_min: 45, started_at: '2026-10-01T10:00:00Z' })).json();
  const b = await (await post({ subject: 'DBMS', category: 'Project', duration_min: 30.5, notes: 'ER diagram' })).json();
  assert.ok(a.id && b.id);
  const rows = await (await fetch(`${base}/api/sessions`)).json();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].subject, 'DBMS'); // newer first
});

test('summary totals by subject and category', async () => {
  await post({ subject: 'DBMS', category: 'Project', duration_min: 10 });
  const s = await (await fetch(`${base}/api/summary?days=7&tz=330`)).json();
  const dbms = s.bySubject.find((r) => r.subject === 'DBMS');
  assert.equal(dbms.minutes, 40.5);
  assert.equal(dbms.sessions, 2);
  assert.equal(s.topSubject, 'DBMS');
  assert.equal(s.perDay.length, 7);
  assert.equal(s.perDay.reduce((a, d) => a + d.minutes, 0), s.totalMinutes);
});

test('summary excludes sessions older than the range', async () => {
  const s = await (await fetch(`${base}/api/summary?days=7`)).json();
  assert.equal(s.bySubject.find((r) => r.subject === 'Maths'), undefined); // logged on 1 Oct
});

test('deletes a session and 404s on a missing one', async () => {
  const rows = await (await fetch(`${base}/api/sessions`)).json();
  const del = await fetch(`${base}/api/sessions/${rows[0].id}`, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const again = await fetch(`${base}/api/sessions/${rows[0].id}`, { method: 'DELETE' });
  assert.equal(again.status, 404);
});

test('updates an existing session and validates updates', async () => {
  const created = await (await post({ subject: 'Algorithms', category: 'Study', duration_min: 50, notes: 'Sorting' })).json();

  // Valid update
  const updatedRes = await fetch(`${base}/api/sessions/${created.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject: 'Advanced Algorithms', category: 'Project', duration_min: 75, notes: 'QuickSort' }),
  });
  assert.equal(updatedRes.status, 200);
  const updated = await updatedRes.json();
  assert.equal(updated.subject, 'Advanced Algorithms');
  assert.equal(updated.category, 'Project');
  assert.equal(updated.duration_min, 75);
  assert.equal(updated.notes, 'QuickSort');

  // Invalid duration rejection
  const badDur = await fetch(`${base}/api/sessions/${created.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ duration_min: -10 }),
  });
  assert.equal(badDur.status, 400);

  const subMinDur = await fetch(`${base}/api/sessions/${created.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ duration_min: 0.5 }),
  });
  assert.equal(subMinDur.status, 400);
  assert.equal((await subMinDur.json()).error, 'Sessions must be at least 1 minute');

  // Non-existent ID returns 404
  const notFound = await fetch(`${base}/api/sessions/999999`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject: 'Test', duration_min: 20 }),
  });
  assert.equal(notFound.status, 404);

  // POST accepts 1 minute
  const oneMinPost = await post({ subject: 'Maths 1min', duration_min: 1 });
  assert.equal(oneMinPost.status, 201);
  const oneMinData = await oneMinPost.json();
  assert.equal(oneMinData.duration_min, 1);
  await fetch(`${base}/api/sessions/${oneMinData.id}`, { method: 'DELETE' });
});

test('normalises subject on POST and PUT with whitespace collapsing, trimming, capping, and case-matching', async () => {
  // Initial subject: 'Operating Systems'
  const s1 = await (await post({ subject: '  Operating   Systems  ', duration_min: 30 })).json();
  assert.equal(s1.subject, 'Operating Systems');

  // Second post matches case-insensitively and reuses 'Operating Systems'
  const s2 = await (await post({ subject: 'operating systems', duration_min: 25 })).json();
  assert.equal(s2.subject, 'Operating Systems');

  // PUT normalises with trimming and matches existing subject
  const updated = await (await fetch(`${base}/api/sessions/${s2.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject: 'OPERATING SYSTEMS' }),
  })).json();
  assert.equal(updated.subject, 'Operating Systems');

  // Length capped at 40 characters for new subject
  const longName = 'A'.repeat(50);
  const s3 = await (await post({ subject: longName, duration_min: 20 })).json();
  assert.equal(s3.subject, 'A'.repeat(40));

  // Cleanup
  await fetch(`${base}/api/sessions/${s1.id}`, { method: 'DELETE' });
  await fetch(`${base}/api/sessions/${s2.id}`, { method: 'DELETE' });
  await fetch(`${base}/api/sessions/${s3.id}`, { method: 'DELETE' });
});

test('migration merges rows differing by case/spacing into most frequent spelling and is idempotent', async () => {
  // Insert inconsistent spellings directly
  const ins = app.db.prepare('INSERT INTO sessions (subject, category, notes, started_at, duration_min) VALUES (?, ?, ?, ?, ?)');
  const info1 = ins.run('dbms', 'Study', '', '2026-10-01T10:00:00Z', 30);
  const info2 = ins.run('DBMS', 'Study', '', '2026-10-02T10:00:00Z', 45);
  const info3 = ins.run('  dbms  ', 'Study', '', '2026-10-03T10:00:00Z', 15);
  const info4 = ins.run('DBMS', 'Study', '', '2026-10-04T10:00:00Z', 60);
  const info5 = ins.run('DBMS', 'Study', '', '2026-10-05T10:00:00Z', 20);

  // Run migration first time
  app.migrateSubjects(app.db);
  const rows1 = app.db.prepare('SELECT DISTINCT subject FROM sessions WHERE id IN (?, ?, ?, ?, ?)').all(
    info1.lastInsertRowid, info2.lastInsertRowid, info3.lastInsertRowid, info4.lastInsertRowid, info5.lastInsertRowid
  );
  assert.equal(rows1.length, 1);
  assert.equal(rows1[0].subject, 'DBMS'); // 'DBMS' had 3 occurrences, 'dbms' had 2

  // Run migration second time (idempotency check)
  app.migrateSubjects(app.db);
  const rows2 = app.db.prepare('SELECT DISTINCT subject FROM sessions WHERE id IN (?, ?, ?, ?, ?)').all(
    info1.lastInsertRowid, info2.lastInsertRowid, info3.lastInsertRowid, info4.lastInsertRowid, info5.lastInsertRowid
  );
  assert.equal(rows2.length, 1);
  assert.equal(rows2[0].subject, 'DBMS');

  // Summary shows ONE bar/entry for DBMS
  const summary = await (await fetch(`${base}/api/summary?days=90`)).json();
  const dbmsMatches = summary.bySubject.filter((r) => r.subject.toLowerCase() === 'dbms');
  assert.equal(dbmsMatches.length, 1);
  assert.equal(dbmsMatches[0].subject, 'DBMS');

  // Cleanup
  app.db.prepare('DELETE FROM sessions WHERE id IN (?, ?, ?, ?, ?)').run(
    info1.lastInsertRowid, info2.lastInsertRowid, info3.lastInsertRowid, info4.lastInsertRowid, info5.lastInsertRowid
  );
});

test('GET /api/subjects returns subjects ordered by most recent use with totalMinutes and lastUsed', async () => {
  const p1 = await (await post({ subject: 'Alpha Subject', duration_min: 30, started_at: '2026-10-10T10:00:00Z' })).json();
  const p2 = await (await post({ subject: 'Beta Subject', duration_min: 45, started_at: '2026-10-12T10:00:00Z' })).json();
  const p3 = await (await post({ subject: 'Alpha Subject', duration_min: 15, started_at: '2026-10-15T10:00:00Z' })).json();

  const res = await fetch(`${base}/api/subjects`);
  assert.equal(res.status, 200);
  const list = await res.json();
  assert.ok(Array.isArray(list));

  const alpha = list.find((s) => s.subject === 'Alpha Subject');
  const beta = list.find((s) => s.subject === 'Beta Subject');
  assert.ok(alpha && beta);
  assert.equal(alpha.totalMinutes, 45);
  assert.equal(beta.totalMinutes, 45);
  assert.equal(alpha.lastUsed, '2026-10-15T10:00:00.000Z');

  // Alpha was used on 2026-10-15, Beta on 2026-10-12 -> Alpha should appear before Beta
  const alphaIdx = list.findIndex((s) => s.subject === 'Alpha Subject');
  const betaIdx = list.findIndex((s) => s.subject === 'Beta Subject');
  assert.ok(alphaIdx < betaIdx);

  // Cleanup
  await fetch(`${base}/api/sessions/${p1.id}`, { method: 'DELETE' });
  await fetch(`${base}/api/sessions/${p2.id}`, { method: 'DELETE' });
  await fetch(`${base}/api/sessions/${p3.id}`, { method: 'DELETE' });
});

test('goals API creates, retrieves progress, upserts and deletes', async () => {
  // Create a goal
  const r1 = await fetch(`${base}/api/goals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject: 'Algorithms', target_hours: 5 }),
  });
  assert.equal(r1.status, 201);
  const created = await r1.json();
  assert.equal(created.subject, 'Algorithms');
  assert.equal(created.target_hours, 5);

  // Add a session for Algorithms
  const s1 = await (await post({ subject: 'Algorithms', duration_min: 150 })).json();

  // Retrieve goals with progress
  const r2 = await fetch(`${base}/api/goals`);
  assert.equal(r2.status, 200);
  const goals = await r2.json();
  const algoGoal = goals.find((g) => g.subject === 'Algorithms');
  assert.ok(algoGoal);
  assert.equal(algoGoal.logged_minutes, 150);
  assert.equal(algoGoal.target_minutes, 300);
  assert.equal(algoGoal.progress_pct, 50);

  // Upsert goal target hours
  const r3 = await fetch(`${base}/api/goals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ subject: 'Algorithms', target_hours: 10 }),
  });
  assert.equal(r3.status, 201);

  // Delete goal
  const r4 = await fetch(`${base}/api/goals/${algoGoal.id}`, { method: 'DELETE' });
  assert.equal(r4.status, 200);

  // Cleanup session
  await fetch(`${base}/api/sessions/${s1.id}`, { method: 'DELETE' });
});

test('activity API returns streak stats and heatmap', async () => {
  const r = await fetch(`${base}/api/activity?tz=330`);
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.ok(typeof data.currentStreak === 'number');
  assert.ok(typeof data.longestStreak === 'number');
  assert.ok(Array.isArray(data.heatmap));
  assert.equal(data.heatmap.length, 60);
});

test('export CSV endpoint returns valid CSV file stream', async () => {
  const r = await fetch(`${base}/api/export/csv`);
  assert.equal(r.status, 200);
  assert.ok(r.headers.get('content-type').includes('text/csv'));
  const text = await r.text();
  assert.ok(text.startsWith('ID,Subject,Category,Duration (min),Started At,Notes'));
});
