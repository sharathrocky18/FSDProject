import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatStudyDuration,
  calculateTotalStudyHours,
  calculateTodayStudyMinutes,
  calculateStudyStreak,
  calculateSubjectDistribution,
  SessionRecord
} from './studyMetrics';
import {
  cosineSimilarity,
  chunkText,
  rankChunksBySimilarity,
  DocumentChunk
} from './ragSearch';

test('formatStudyDuration formats hours and minutes properly', () => {
  assert.equal(formatStudyDuration(45), '45m');
  assert.equal(formatStudyDuration(120), '2h');
  assert.equal(formatStudyDuration(150), '2h 30m');
  assert.equal(formatStudyDuration(0), '0m');
});

test('calculateTotalStudyHours sums sessions correctly', () => {
  const sessions: SessionRecord[] = [
    { id: '1', userId: 'u1', subjectId: 's1', durationMinutes: 60, date: '2026-11-10', mode: 'timer' },
    { id: '2', userId: 'u1', subjectId: 's2', durationMinutes: 90, date: '2026-11-11', mode: 'pomodoro' }
  ];
  assert.equal(calculateTotalStudyHours(sessions), 2.5);
});

test('calculateTodayStudyMinutes filters by reference date', () => {
  const sessions: SessionRecord[] = [
    { id: '1', userId: 'u1', subjectId: 's1', durationMinutes: 45, date: '2026-11-12T09:00:00Z', mode: 'timer' },
    { id: '2', userId: 'u1', subjectId: 's2', durationMinutes: 30, date: '2026-11-12T14:00:00Z', mode: 'pomodoro' },
    { id: '3', userId: 'u1', subjectId: 's1', durationMinutes: 60, date: '2026-11-11T10:00:00Z', mode: 'timer' }
  ];
  assert.equal(calculateTodayStudyMinutes(sessions, '2026-11-12'), 75);
});

test('calculateStudyStreak handles consecutive days accurately', () => {
  const today = new Date('2026-11-12T12:00:00Z');
  
  // 3-day active streak (today, yesterday, day before)
  const activeDates = ['2026-11-12', '2026-11-11', '2026-11-10'];
  assert.equal(calculateStudyStreak(activeDates, today), 3);

  // Active streak starting yesterday (study hasn't happened yet today, still alive!)
  const yesterdayDates = ['2026-11-11', '2026-11-10', '2026-11-09'];
  assert.equal(calculateStudyStreak(yesterdayDates, today), 3);

  // Broken streak (last studied 3 days ago)
  const brokenDates = ['2026-11-09', '2026-11-08'];
  assert.equal(calculateStudyStreak(brokenDates, today), 0);
});

test('calculateSubjectDistribution computes proper percentages', () => {
  const subjects = [
    { id: 's1', name: 'Data Structures', color: '#6366f1' },
    { id: 's2', name: 'Operating Systems', color: '#10b981' }
  ];
  const sessions: SessionRecord[] = [
    { id: '1', userId: 'u1', subjectId: 's1', durationMinutes: 150, date: '2026-11-12', mode: 'timer' },
    { id: '2', userId: 'u1', subjectId: 's2', durationMinutes: 50, date: '2026-11-12', mode: 'pomodoro' }
  ];

  const dist = calculateSubjectDistribution(sessions, subjects);
  assert.equal(dist.length, 2);
  assert.equal(dist[0].percentage, 75);
  assert.equal(dist[1].percentage, 25);
});

test('cosineSimilarity calculates exact geometric similarity', () => {
  const v1 = [1, 0, 0];
  const v2 = [1, 0, 0];
  const v3 = [0, 1, 0];
  assert.equal(cosineSimilarity(v1, v2), 1.0);
  assert.equal(cosineSimilarity(v1, v3), 0.0);
});

test('chunkText splits paragraphs and provides overlap', () => {
  const text = 'Sentence one is informative. Sentence two adds more detail. Sentence three concludes the section.';
  const chunks = chunkText(text, 50, 15);
  assert.ok(chunks.length >= 2);
  assert.ok(chunks[0].includes('Sentence'));
});

test('rankChunksBySimilarity orders chunks by descending score', () => {
  const q = [1, 1, 0];
  const chunks: DocumentChunk[] = [
    { id: 'c1', documentId: 'd1', chunkIndex: 0, content: 'orthogonal', embedding: [0, 0, 1] },
    { id: 'c2', documentId: 'd1', chunkIndex: 1, content: 'identical', embedding: [1, 1, 0] },
    { id: 'c3', documentId: 'd1', chunkIndex: 2, content: 'close', embedding: [1, 0.5, 0] }
  ];

  const ranked = rankChunksBySimilarity(q, chunks, 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].chunk.id, 'c2');
  assert.ok(ranked[0].similarity > 0.99);
  assert.equal(ranked[1].chunk.id, 'c3');
});
