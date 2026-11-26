import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlannerProgress, buildPlannerFocusLabel } from './plannerProgress';

test('calculatePlannerProgress handles null and partial completion accurately', () => {
  assert.deepEqual(calculatePlannerProgress(null), {
    totalTopics: 0,
    completedTopics: 0,
    totalTopicHours: 0,
    totalSlots: 0,
    completedSlots: 0,
    overallProgressPct: 0,
  });

  const summary = calculatePlannerProgress({
    topicRoadmap: [
      { completed: true, estimatedHours: 1.5 },
      { completed: false, estimatedHours: 2.0 },
    ],
    slots: [
      { completed: true },
      { completed: true },
      { completed: false },
      { completed: false },
    ],
  });

  assert.equal(summary.totalTopics, 2);
  assert.equal(summary.completedTopics, 1);
  assert.equal(summary.totalTopicHours, 3.5);
  assert.equal(summary.totalSlots, 4);
  assert.equal(summary.completedSlots, 2);
  assert.equal(summary.overallProgressPct, 50);
});

test('buildPlannerFocusLabel formats subject and topic combinations', () => {
  assert.equal(buildPlannerFocusLabel('Operating Systems', 'Deadlocks'), 'Operating Systems — Deadlocks');
  assert.equal(buildPlannerFocusLabel('', 'Dynamic Programming'), 'Dynamic Programming');
  assert.equal(buildPlannerFocusLabel('Data Structures', ''), 'Data Structures');
  assert.equal(buildPlannerFocusLabel('', ''), 'Multi-Subject Study Plan');
});
