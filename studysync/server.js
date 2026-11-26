// StudySync backend: Express + SQLite (Node's built-in node:sqlite, no native build needed)
const express = require('express');
const path = require('path');
const http = require('http');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'studysync.db');

const db = new DatabaseSync(DB_FILE);
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    subject     TEXT    NOT NULL,
    category    TEXT    NOT NULL DEFAULT 'Study',
    notes       TEXT    DEFAULT '',
    started_at  TEXT    NOT NULL,          -- ISO timestamp
    duration_min REAL   NOT NULL CHECK (duration_min > 0)
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);

  CREATE TABLE IF NOT EXISTS goals (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    subject      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    target_hours REAL    NOT NULL CHECK (target_hours > 0),
    created_at   TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    salt          TEXT    NOT NULL,
    created_at    TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`);

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

const activeTokens = new Map();

function seedDemoUser(database) {
  try {
    const existing = database.prepare('SELECT id FROM users WHERE username = ?').get('demo');
    if (!existing) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = hashPassword('studysync123', salt);
      database.prepare('INSERT INTO users (username, name, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
        .run('demo', 'Demo Student', hash, salt, new Date().toISOString());
    }
  } catch (err) {
    console.error('Error seeding demo user:', err);
  }
}
seedDemoUser(db);

// Normalise subject string: trim, collapse repeated spaces, cap at 40 chars
function cleanSubject(s) {
  return String(s || '').trim().replace(/\s+/g, ' ').slice(0, 40);
}

// Find existing matching subject (case-insensitive) or return cleaned input
function resolveSubject(database, raw) {
  const cleaned = cleanSubject(raw);
  if (!cleaned) return '';
  const match = database.prepare('SELECT subject FROM sessions WHERE TRIM(subject) = ? COLLATE NOCASE LIMIT 1').get(cleaned);
  return match ? match.subject : cleaned;
}

// Startup migration: merges rows differing only by case/spacing into the most frequently used spelling
function migrateSubjects(database) {
  const rows = database.prepare('SELECT id, subject FROM sessions').all();
  const groups = new Map();
  for (const row of rows) {
    const rawClean = cleanSubject(row.subject);
    if (!rawClean) continue;
    const key = rawClean.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ id: row.id, subject: row.subject, clean: rawClean });
  }

  const updateStmt = database.prepare('UPDATE sessions SET subject = ? WHERE id = ?');
  for (const items of groups.values()) {
    const freq = new Map();
    for (const item of items) {
      freq.set(item.clean, (freq.get(item.clean) || 0) + 1);
    }
    let bestSpelling = items[0].clean;
    let maxCount = -1;
    for (const [spelling, count] of freq.entries()) {
      if (count > maxCount) {
        maxCount = count;
        bestSpelling = spelling;
      }
    }
    for (const item of items) {
      if (item.subject !== bestSpelling) {
        updateStmt.run(bestSpelling, item.id);
      }
    }
  }
}

migrateSubjects(db);

const CATEGORIES = ['Study', 'Assignment', 'Project', 'Revision', 'Break', 'Other'];

// CORS: allow local dev origins (localhost, 127.0.0.1 on any port) and file:// pages (origin "null")
function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === 'null') return true; // file:// pages send origin "null"
  try {
    const u = new URL(origin);
    return u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1');
  } catch { return false; }
}

const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  res.header('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create a session
app.post('/api/sessions', (req, res) => {
  const { subject, category = 'Study', notes = '', started_at, duration_min } = req.body || {};
  const dur = Number(duration_min);
  const resolvedSubj = resolveSubject(db, subject);
  if (!resolvedSubj) return res.status(400).json({ error: 'Subject is required' });
  if (!Number.isFinite(dur) || dur < 1 || dur > 24 * 60) {
    return res.status(400).json({ error: 'Sessions must be at least 1 minute' });
  }
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
  const start = started_at && !isNaN(Date.parse(started_at)) ? new Date(started_at).toISOString() : new Date().toISOString();

  const info = db
    .prepare('INSERT INTO sessions (subject, category, notes, started_at, duration_min) VALUES (?, ?, ?, ?, ?)')
    .run(resolvedSubj, category, String(notes).trim(), start, dur);
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

// List sessions (newest first), optional ?limit=
app.get('/api/sessions', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = db.prepare('SELECT * FROM sessions ORDER BY started_at DESC, id DESC LIMIT ?').all(limit);
  res.json(rows);
});

// Delete a session
app.delete('/api/sessions/:id', (req, res) => {
  const info = db.prepare('DELETE FROM sessions WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// Update a session
app.put('/api/sessions/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Session not found' });

  const { subject, category = existing.category, notes = existing.notes, duration_min, started_at } = req.body || {};
  const dur = duration_min !== undefined ? Number(duration_min) : existing.duration_min;
  const resolvedSubj = subject !== undefined ? resolveSubject(db, subject) : existing.subject;
  const nts = notes !== undefined ? String(notes).trim() : existing.notes;
  const start = started_at && !isNaN(Date.parse(started_at)) ? new Date(started_at).toISOString() : existing.started_at;

  if (!resolvedSubj) return res.status(400).json({ error: 'Subject is required' });
  if (!Number.isFinite(dur) || dur < 1 || dur > 24 * 60) {
    return res.status(400).json({ error: 'Sessions must be at least 1 minute' });
  }
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });

  db.prepare(`
    UPDATE sessions
    SET subject = ?, category = ?, notes = ?, duration_min = ?, started_at = ?
    WHERE id = ?
  `).run(resolvedSubj, category, nts, dur, start, id);

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  res.json(updated);
});

// Summary: "where is my time going" -> totals by subject, by category, and per day (last N days)
app.get('/api/summary', (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
  const tzMin = Math.max(-840, Math.min(840, Math.round(Number(req.query.tz) || 0)));
  // Start of the oldest local day in range, converted back to UTC
  const localNow = Date.now() + tzMin * 60000;
  const localMidnight = localNow - (localNow % 86400000);
  const since = new Date(localMidnight - (days - 1) * 86400000 - tzMin * 60000).toISOString();

  const bySubject = db
    .prepare(`SELECT subject, ROUND(SUM(duration_min), 1) AS minutes, COUNT(*) AS sessions
              FROM sessions WHERE started_at >= ? GROUP BY subject ORDER BY minutes DESC`)
    .all(since);
  const byCategory = db
    .prepare(`SELECT category, ROUND(SUM(duration_min), 1) AS minutes
              FROM sessions WHERE started_at >= ? GROUP BY category ORDER BY minutes DESC`)
    .all(since);
  // Group days in the viewer's local time: client passes tz = minutes ahead of UTC (e.g. 330 for IST)
  const tz = tzMin;
  const modifier = `${tz >= 0 ? '+' : '-'}${Math.abs(tz)} minutes`;
  const perDayRaw = db
    .prepare(`SELECT substr(datetime(started_at, ?), 1, 10) AS day, ROUND(SUM(duration_min), 1) AS minutes
              FROM sessions WHERE started_at >= ? GROUP BY day ORDER BY day`)
    .all(modifier, since);

  // Fill in zero-days so the chart has no gaps
  const map = new Map(perDayRaw.map((r) => [r.day, r.minutes]));
  const perDay = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() + tz * 60000 - i * 86400000).toISOString().slice(0, 10);
    perDay.push({ day: d, minutes: map.get(d) || 0 });
  }

  const total = bySubject.reduce((s, r) => s + r.minutes, 0);
  const totalSessions = bySubject.reduce((s, r) => s + r.sessions, 0);
  res.json({
    days,
    totalMinutes: Math.round(total * 10) / 10,
    totalSessions,
    avgPerDay: Math.round((total / days) * 10) / 10,
    topSubject: bySubject[0] ? bySubject[0].subject : null,
    bySubject,
    byCategory,
    perDay,
  });
});

// List unique subjects ordered by most recent use
app.get('/api/subjects', (_req, res) => {
  const rows = db.prepare(`
    SELECT subject, ROUND(SUM(duration_min), 1) AS totalMinutes, MAX(started_at) AS lastUsed
    FROM sessions
    GROUP BY subject
    ORDER BY lastUsed DESC
  `).all();
  res.json(rows);
});

app.get('/api/categories', (_req, res) => res.json(CATEGORIES));

// Goals API: list goals with current 7-day progress
app.get('/api/goals', (req, res) => {
  const tzMin = Math.max(-840, Math.min(840, Math.round(Number(req.query.tz) || 0)));
  const localNow = Date.now() + tzMin * 60000;
  const localMidnight = localNow - (localNow % 86400000);
  const weekSince = new Date(localMidnight - 6 * 86400000 - tzMin * 60000).toISOString();

  const goals = db.prepare('SELECT * FROM goals ORDER BY subject ASC').all();
  const logged = db.prepare(`
    SELECT subject, ROUND(SUM(duration_min), 1) as minutes
    FROM sessions
    WHERE started_at >= ?
    GROUP BY subject COLLATE NOCASE
  `).all(weekSince);

  const loggedMap = new Map();
  for (const row of logged) {
    loggedMap.set(row.subject.toLowerCase(), row.minutes);
  }

  const result = goals.map((g) => {
    const mins = loggedMap.get(g.subject.toLowerCase()) || 0;
    const targetMins = Math.round(g.target_hours * 60);
    const pct = targetMins > 0 ? Math.round((mins / targetMins) * 100) : 0;
    return {
      id: g.id,
      subject: g.subject,
      target_hours: g.target_hours,
      logged_minutes: mins,
      target_minutes: targetMins,
      progress_pct: Math.min(pct, 100),
      raw_pct: pct,
      is_completed: mins >= targetMins,
      created_at: g.created_at,
    };
  });
  res.json(result);
});

// Upsert a goal for a subject
app.post('/api/goals', (req, res) => {
  const { subject, target_hours } = req.body || {};
  const resolvedSubj = resolveSubject(db, subject);
  const target = Number(target_hours);
  if (!resolvedSubj) return res.status(400).json({ error: 'Subject is required' });
  if (!Number.isFinite(target) || target < 0.5 || target > 168) {
    return res.status(400).json({ error: 'Target hours must be between 0.5 and 168 hours/week' });
  }

  db.prepare(`
    INSERT INTO goals (subject, target_hours, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(subject) DO UPDATE SET target_hours = excluded.target_hours
  `).run(resolvedSubj, target, new Date().toISOString());

  const goal = db.prepare('SELECT * FROM goals WHERE TRIM(subject) = ? COLLATE NOCASE').get(resolvedSubj);
  res.status(201).json(goal);
});

// Delete a goal
app.delete('/api/goals/:id', (req, res) => {
  const info = db.prepare('DELETE FROM goals WHERE id = ?').run(Number(req.params.id));
  if (info.changes === 0) return res.status(404).json({ error: 'Goal not found' });
  res.json({ ok: true });
});

// Activity & Streak tracking
app.get('/api/activity', (req, res) => {
  const tzMin = Math.max(-840, Math.min(840, Math.round(Number(req.query.tz) || 0)));
  const modifier = `${tzMin >= 0 ? '+' : '-'}${Math.abs(tzMin)} minutes`;

  const rows = db.prepare(`
    SELECT substr(datetime(started_at, ?), 1, 10) AS day, ROUND(SUM(duration_min), 1) AS minutes
    FROM sessions
    GROUP BY day
    ORDER BY day ASC
  `).all(modifier);

  const dayMap = new Map(rows.map((r) => [r.day, r.minutes]));

  const todayStr = new Date(Date.now() + tzMin * 60000).toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() + tzMin * 60000 - 86400000).toISOString().slice(0, 10);

  let currentStreak = 0;
  let checkDate = new Date(Date.now() + tzMin * 60000);
  if (!dayMap.has(todayStr) && dayMap.has(yesterdayStr)) {
    checkDate = new Date(Date.now() + tzMin * 60000 - 86400000);
  }

  while (true) {
    const dStr = checkDate.toISOString().slice(0, 10);
    if ((dayMap.get(dStr) || 0) > 0) {
      currentStreak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      break;
    }
  }

  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const r of rows) {
    if (r.minutes > 0) {
      const curDate = new Date(r.day + 'T00:00:00Z');
      if (prevDate) {
        const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / 86400000);
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      prevDate = curDate;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    }
  }

  // 60-day heatmap grid
  const heatmap = [];
  for (let i = 59; i >= 0; i--) {
    const dStr = new Date(Date.now() + tzMin * 60000 - i * 86400000).toISOString().slice(0, 10);
    const mins = dayMap.get(dStr) || 0;
    let level = 0;
    if (mins > 0 && mins < 30) level = 1;
    else if (mins >= 30 && mins < 60) level = 2;
    else if (mins >= 60 && mins < 120) level = 3;
    else if (mins >= 120) level = 4;
    heatmap.push({ day: dStr, minutes: mins, level });
  }

  res.json({
    currentStreak,
    longestStreak,
    totalActiveDays: rows.length,
    heatmap,
  });
});

// CSV Export
app.get('/api/export/csv', (_req, res) => {
  const rows = db.prepare('SELECT id, subject, category, duration_min, started_at, notes FROM sessions ORDER BY started_at DESC').all();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="studysync_sessions.csv"');

  let csv = 'ID,Subject,Category,Duration (min),Started At,Notes\r\n';
  for (const r of rows) {
    const cleanNotes = (r.notes || '').replace(/"/g, '""');
    csv += `${r.id},"${r.subject}","${r.category}",${r.duration_min},"${r.started_at}","${cleanNotes}"\r\n`;
  }
  res.send(csv);
});

// Authentication Routes
app.post('/api/auth/register', (req, res) => {
  const { username, password, name } = req.body || {};
  const cleanUsername = String(username || '').trim();
  const cleanName = String(name || cleanUsername).trim();
  const rawPassword = String(password || '');

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }
  if (!rawPassword || rawPassword.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ error: 'Username is already taken' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(rawPassword, salt);
  const now = new Date().toISOString();

  const info = db.prepare('INSERT INTO users (username, name, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(cleanUsername, cleanName, hash, salt, now);

  const token = crypto.randomBytes(32).toString('hex');
  const user = { id: Number(info.lastInsertRowid), username: cleanUsername, name: cleanName };
  activeTokens.set(token, user);

  res.status(201).json({ user, token });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUsername = String(username || '').trim();
  const rawPassword = String(password || '');

  if (!cleanUsername || !rawPassword) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT id, username, name, password_hash, salt FROM users WHERE username = ? COLLATE NOCASE').get(cleanUsername);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const expectedHash = hashPassword(rawPassword, user.salt);
  if (expectedHash !== user.password_hash) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const safeUser = { id: user.id, username: user.username, name: user.name };
  activeTokens.set(token, safeUser);

  res.json({ user: safeUser, token });
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.query.token || '');
  if (!token || !activeTokens.has(token)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const user = activeTokens.get(token);
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : (req.query.token || '');
  if (token && activeTokens.has(token)) {
    activeTokens.delete(token);
  }
  res.json({ ok: true });
});

app.get('/login', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Real-time Collaborative StudySync WebSocket Server
function attachWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map(); // ws -> { id, username, room, status, subject, startedAt }

  function broadcastRoom(room) {
    const peers = [];
    for (const info of clients.values()) {
      if (info.room === room) {
        peers.push({
          id: info.id,
          username: info.username,
          status: info.status,
          subject: info.subject,
          startedAt: info.startedAt,
        });
      }
    }
    const msg = JSON.stringify({ type: 'presence', room, peers, count: peers.length });
    for (const [ws, info] of clients.entries()) {
      if (info.room === room && ws.readyState === 1) {
        ws.send(msg);
      }
    }
  }

  wss.on('connection', (ws) => {
    const initialInfo = {
      id: Math.random().toString(36).slice(2, 9),
      username: 'Student ' + Math.floor(100 + Math.random() * 900),
      room: 'Main Study Room',
      status: 'idle',
      subject: '',
      startedAt: null,
    };
    clients.set(ws, initialInfo);

    ws.on('message', (raw) => {
      try {
        const payload = JSON.parse(raw);
        const info = clients.get(ws);
        if (!info) return;

        if (payload.type === 'join') {
          const oldRoom = info.room;
          if (payload.username) info.username = String(payload.username).trim().slice(0, 25);
          if (payload.room) info.room = String(payload.room).trim().slice(0, 30);
          if (oldRoom !== info.room) broadcastRoom(oldRoom);
          broadcastRoom(info.room);
        } else if (payload.type === 'status') {
          info.status = payload.status === 'studying' ? 'studying' : 'idle';
          info.subject = String(payload.subject || '').slice(0, 40);
          info.startedAt = info.status === 'studying' ? (payload.startedAt || new Date().toISOString()) : null;
          broadcastRoom(info.room);
        }
      } catch (_) {}
    });

    ws.on('close', () => {
      const info = clients.get(ws);
      if (info) {
        const room = info.room;
        clients.delete(ws);
        broadcastRoom(room);
      }
    });

    ws.on('error', () => {});

    broadcastRoom(initialInfo.room);
  });

  return wss;
}

let server;
if (require.main === module) {
  server = http.createServer(app);
  attachWebSocket(server);
  server.listen(PORT, () => console.log(`StudySync running at http://localhost:${PORT}`));
}

app.db = db;
app.migrateSubjects = migrateSubjects;
app.resolveSubject = resolveSubject;
app.cleanSubject = cleanSubject;
app.attachWebSocket = attachWebSocket;
module.exports = app;
