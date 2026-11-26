// StudySync frontend (vanilla JS, no build step, pure Web APIs)
const COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];
const $ = (id) => document.getElementById(id);
const TZ = -new Date().getTimezoneOffset(); // minutes ahead of UTC
const TIMER_KEY = 'studysync.timerStart';
const LAST_SUBJECT_KEY = 'studysync.lastSubject';
const LAST_CATEGORY_KEY = 'studysync.lastCategory';
const PEER_NAME_KEY = 'studysync.peerName';
const THEME_KEY = 'studysync.theme';
const ORIGINAL_TITLE = document.title;
const API_BASE = (window.location.protocol === 'file:' || (window.location.port !== '3000' && window.location.port !== ''))
  ? 'http://localhost:3000'
  : '';

let days = 7;
let timerHandle = null;
let allSessions = [];
let ws = null;
let audioCtx = null;
let activeAmbientNode = null;
let ambientGainNode = null;

/* ---------- Pomodoro State ---------- */
let pomoState = {
  running: false,
  phase: 'Focus',
  totalSec: 25 * 60,
  remainSec: 25 * 60,
  round: 1,
  timerId: null,
};

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
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: { 'content-type': 'application/json' }, ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  } catch (err) {
    if (err.name === 'TypeError' || String(err.message).toLowerCase().includes('fetch')) {
      throw new Error('Server not reachable. Make sure "npm start" is running and open http://localhost:3000');
    }
    throw err;
  }
}

function setMsg(text, kind = '') {
  const elMsg = $('msg');
  elMsg.textContent = text;
  elMsg.className = 'msg ' + kind;
  if (kind === 'ok') setTimeout(() => { if (elMsg.textContent === text) elMsg.textContent = ''; }, 3000);
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  children.forEach((c) => {
    if (typeof c === 'string' || typeof c === 'number') {
      node.appendChild(document.createTextNode(String(c)));
    } else if (c instanceof Node) {
      node.appendChild(c);
    }
  });
  return node;
}

/* ---------- Web Audio Ambient & Chimes ---------- */
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playChime() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, now); // D5
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(0.4, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.2);
}

function stopAmbient() {
  if (activeAmbientNode) {
    try {
      if (activeAmbientNode.stop) activeAmbientNode.stop();
      if (activeAmbientNode.disconnect) activeAmbientNode.disconnect();
    } catch (_) {}
    activeAmbientNode = null;
  }
}

function startAmbient(type) {
  stopAmbient();
  if (type === 'off') return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (!ambientGainNode) {
    ambientGainNode = ctx.createGain();
    ambientGainNode.connect(ctx.destination);
  }
  const vol = Number($('soundVolume').value) || 0.3;
  ambientGainNode.gain.setValueAtTime(vol, ctx.currentTime);

  if (type === 'rain' || type === 'cafe') {
    // Generate pink/brown filtered noise
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * (type === 'rain' ? 0.08 : 0.05);
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = type === 'rain' ? 'lowpass' : 'bandpass';
    filter.frequency.value = type === 'rain' ? 800 : 500;

    whiteNoise.connect(filter);
    filter.connect(ambientGainNode);
    whiteNoise.start();
    activeAmbientNode = whiteNoise;
  } else if (type === 'binaural') {
    // 40Hz Gamma Focus frequency pair (200Hz and 240Hz)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.frequency.value = 200;
    osc2.frequency.value = 240;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.15;
    osc1.connect(subGain);
    osc2.connect(subGain);
    subGain.connect(ambientGainNode);
    osc1.start();
    osc2.start();
    activeAmbientNode = {
      stop: () => { osc1.stop(); osc2.stop(); },
      disconnect: () => { subGain.disconnect(); }
    };
  }
}

$('ambientSelect').addEventListener('change', (e) => {
  startAmbient(e.target.value);
});
$('soundVolume').addEventListener('input', (e) => {
  if (ambientGainNode && audioCtx) {
    ambientGainNode.gain.setValueAtTime(Number(e.target.value), audioCtx.currentTime);
  }
});

/* ---------- Timer Mode Switcher (Stopwatch / Pomodoro) ---------- */
$('modeStopwatch').onclick = () => {
  $('modeStopwatch').classList.add('active');
  $('modePomodoro').classList.remove('active');
  $('stopwatchView').hidden = false;
  $('pomodoroView').hidden = true;
};
$('modePomodoro').onclick = () => {
  $('modePomodoro').classList.add('active');
  $('modeStopwatch').classList.remove('active');
  $('pomodoroView').hidden = false;
  $('stopwatchView').hidden = true;
};

/* ---------- Pomodoro Logic ---------- */
function setPomodoroPhase(minutes, label) {
  pomoState.phase = label;
  pomoState.totalSec = minutes * 60;
  pomoState.remainSec = minutes * 60;
  pomoState.running = false;
  clearInterval(pomoState.timerId);
  pomoState.timerId = null;

  $('pomoPhase').textContent = `${label} Session`;
  $('pomoClock').textContent = `${pad(minutes)}:00`;
  $('pomoStartBtn').hidden = false;
  $('pomoPauseBtn').hidden = true;
  $('pomoResetBtn').hidden = true;
  $('pomoClock').classList.remove('running');
}

document.querySelectorAll('.pomo-btn').forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll('.pomo-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    setPomodoroPhase(Number(btn.dataset.pomo), btn.dataset.label);
  };
});

function pomoTick() {
  if (pomoState.remainSec > 0) {
    pomoState.remainSec--;
    const m = Math.floor(pomoState.remainSec / 60);
    const s = pomoState.remainSec % 60;
    const str = `${pad(m)}:${pad(s)}`;
    $('pomoClock').textContent = str;
    document.title = `🍅 ${str} - ${pomoState.phase}`;
  } else {
    // Pomodoro phase finished
    clearInterval(pomoState.timerId);
    pomoState.running = false;
    pomoState.timerId = null;
    playChime();
    document.title = ORIGINAL_TITLE;

    if (pomoState.phase === 'Focus') {
      const focusMins = Math.round(pomoState.totalSec / 60);
      setMsg(`🎉 Focus session complete! Logged ${focusMins} min.`, 'ok');
      saveSession(focusMins, new Date(Date.now() - focusMins * 60000).toISOString());
      pomoState.round = (pomoState.round % 4) + 1;
      $('pomoRound').textContent = `Round ${pomoState.round} of 4 🍅`;
      // Auto-switch to break
      const breakBtn = document.querySelector('[data-pomo="5"]');
      if (breakBtn) breakBtn.click();
    } else {
      setMsg(`Break finished! Ready for next focus round.`, 'ok');
      const focusBtn = document.querySelector('[data-pomo="25"]');
      if (focusBtn) focusBtn.click();
    }
    updateLiveStatus('idle');
  }
}

$('pomoStartBtn').onclick = () => {
  getAudioContext();
  pomoState.running = true;
  $('pomoStartBtn').hidden = true;
  $('pomoPauseBtn').hidden = false;
  $('pomoResetBtn').hidden = false;
  $('pomoClock').classList.add('running');
  pomoState.timerId = setInterval(pomoTick, 1000);
  updateLiveStatus('studying', $('subject').value || pomoState.phase);
};

$('pomoPauseBtn').onclick = () => {
  pomoState.running = false;
  clearInterval(pomoState.timerId);
  pomoState.timerId = null;
  $('pomoStartBtn').hidden = false;
  $('pomoPauseBtn').hidden = true;
  $('pomoClock').classList.remove('running');
  updateLiveStatus('idle');
};

$('pomoResetBtn').onclick = () => {
  const activeBtn = document.querySelector('.pomo-btn.active');
  if (activeBtn) {
    setPomodoroPhase(Number(activeBtn.dataset.pomo), activeBtn.dataset.label);
  }
  updateLiveStatus('idle');
};

/* ---------- rendering ---------- */
function renderStats(s, activity) {
  $('statTotal').textContent = fmtMin(s.totalMinutes);
  $('statSessions').textContent = s.totalSessions;
  $('statAvg').textContent = fmtMin(s.avgPerDay);
  $('statTop').textContent = s.topSubject || '–';
  if (activity) {
    $('statStreak').textContent = `${activity.currentStreak} ${activity.currentStreak === 1 ? 'day' : 'days'}`;
    $('statBestStreak').textContent = `${activity.longestStreak} ${activity.longestStreak === 1 ? 'day' : 'days'}`;
  }
}

function renderBars(s) {
  const box = $('subjectBars');
  box.replaceChildren();
  $('emptyBars').hidden = s.bySubject.length > 0;
  const max = Math.max(...s.bySubject.map((r) => r.minutes), 1);
  s.bySubject.slice(0, 8).forEach((r, i) => {
    const pct = s.totalMinutes ? Math.round((r.minutes / s.totalMinutes) * 100) : 0;
    const fill = el('div', { className: 'bar-fill' });
    fill.style.background = COLORS[i % COLORS.length];
    fill.style.width = '0%';
    requestAnimationFrame(() => (fill.style.width = `${(r.minutes / max) * 100}%`));
    box.append(
      el('div', { className: 'bar-row' },
        el('div', { className: 'meta' }, el('span', { textContent: r.subject }), el('span', { textContent: `${fmtMin(r.minutes)} · ${pct}%` })),
        el('div', { className: 'bar-track' }, fill))
    );
  });
}

function renderDonut(s) {
  const total = s.byCategory.reduce((a, r) => a + r.minutes, 0);
  const legend = $('legend');
  legend.replaceChildren();
  if (!total) {
    $('donut').style.background = 'var(--line)';
    legend.append(el('li', { textContent: 'No data yet' }));
    return;
  }
  const palette = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
  let acc = 0;
  const stops = s.byCategory.map((r, i) => {
    const start = acc;
    acc += (r.minutes / total) * 100;
    return `${palette[i % palette.length]} ${start}% ${acc}%`;
  });
  $('donut').style.background = `conic-gradient(${stops.join(', ')})`;
  s.byCategory.forEach((r, i) => {
    const sw = el('i');
    sw.style.background = palette[i % palette.length];
    legend.append(el('li', {}, sw, r.category, el('span', { className: 'v', textContent: `${Math.round((r.minutes / total) * 100)}%` })));
  });
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

function renderHeatmap(activity) {
  const grid = $('heatmapGrid');
  grid.replaceChildren();
  if (!activity || !activity.heatmap) return;

  activity.heatmap.forEach((item) => {
    const box = el('div', {
      className: `hm-day hm-${item.level}`,
      title: `${item.day}: ${fmtMin(item.minutes)} studied`,
    });
    grid.append(box);
  });
}

function renderGoals(goals) {
  const list = $('goalsList');
  list.replaceChildren();
  $('emptyGoals').hidden = goals.length > 0;

  goals.forEach((g) => {
    const delBtn = el('button', { textContent: '✕', title: 'Delete goal' });
    delBtn.onclick = async () => {
      if (!confirm(`Delete goal for ${g.subject}?`)) return;
      await api(`/api/goals/${g.id}`, { method: 'DELETE' });
      refresh();
    };

    const statusBadge = el('span', {
      className: `badge ${g.is_completed ? 'done' : 'pending'}`,
      textContent: g.is_completed ? '✓ Completed' : `${g.raw_pct}%`,
    });

    const fill = el('div', { className: `goal-fill ${g.is_completed ? 'completed' : ''}` });
    fill.style.width = '0%';
    requestAnimationFrame(() => (fill.style.width = `${Math.min(g.progress_pct, 100)}%`));

    const item = el('div', { className: 'goal-item' },
      el('div', { className: 'goal-top' },
        el('div', {}, el('strong', { textContent: g.subject }), ' ', statusBadge),
        el('div', { className: 'goal-actions' },
          el('span', { className: 'goal-meta', textContent: `${fmtMin(g.logged_minutes)} / ${g.target_hours}h` }),
          delBtn
        )
      ),
      el('div', { className: 'goal-track' }, fill)
    );
    list.append(item);
  });
}

function filterAndRenderRows() {
  const query = ($('searchSessions').value || '').toLowerCase().trim();
  const selectedCat = $('filterCategory').value;

  const filtered = allSessions.filter((r) => {
    const matchesCat = !selectedCat || r.category === selectedCat;
    const matchesQuery = !query ||
      r.subject.toLowerCase().includes(query) ||
      (r.notes && r.notes.toLowerCase().includes(query));
    return matchesCat && matchesQuery;
  });

  renderRows(filtered);
}

function renderRows(rows) {
  const tbody = $('rows');
  tbody.replaceChildren();
  $('emptyRows').hidden = rows.length > 0;
  rows.slice(0, 25).forEach((r) => {
    const editBtn = el('button', { className: 'edit', title: 'Edit session', textContent: '✎' });
    editBtn.setAttribute('aria-label', `Edit ${r.subject} session`);
    editBtn.onclick = () => openEditModal(r);

    const delBtn = el('button', { className: 'del', title: 'Delete session', textContent: '✕' });
    delBtn.setAttribute('aria-label', `Delete ${r.subject} session`);
    delBtn.onclick = async () => {
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
        el('td', { className: 'actions' }, editBtn, delBtn))
    );
  });
}

function openEditModal(session) {
  $('editId').value = session.id;
  $('editSubject').value = session.subject;
  $('editCategory').value = session.category;
  $('editMinutes').value = session.duration_min;
  $('editNotes').value = session.notes || '';
  $('editMsg').textContent = '';
  $('editMsg').className = 'msg';
  $('editDialog').showModal();
}

function renderChips(subjects) {
  const container = $('subjectChips');
  if (!container) return;
  container.replaceChildren();
  (subjects || []).slice(0, 5).forEach((item) => {
    const btn = el('button', {
      type: 'button',
      className: 'chip',
      textContent: item.subject,
    });
    btn.onclick = () => {
      $('subject').value = item.subject;
      $('subject').focus();
    };
    container.append(btn);
  });
}

/* ---------- data ---------- */
async function refresh() {
  try {
    const [summary, rows, subjectList, goals, activity] = await Promise.all([
      api(`/api/summary?days=${days}&tz=${TZ}`),
      api('/api/sessions?limit=100'),
      api('/api/subjects').catch(() => []),
      api(`/api/goals?tz=${TZ}`).catch(() => []),
      api(`/api/activity?tz=${TZ}`).catch(() => null),
    ]);
    allSessions = rows;
    renderStats(summary, activity);
    renderBars(summary);
    renderDonut(summary);
    renderDays(summary);
    filterAndRenderRows();
    renderChips(subjectList);
    renderGoals(goals);
    if (activity) renderHeatmap(activity);
  } catch (e) {
    setMsg('Could not load data. Is the server running?', 'err');
  }
}

async function saveSession(durationMin, startedAt) {
  const subject = $('subject').value.trim();
  const category = $('category').value;
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
        category,
        notes: $('notes').value,
        started_at: startedAt,
        duration_min: durationMin,
      }),
    });
    try {
      localStorage.setItem(LAST_SUBJECT_KEY, subject);
      localStorage.setItem(LAST_CATEGORY_KEY, category);
    } catch (_) {}
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
  const start = Number(localStorage.getItem(TIMER_KEY));
  if (!start) return;
  const elapsed = Date.now() - start;
  const formatted = fmtClock(elapsed);
  $('clock').textContent = formatted;
  document.title = `${formatted} - ${ORIGINAL_TITLE}`;
}

function setTimerUI(running) {
  $('startBtn').hidden = running;
  $('stopBtn').hidden = !running;
  $('discardBtn').hidden = !running;
  $('clock').classList.toggle('running', running);
  clearInterval(timerHandle);
  if (running) {
    tick();
    timerHandle = setInterval(tick, 500);
    updateLiveStatus('studying', $('subject').value || 'General Study');
  } else {
    $('clock').textContent = '00:00:00';
    document.title = ORIGINAL_TITLE;
    updateLiveStatus('idle');
  }
}

window.addEventListener('beforeunload', (e) => {
  if (localStorage.getItem(TIMER_KEY)) {
    e.preventDefault();
    e.returnValue = '';
  }
});

$('startBtn').onclick = () => {
  getAudioContext();
  localStorage.setItem(TIMER_KEY, String(Date.now()));
  setMsg('');
  setTimerUI(true);
};

$('stopBtn').onclick = async () => {
  const start = Number(localStorage.getItem(TIMER_KEY));
  if (!start) return;
  const elapsedMs = Date.now() - start;
  if (elapsedMs < 60000) {
    setMsg('Sessions under 1 minute are not saved', 'err');
    localStorage.removeItem(TIMER_KEY);
    setTimerUI(false);
    return;
  }
  const minutes = Math.max(Math.round((elapsedMs / 60000) * 10) / 10, 1);
  const ok = await saveSession(minutes, new Date(start).toISOString());
  if (ok) {
    localStorage.removeItem(TIMER_KEY);
    setTimerUI(false);
    playChime();
  }
};

$('discardBtn').onclick = () => {
  if (!confirm('Discard this running timer?')) return;
  localStorage.removeItem(TIMER_KEY);
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
  await saveSession(mins, new Date(Date.now() - mins * 60000).toISOString());
});

/* ---------- search and category filters ---------- */
$('searchSessions').addEventListener('input', filterAndRenderRows);
$('filterCategory').addEventListener('change', filterAndRenderRows);

/* ---------- export CSV and print report ---------- */
$('exportCsvBtn').onclick = () => {
  window.location.href = `${API_BASE}/api/export/csv`;
};
$('printBtn').onclick = () => {
  window.print();
};

/* ---------- edit modal events ---------- */
$('cancelEditBtn').onclick = () => $('editDialog').close();

$('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('editId').value;
  const subject = $('editSubject').value.trim();
  const category = $('editCategory').value;
  const mins = Number($('editMinutes').value);
  const notes = $('editNotes').value.trim();

  if (!subject) {
    $('editMsg').textContent = 'Please enter a subject.';
    $('editMsg').className = 'msg err';
    $('editSubject').focus();
    return;
  }
  if (!mins || mins < 1) {
    $('editMsg').textContent = 'Sessions must be at least 1 minute.';
    $('editMsg').className = 'msg err';
    $('editMinutes').focus();
    return;
  }

  try {
    await api(`/api/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        subject,
        category,
        duration_min: mins,
        notes,
      }),
    });
    $('editDialog').close();
    setMsg(`Updated ${subject} session (${fmtMin(mins)}).`, 'ok');
    refresh();
  } catch (err) {
    $('editMsg').textContent = err.message;
    $('editMsg').className = 'msg err';
  }
});

/* ---------- goals modal events ---------- */
$('openGoalModalBtn').onclick = () => {
  $('goalSubject').value = $('subject').value || '';
  $('goalHours').value = '';
  $('goalMsg').textContent = '';
  $('goalDialog').showModal();
};
$('cancelGoalBtn').onclick = () => $('goalDialog').close();

$('goalForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const subject = $('goalSubject').value.trim();
  const target = Number($('goalHours').value);
  if (!subject) {
    $('goalMsg').textContent = 'Subject is required';
    $('goalMsg').className = 'msg err';
    return;
  }
  if (!target || target <= 0) {
    $('goalMsg').textContent = 'Target hours must be greater than 0';
    $('goalMsg').className = 'msg err';
    return;
  }

  try {
    await api('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ subject, target_hours: target }),
    });
    $('goalDialog').close();
    setMsg(`Weekly goal for ${subject} set to ${target} hours.`, 'ok');
    refresh();
  } catch (err) {
    $('goalMsg').textContent = err.message;
    $('goalMsg').className = 'msg err';
  }
});

/* ---------- Collaborative Live Room (WebSocket) ---------- */
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3000';
  const wsUrl = `${protocol}//${host}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      $('liveCount').textContent = 'Live Room Connected';
      const storedName = localStorage.getItem(PEER_NAME_KEY) || $('peerName').value;
      if (storedName) $('peerName').value = storedName;
      sendJoin();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'presence') {
          $('liveCount').textContent = `${data.count} online`;
          renderPeers(data.peers);
        }
      } catch (_) {}
    };

    ws.onclose = () => {
      $('liveCount').textContent = 'Offline (Reconnecting...)';
      setTimeout(initWebSocket, 4000);
    };

    ws.onerror = () => {
      $('liveCount').textContent = 'Offline';
    };
  } catch (_) {
    $('liveCount').textContent = 'Standalone mode';
  }
}

function sendJoin() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'join',
      username: $('peerName').value || 'Student',
      room: $('roomSelect').value,
    }));
  }
}

function updateLiveStatus(status, subject = '') {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'status',
      status,
      subject,
      startedAt: status === 'studying' ? new Date().toISOString() : null,
    }));
  }
}

function renderPeers(peers) {
  const container = $('peersList');
  container.replaceChildren();
  if (!peers || peers.length === 0) {
    container.append(el('div', { className: 'empty', textContent: 'No one else in this room right now.' }));
    return;
  }

  peers.forEach((p) => {
    const isStudying = p.status === 'studying';
    const initials = (p.username || 'S').slice(0, 2).toUpperCase();
    const avatar = el('div', { className: 'peer-avatar', textContent: initials });

    let statusEl;
    if (isStudying) {
      statusEl = el('span', { className: 'peer-studying' },
        el('span', { className: 'pulse-dot' }),
        `Studying ${p.subject || 'Focus'}`
      );
    } else {
      statusEl = el('span', { className: 'peer-status', textContent: 'Ready to study' });
    }

    const card = el('div', { className: 'peer-card' },
      el('div', { className: 'peer-info' },
        avatar,
        el('div', {}, el('strong', { textContent: p.username }), el('div', {}, statusEl))
      )
    );
    container.append(card);
  });
}

$('peerName').addEventListener('change', (e) => {
  localStorage.setItem(PEER_NAME_KEY, e.target.value.trim());
  sendJoin();
});
$('roomSelect').addEventListener('change', () => {
  sendJoin();
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

/* ---------- Theme Switcher (Dark / Light) ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = $('themeToggleBtn');
  if (btn) {
    btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    btn.title = theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode';
    btn.setAttribute('aria-label', btn.title);
  }
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  applyTheme(theme);

  const btn = $('themeToggleBtn');
  if (btn) {
    btn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    };
  }

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}
initTheme();

/* ---------- PWA Service Worker Registration ---------- */
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

/* ---------- init ---------- */
(async function init() {
  const cats = await api('/api/categories').catch(() => ['Study']);
  $('category').replaceChildren(...cats.map((c) => el('option', { value: c, textContent: c })));
  $('editCategory').replaceChildren(...cats.map((c) => el('option', { value: c, textContent: c })));

  // Populate category filter
  cats.forEach((c) => {
    $('filterCategory').append(el('option', { value: c, textContent: c }));
  });

  try {
    const lastSubj = localStorage.getItem(LAST_SUBJECT_KEY);
    const lastCat = localStorage.getItem(LAST_CATEGORY_KEY);
    const savedName = localStorage.getItem(PEER_NAME_KEY);
    if (lastSubj) $('subject').value = lastSubj;
    if (lastCat && cats.includes(lastCat)) $('category').value = lastCat;
    if (savedName) $('peerName').value = savedName;
  } catch (_) {}

  setTimerUI(!!localStorage.getItem(TIMER_KEY));
  initWebSocket();
  refresh();
})();
