// StudySync frontend (vanilla JS, no build step, no external libraries)
const COLORS = ['#5a52e8', '#059669', '#0284c7', '#7c3aed', '#0d9488', '#475569'];
const $ = (id) => document.getElementById(id);
const TZ = -new Date().getTimezoneOffset(); // minutes ahead of UTC
const TIMER_KEY = 'studysync.timerStart';
const GOAL_KEY = 'studysync.weeklyGoal';
const TASK_KEY = 'studysync.dailyTasks';
const THEME_KEY = 'studysync.theme';
const COLOR_THEME_KEY = 'studysync.colorTheme';
let allRows = [];
let calendarDate = new Date();
let currentUser = null;
let registering = false;

let days = 7;
let timerHandle = null;

/* ---------- helpers ---------- */
const fmtMin = (m) => {
  m = Number(m) || 0;
  if (m > 0 && m < 1) return `${Math.max(Math.round(m * 60), 1)} sec`;
  if (m < 60) return `${Math.round(m * 10) / 10} min`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r ? `${h}h ${r}m` : `${h}h`;
};
const pad = (n) => String(n).padStart(2, '0');
const fmtClock = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};
const fmtWhen = (iso) =>
  new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function api(path, opts) {
  const res = await fetch(path, { headers: { 'content-type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || 'Something went wrong');
    error.status = res.status;
    throw error;
  }
  return data;
}
function userStorageKey(key) {
  return `${key}.${currentUser.id}`;
}
function setMsg(text, kind = '') {
  const el = $('msg');
  el.textContent = text;
  el.className = 'msg ' + kind;
  if (kind === 'ok') setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, 3000);
}
function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  children.forEach((c) => node.append(c));
  return node;
}

/* ---------- rendering ---------- */
function renderStats(s) {
  $('statTotal').textContent = fmtMin(s.totalMinutes);
  $('statTotal').dataset.minutes = String(s.totalMinutes);
  $('statSessions').textContent = s.totalSessions;
  $('statAvg').textContent = fmtMin(s.avgPerDay);
  let streak = 0;
  let dayIndex = s.perDay.length - 1;
  if (dayIndex >= 0 && !s.perDay[dayIndex].minutes) dayIndex--;
  for (; dayIndex >= 0 && s.perDay[dayIndex].minutes > 0; dayIndex--) streak++;
  const streakText = `${streak} ${streak === 1 ? 'day' : 'days'}`;
  $('statTop').textContent = streakText;

  // Mirror to Achievements view
  if ($('achTotal')) $('achTotal').textContent = fmtMin(s.totalMinutes);
  if ($('achSessions')) $('achSessions').textContent = String(s.totalSessions);
  if ($('achAvg')) $('achAvg').textContent = fmtMin(s.avgPerDay);
  if ($('achStreak')) $('achStreak').textContent = streakText;
}

function renderGoal(totalMinutes) {
  const target = Number(localStorage.getItem(userStorageKey(GOAL_KEY))) || 600;
  const completed = Math.round(totalMinutes);
  const percent = Math.min(Math.round((completed / target) * 100), 100);
  $('goalProgress').textContent = fmtMin(completed);
  $('goalTargetLabel').textContent = `of ${fmtMin(target)}`;
  $('goalFill').style.width = `${percent}%`;
  $('progressPercent').textContent = `${percent}%`;
  $('progressDonut').style.background = `conic-gradient(var(--brand) ${percent}%, var(--line) ${percent}% 100%)`;
  $('activityHours').textContent = `${(totalMinutes / 60).toFixed(1)}h`;
  const track = document.querySelector('.goal-track');
  if (track) {
    track.setAttribute('aria-valuemax', String(target));
    track.setAttribute('aria-valuenow', String(Math.min(completed, target)));
  }
  const encouragement = completed >= target
    ? 'Goal reached — excellent work this week!'
    : `${fmtMin(Math.max(target - completed, 0))} to go. You’ve got this!`;
  $('goalEncouragement').textContent = encouragement;
  $('goalMinutes').value = String(target);

  // Mirror to Study Goal view panel
  if ($('progressDonutGoal')) $('progressDonutGoal').style.background = `conic-gradient(var(--brand) ${percent}%, var(--line) ${percent}% 100%)`;
  if ($('progressPercentGoal')) $('progressPercentGoal').textContent = `${percent}%`;
  if ($('goalProgressGoal')) $('goalProgressGoal').textContent = fmtMin(completed);
  if ($('goalTargetLabelGoal')) $('goalTargetLabelGoal').textContent = `of ${fmtMin(target)}`;
  if ($('goalFillGoal')) $('goalFillGoal').style.width = `${percent}%`;
  if ($('goalEncouragementGoal')) $('goalEncouragementGoal').textContent = encouragement;
}

function renderBars(s) {
  const box = $('learningCards');
  box.replaceChildren();
  $('emptyBars').hidden = s.bySubject.length > 0;
  const max = Math.max(...s.bySubject.map((r) => r.minutes), 1);
  s.bySubject.slice(0, 3).forEach((r, i) => {
    const pct = s.totalMinutes ? Math.round((r.minutes / s.totalMinutes) * 100) : 0;
    const fill = el('span', { className: 'course-progress-fill' });
    fill.style.width = '0%';
    fill.style.background = COLORS[i % COLORS.length];
    requestAnimationFrame(() => (fill.style.width = `${(r.minutes / max) * 100}%`));
    const icon = el('span', { className: `course-icon course-icon-${i}`, textContent: ['▧', '⌘', '◈'][i] });
    const card = el('article', { className: 'course-card' },
      el('div', { className: 'course-art' }, icon, el('span', { className: 'course-percent', textContent: `${pct}%` })),
      el('div', { className: 'course-info' },
        el('span', { className: 'eyebrow', textContent: `${r.sessions} ${r.sessions === 1 ? 'SESSION' : 'SESSIONS'}` }),
        el('h3', { textContent: r.subject }),
        el('div', { className: 'course-meta', textContent: `${fmtMin(r.minutes)} studied` }),
        el('div', { className: 'course-progress' }, fill)));
    box.append(card);
  });
  const details = $('subjectDetails');
  details.replaceChildren();
  if (s.byCategory.length) {
    details.append(el('span', { className: 'eyebrow', textContent: 'THIS WEEK BY CATEGORY' }));
    s.byCategory.forEach((row, i) => details.append(el('span', { className: 'category-chip' },
      el('i', { style: `background:${['#5a52e8','#059669','#0284c7','#7c3aed','#0d9488'][i % 5]}` }),
      `${row.category} · ${fmtMin(row.minutes)}`)));
  }
}

function renderDays(s) {
  const box = $('dayChart');
  box.replaceChildren();
  const max = Math.max(...s.perDay.map((d) => d.minutes), 1);
  const showEvery = s.perDay.length > 14 ? 3 : 1;
  s.perDay.forEach((d, i) => {
    const bar = el('div', { className: 'daybar' + (d.minutes ? '' : ' zero') });
    bar.style.height = '0px';
    requestAnimationFrame(() => (bar.style.height = d.minutes ? `${Math.max((d.minutes / max) * 140, 4)}px` : '2px'));
    const label = new Date(d.day + 'T00:00:00').toLocaleDateString([], s.perDay.length > 7 ? { day: 'numeric', month: 'short' } : { weekday: 'short' });
    bar.title = `${d.day}: ${fmtMin(d.minutes)}`;
    box.append(
      el('div', { className: 'daycol' },
        el('div', { className: 'dayval', textContent: d.minutes && s.perDay.length <= 14 ? fmtMin(d.minutes) : '' }),
        bar,
        el('div', { className: 'daylbl', textContent: i % showEvery === 0 ? label : '' }))
    );
  });
}

function renderRows(rows) {
  const tbody = $('rows');
  tbody.replaceChildren();
  $('emptyRows').hidden = rows.length > 0;
  $('emptyRows').textContent = $('sessionSearch').value.trim() ? 'No sessions match your search.' : 'Nothing logged yet.';
  rows.slice(0, 15).forEach((r) => {
    const del = el('button', { className: 'del', title: 'Delete session', textContent: '✕' });
    del.setAttribute('aria-label', `Delete ${r.subject} session`);
    del.onclick = async () => {
      if (!confirm('Delete this session?')) return;
      await api(`/api/sessions/${r.id}`, { method: 'DELETE' });
      refresh();
    };
    tbody.append(
      el('tr', {},
        el('td', { textContent: fmtWhen(r.started_at) }),
        el('td', { textContent: r.subject }),
        el('td', {}, el('span', { className: 'tag', textContent: r.category })),
        el('td', { className: 'num', textContent: fmtMin(r.duration_min) }),
        el('td', { className: 'notes', textContent: r.notes || '' }),
        el('td', {}, del))
    );
  });
}

/* ---------- annual consistency heatmap (GitHub/LeetCode style) ---------- */
function renderHeatmap(rows) {
  const grid = $('heatmapGrid');
  const monthsWrap = $('heatmapMonths');
  const tooltip = $('heatmapTooltip');
  if (!grid || !monthsWrap) return;

  grid.replaceChildren();
  monthsWrap.replaceChildren();

  // Aggregate minutes and session count by YYYY-MM-DD
  const dataMap = {};
  (rows || []).forEach((r) => {
    if (!r.started_at) return;
    const d = r.started_at.slice(0, 10);
    if (!dataMap[d]) dataMap[d] = { minutes: 0, sessions: 0 };
    dataMap[d].minutes += Number(r.duration_min) || 0;
    dataMap[d].sessions += 1;
  });

  const today = new Date();
  const todayDay = today.getDay(); // 0 is Sunday, 6 is Saturday
  // End on Saturday of the current week so full column renders
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - todayDay));
  const totalWeeks = 53;
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (totalWeeks * 7 - 1));

  let totalMinutesYear = 0;
  let activeDaysYear = 0;
  let currentStreak = 0;

  // Compute streak ending today
  for (let b = 0; b < 365; b++) {
    const cur = new Date(today);
    cur.setDate(today.getDate() - b);
    const k = cur.toLocaleDateString('en-CA');
    const hasActivity = dataMap[k] && dataMap[k].minutes > 0;
    if (b === 0 && !hasActivity) continue; // Allow streak from yesterday if today has not been logged yet
    if (hasActivity) currentStreak++;
    else break;
  }

  const monthPositions = {};
  let curDate = new Date(startDate);

  for (let w = 0; w < totalWeeks; w++) {
    for (let d = 0; d < 7; d++) {
      const dateStr = curDate.toLocaleDateString('en-CA');
      const isFuture = curDate > today;
      const monthName = curDate.toLocaleDateString([], { month: 'short' });

      // Track first week of each month
      if (curDate.getDate() <= 7 && monthPositions[monthName] === undefined) {
        monthPositions[monthName] = w;
      }

      const info = dataMap[dateStr] || { minutes: 0, sessions: 0 };
      if (!isFuture && info.minutes > 0) {
        totalMinutesYear += info.minutes;
        activeDaysYear++;
      }

      // Determine level (0 to 4)
      let lvl = 0;
      if (!isFuture && info.minutes > 0) {
        if (info.minutes < 30) lvl = 1;
        else if (info.minutes < 60) lvl = 2;
        else if (info.minutes < 120) lvl = 3;
        else lvl = 4;
      }

      const cell = el('div', {
        className: `heatmap-cell lvl-${lvl}${isFuture ? ' future' : ''}`,
      });
      cell.dataset.date = dateStr;
      cell.dataset.minutes = String(Math.round(info.minutes * 10) / 10);
      cell.dataset.sessions = String(info.sessions);

      const cellDate = new Date(curDate);
      cell.onmouseenter = () => {
        if (!tooltip) return;
        const formattedDate = cellDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        const text = isFuture
          ? `${formattedDate} (upcoming)`
          : info.minutes > 0
            ? `${fmtMin(info.minutes)} studied · ${info.sessions} ${info.sessions === 1 ? 'session' : 'sessions'}`
            : 'No study activity logged';
        tooltip.innerHTML = `<strong>${formattedDate}</strong><br>${text}`;
        tooltip.hidden = false;
        const rect = cell.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 6}px`;
      };
      cell.onmouseleave = () => {
        if (tooltip) tooltip.hidden = true;
      };

      grid.append(cell);
      curDate.setDate(curDate.getDate() + 1);
    }
  }

  // Render Month Labels along top
  Object.keys(monthPositions).forEach((mName) => {
    const col = monthPositions[mName];
    const leftPx = col * 15; // 12px width + 3px gap
    const lbl = el('span', { className: 'heatmap-month-label', textContent: mName });
    lbl.style.left = `${leftPx}px`;
    monthsWrap.append(lbl);
  });

  // Update summary stats
  if ($('heatmapTotalHours')) $('heatmapTotalHours').textContent = `${(totalMinutesYear / 60).toFixed(1)}h`;
  if ($('heatmapActiveDays')) $('heatmapActiveDays').textContent = String(activeDaysYear);
  if ($('heatmapStreak')) $('heatmapStreak').textContent = String(currentStreak);
}

/* ---------- data ---------- */
async function refresh() {
  try {
    const [summary, weeklySummary, rows] = await Promise.all([
      api(`/api/summary?days=${days}&tz=${TZ}`),
      api(`/api/summary?days=7&tz=${TZ}`),
      api('/api/sessions?limit=50'),
    ]);
    renderStats(summary);
    renderGoal(weeklySummary.totalMinutes);
    renderBars(summary);
    renderDays(summary);
    allRows = rows;
    renderRows(filterRows());
    renderHeatmap(rows);
    // subject suggestions from history
    const subs = [...new Set(rows.map((r) => r.subject))];
    $('subjectList').replaceChildren(...subs.map((s) => el('option', { value: s })));
  } catch (e) {
    if (e.status === 401) {
      currentUser = null;
      $('authView').hidden = false;
      document.querySelector('.app-layout').hidden = true;
      $('authMessage').textContent = 'Your session expired. Please sign in again.';
      if (window.StudySyncSprout) window.StudySyncSprout.start();
      return;
    }
    setMsg('Could not load data. Is the server running?', 'err');
  }
}

function filterRows() {
  const query = $('sessionSearch').value.trim().toLowerCase();
  if (!query) return allRows;
  return allRows.filter((row) => [row.subject, row.category, row.notes].some((value) => String(value || '').toLowerCase().includes(query)));
}

async function saveSession(durationMin, startedAt) {
  const subject = $('subject').value.trim();
  if (!subject) {
    setMsg('Please enter a subject first.', 'err');
    $('subject').focus();
    return false;
  }
  try {
    await api('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        subject,
        category: $('category').value,
        notes: $('notes').value,
        started_at: startedAt,
        duration_min: durationMin,
      }),
    });
    setMsg(`Saved ${fmtMin(durationMin)} of ${subject}.`, 'ok');
    $('minutes').value = '';
    $('notes').value = '';
    await refresh();
    return true;
  } catch (e) {
    setMsg(e.message, 'err');
    return false;
  }
}

/* ---------- timer (survives page refresh) ---------- */
function tick() {
  const start = Number(localStorage.getItem(userStorageKey(TIMER_KEY)));
  if (!start) return;
  $('clock').textContent = fmtClock(Date.now() - start);
}
function setTimerUI(running) {
  $('startBtn').hidden = running;
  $('stopBtn').hidden = !running;
  $('discardBtn').hidden = !running;
  $('clock').classList.toggle('running', running);
  clearInterval(timerHandle);
  if (running) { tick(); timerHandle = setInterval(tick, 500); } else $('clock').textContent = '00:00:00';
}
$('startBtn').onclick = () => {
  localStorage.setItem(userStorageKey(TIMER_KEY), String(Date.now()));
  setMsg('');
  setTimerUI(true);
};
$('stopBtn').onclick = async () => {
  const start = Number(localStorage.getItem(userStorageKey(TIMER_KEY)));
  if (!start) return;
  const minutes = Math.max(Math.round(((Date.now() - start) / 60000) * 10) / 10, 0.1);
  const ok = await saveSession(minutes, new Date(start).toISOString());
  if (ok) { localStorage.removeItem(userStorageKey(TIMER_KEY)); setTimerUI(false); } // keep running if save failed (e.g. no subject)
};
$('discardBtn').onclick = () => {
  if (!confirm('Discard this running timer?')) return;
  localStorage.removeItem(userStorageKey(TIMER_KEY));
  setTimerUI(false);
};

/* ---------- manual form ---------- */
$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const mins = Number($('minutes').value);
  if (!mins || mins <= 0) {
    setMsg('Enter the minutes studied, or use the timer above.', 'err');
    $('minutes').focus();
    return;
  }
  // Manual entry is assumed to have just finished
  await saveSession(mins, new Date(Date.now() - mins * 60000).toISOString());
});

/* ---------- range buttons ---------- */
document.querySelectorAll('.range button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.range button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    days = Number(b.dataset.days);
    refresh();
  };
});

/* ---------- view switching ---------- */
function switchView(viewId) {
  document.querySelectorAll('.view-panel').forEach((p) => { p.hidden = true; });
  const panel = document.getElementById('view-' + viewId);
  if (panel) panel.hidden = false;
  document.querySelectorAll('.side-nav .nav-link').forEach((a) => {
    a.classList.toggle('active', a.dataset.view === viewId);
  });
  localStorage.setItem('studysync.view', viewId);
}

document.querySelectorAll('.side-nav .nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    switchView(link.dataset.view);
  });
});

// Handle any in-page [data-view] links (e.g. "View sessions →")
document.querySelectorAll('[data-view]').forEach((el) => {
  if (el.tagName === 'A' && !el.closest('.side-nav')) {
    el.addEventListener('click', (e) => { e.preventDefault(); switchView(el.dataset.view); });
  }
});

/* ---------- sidebar and study goal ---------- */
$('sessionSearch').addEventListener('input', () => renderRows(filterRows()));
$('editGoalBtn').onclick = () => {
  $('goalForm').hidden = !$('goalForm').hidden;
  if (!$('goalForm').hidden) $('goalMinutes').focus();
};
$('goalForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const target = Number($('goalMinutes').value);
  if (!Number.isFinite(target) || target < 30 || target > 10080) return;
  localStorage.setItem(userStorageKey(GOAL_KEY), String(target));
  renderGoal(Number($('statTotal').dataset.minutes || 0));
  $('goalForm').hidden = true;
});

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  $('calendarMonth').textContent = calendarDate.toLocaleDateString([], { month: 'long', year: 'numeric' });
  const grid = $('calendarGrid');
  grid.replaceChildren(...['S','M','T','W','T','F','S'].map((day) => el('span', { className: 'calendar-weekday', textContent: day })));
  const offset = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < offset; i++) grid.append(el('span', { className: 'calendar-day blank' }));
  for (let day = 1; day <= count; day++) {
    const isToday = year === new Date().getFullYear() && month === new Date().getMonth() && day === new Date().getDate();
    grid.append(el('span', { className: `calendar-day${isToday ? ' today' : ''}`, textContent: String(day) }));
  }
}
function getTasks() {
  const key = `${userStorageKey(TASK_KEY)}.${new Date().toLocaleDateString('en-CA')}`;
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveTasks(tasks) {
  const key = `${userStorageKey(TASK_KEY)}.${new Date().toLocaleDateString('en-CA')}`;
  localStorage.setItem(key, JSON.stringify(tasks));
}
function renderTasks() {
  const tasks = getTasks();
  const countStr = `${tasks.filter((task) => task.done).length}/${tasks.length}`;
  if ($('planCount')) $('planCount').textContent = countStr;
  if ($('planCountFull')) $('planCountFull').textContent = countStr;

  const lists = [$('taskList'), $('taskListFull')].filter(Boolean);
  lists.forEach((list) => {
    list.replaceChildren();
    if (!tasks.length) {
      list.append(el('p', { className: 'task-empty', textContent: 'Add a small goal for today.' }));
      return;
    }
    tasks.forEach((task, index) => {
      const checkbox = el('input', { type: 'checkbox', checked: task.done, 'aria-label': `Complete ${task.text}` });
      checkbox.onchange = () => {
        const updated = getTasks();
        updated[index].done = checkbox.checked;
        saveTasks(updated);
        renderTasks();
      };
      const remove = el('button', { type: 'button', className: 'task-remove', textContent: '×', 'aria-label': `Remove ${task.text}` });
      remove.onclick = () => {
        const updated = getTasks();
        updated.splice(index, 1);
        saveTasks(updated);
        renderTasks();
      };
      list.append(el('div', { className: `task-row${task.done ? ' done' : ''}` }, checkbox, el('span', { textContent: task.text }), remove));
    });
  });
}
$('taskForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('taskInput').value.trim();
  if (!text) return;
  const tasks = getTasks(); tasks.push({ text, done: false }); saveTasks(tasks);
  $('taskInput').value = ''; renderTasks();
});
if ($('taskFormFull')) {
  $('taskFormFull').addEventListener('submit', (event) => {
    event.preventDefault();
    const text = $('taskInputFull').value.trim();
    if (!text) return;
    const tasks = getTasks(); tasks.push({ text, done: false }); saveTasks(tasks);
    $('taskInputFull').value = ''; renderTasks();
  });
}
if ($('editGoalBtnGoal')) {
  $('editGoalBtnGoal').onclick = () => {
    switchView('overview');
    $('goalForm').hidden = false;
    $('goalMinutes').focus();
  };
}
$('prevMonth').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); };
$('nextMonth').onclick = () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); };
$('dashboardSearch').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  $('sessionSearch').value = $('dashboardSearch').value;
  renderRows(filterRows());
  $('history').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('themeToggle').textContent = theme === 'dark' ? '☀' : '☾';
  $('themeToggle').setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}
$('themeToggle').onclick = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, next); setTheme(next);
};

/* ---------- professional cool color themes ---------- */
function setColorTheme(color) {
  const valid = ['indigo', 'emerald', 'ocean', 'violet', 'arctic'];
  const theme = valid.includes(color) ? color : 'indigo';
  document.documentElement.dataset.colorTheme = theme;
  document.querySelectorAll('.palette-swatch').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.colorTheme === theme);
  });
  localStorage.setItem(COLOR_THEME_KEY, theme);
  if (currentUser) {
    const summaryTotal = Number($('statTotal').dataset.minutes || 0);
    renderGoal(summaryTotal);
  }
}

document.querySelectorAll('.palette-swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    setColorTheme(btn.dataset.colorTheme);
  });
});

function setAuthMode(isRegistering) {
  registering = isRegistering;
  $('loginTab').classList.toggle('active', !registering);
  $('registerTab').classList.toggle('active', registering);
  $('loginTab').setAttribute('aria-selected', String(!registering));
  $('registerTab').setAttribute('aria-selected', String(registering));
  $('authTitle').textContent = registering ? 'Create your StudySync account' : 'Login to StudySync';
  $('authSubmit').textContent = registering ? 'Create Account' : 'Login';
  $('authSwitchText').textContent = registering ? 'Already have an account?' : "Don't have an account?";
  $('authSwitch').textContent = registering ? 'Login' : 'Register';
  $('confirmPasswordField').hidden = !registering;
  $('confirmPassword').required = registering;
  $('authPassword').autocomplete = registering ? 'new-password' : 'current-password';
  $('authMessage').textContent = '';
}

function enterApp(user) {
  currentUser = user;
  if (window.StudySyncSprout) window.StudySyncSprout.stop();
  $('authView').hidden = true;
  document.querySelector('.app-layout').hidden = false;
  $('profileEmail').textContent = user.email;
  document.querySelector('.avatar-button').textContent = user.email.slice(0, 1).toUpperCase();
  const savedView = localStorage.getItem('studysync.view') || 'overview';
  switchView(savedView);
  renderCalendar();
  renderTasks();
  setTimerUI(!!localStorage.getItem(userStorageKey(TIMER_KEY)));
  refresh();
}

$('loginTab').onclick = () => setAuthMode(false);
$('registerTab').onclick = () => setAuthMode(true);
$('authSwitch').onclick = () => setAuthMode(!registering);
$('passwordVisibility').onclick = () => {
  const password = $('authPassword');
  const visible = password.type === 'password';
  password.type = visible ? 'text' : 'password';
  $('passwordVisibility').setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
};
$('authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;
  const message = $('authMessage');
  if (registering && password !== $('confirmPassword').value) {
    message.textContent = 'Passwords do not match.';
    return;
  }
  $('authSubmit').disabled = true;
  message.textContent = registering ? 'Creating your account…' : 'Signing in…';
  try {
    const user = await api(registering ? '/api/auth/register' : '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    $('authForm').reset();
    setAuthMode(false);
    enterApp(user);
  } catch (error) {
    message.textContent = error.message;
  } finally {
    $('authSubmit').disabled = false;
  }
});
$('logoutBtn').onclick = async () => {
  let logoutError = '';
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    logoutError = error.message;
  }
  currentUser = null;
  setTimerUI(false);
  $('authView').hidden = false;
  document.querySelector('.app-layout').hidden = true;
  $('authForm').reset();
  setAuthMode(false);
  $('authMessage').textContent = logoutError;
  if (window.StudySyncSprout) window.StudySyncSprout.start();
};

/* ---------- init ---------- */
(async function init() {
  const today = new Date();
  $('welcomeTitle').innerHTML = `${today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening'}! <span>Ready to learn?</span>`;
  document.querySelector('.page-heading .eyebrow').textContent = `${today.toLocaleDateString([], { weekday: 'long' }).toUpperCase()} · YOUR LEARNING SPACE`;
  setTheme(localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  setColorTheme(localStorage.getItem(COLOR_THEME_KEY) || 'indigo');
  setAuthMode(false);
  try {
    const cats = await api('/api/categories');
    $('category').replaceChildren(...cats.map((c) => el('option', { value: c, textContent: c })));
  } catch (error) {
    $('authMessage').textContent = 'Could not connect to StudySync. Please check that the server is running.';
    return;
  }
  try {
    enterApp(await api('/api/auth/me'));
  } catch (error) {
    $('authView').hidden = false;
    document.querySelector('.app-layout').hidden = true;
    if (error.status !== 401) {
      $('authMessage').textContent = 'Could not connect to StudySync. Please check that the server is running.';
    }
  }
})();
