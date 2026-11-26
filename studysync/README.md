# StudySync – Where is my time going?

A full-stack, real-time productivity and study intelligence web application that tracks study habits, measures progress against weekly targets, synchronizes group study sessions, and provides deep visual analytics.

---

## Complete Features

### 1. Timers & Focus Modes
- **Stopwatch Mode**: Start/stop live timer that persists across page reloads and refreshes via `localStorage`.
- **Pomodoro Mode**: 25-minute Focus intervals, 5-minute Short Breaks, and 15-minute Long Breaks with round tracking (1–4 🍅).
- **Audio Synthesizer (Web Audio API)**:
  - Completion chime on session/pomodoro end.
  - Built-in ambient noise generator with volume slider: 🌧️ Gentle Rain, ☕ Warm Cafe Pink noise, and ⚡ 40Hz Gamma Focus tone (zero external audio file dependencies).
- **Manual Logging**: Quick logging with subject suggestions, category selection, and notes.

### 2. Goals & Streaks
- **Weekly Subject Targets**: Set weekly hour targets per subject (e.g. 5 hrs/week for DBMS).
- **Dynamic Progress Bars**: Visual completion percentages, logged vs. target minutes, and completed badges.
- **Study Consistency Streaks**: Real-time current streak and all-time best streak tracking.
- **60-Day Activity Heatmap**: GitHub-style activity grid shaded by study intensity.

### 3. Analytics & Exporting
- **Summary Dashboard**: Total study time, session count, daily average, and top subject.
- **Visual Charts**: CSS/DOM-powered horizontal subject bars, conic-gradient category donut, and day-by-day column chart.
- **Live Search & Filter**: Instant search across subjects/notes and filter by category.
- **1-Click CSV Export**: Download complete study history as a structured `.csv` file.
- **Printable Report**: Print-optimized layout (`@media print`) for clean PDF study reports.

### 4. Real-Time Collaborative "Sync"
- **Live Study Rooms**: WebSocket-powered live study presence on `/ws`.
- Shows real-time count of active peers, room selection, and live study statuses (e.g., "Alex is studying DBMS").

### 5. PWA & DevOps Ready
- **PWA Ready**: Offline caching via Service Worker (`sw.js`) and installable app via `manifest.json`.
- **Docker**: Production-ready `Dockerfile` and `docker-compose.yml`.
- **Automated Tests**: 14 comprehensive API tests using Node's built-in test runner.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Vanilla JavaScript, HTML5, CSS3 (No heavy frontend build step, native Web Audio API) |
| Backend | Node.js + Express 5 REST API + WebSocket Server (`ws`) |
| Database | SQLite via Node's native `node:sqlite` |
| PWA | Web App Manifest & Service Worker Cache |
| Container | Docker & Docker Compose |
| Testing | Node.js built-in test runner (14 tests) |

---

## Getting Started

Requires **Node.js 22.5 or newer** (`node -v` to check).

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Seed realistic sample sessions and goals
npm run seed

# 3. Run automated tests
npm test

# 4. Start the server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Reference

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/sessions` | Create a session `{subject, category, notes, started_at, duration_min}` |
| `GET` | `/api/sessions?limit=` | List recent sessions (newest first) |
| `PUT` | `/api/sessions/:id` | Update an existing session |
| `DELETE` | `/api/sessions/:id` | Delete a session |
| `GET` | `/api/summary?days=7&tz=330` | Summary metrics & chart totals |
| `GET` | `/api/subjects` | List subjects ordered by most recent use |
| `GET` | `/api/categories` | List allowed study categories |
| `GET` | `/api/goals?tz=330` | List weekly goals with progress and logged minutes |
| `POST` | `/api/goals` | Create or update a weekly subject goal `{subject, target_hours}` |
| `DELETE` | `/api/goals/:id` | Delete a goal |
| `GET` | `/api/activity?tz=330` | Current streak, longest streak, and 60-day heatmap data |
| `GET` | `/api/export/csv` | Download sessions as CSV file |
| `WS` | `/ws` | Real-time WebSocket connection for live study rooms |

---

## Running with Docker

```bash
docker compose up -d
```
The application will be running at `http://localhost:3000` with persistent database storage in `studysync.db`.
