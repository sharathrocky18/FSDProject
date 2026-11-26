export interface PlannerProgressSummary {
  totalTopics: number;
  completedTopics: number;
  totalTopicHours: number;
  totalSlots: number;
  completedSlots: number;
  overallProgressPct: number;
}

export function calculatePlannerProgress(plan: {
  topicRoadmap?: { completed: boolean; estimatedHours: number }[];
  slots?: { completed: boolean }[];
} | null): PlannerProgressSummary {
  if (!plan) {
    return {
      totalTopics: 0,
      completedTopics: 0,
      totalTopicHours: 0,
      totalSlots: 0,
      completedSlots: 0,
      overallProgressPct: 0,
    };
  }

  const topics = Array.isArray(plan.topicRoadmap) ? plan.topicRoadmap : [];
  const slots = Array.isArray(plan.slots) ? plan.slots : [];

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.completed).length;
  const totalTopicHours = Number(
    topics.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0).toFixed(1)
  );

  const totalSlots = slots.length;
  const completedSlots = slots.filter((s) => s.completed).length;

  const totalItems = totalTopics + totalSlots;
  const completedItems = completedTopics + completedSlots;
  const overallProgressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    totalTopics,
    completedTopics,
    totalTopicHours,
    totalSlots,
    completedSlots,
    overallProgressPct,
  };
}

export function buildPlannerFocusLabel(subjectFocus?: string, topicFocus?: string): string {
  const s = (subjectFocus || '').trim();
  const t = (topicFocus || '').trim();
  if (s && t) return `${s} — ${t}`;
  if (t) return t;
  if (s) return s;
  return 'Multi-Subject Study Plan';
}
