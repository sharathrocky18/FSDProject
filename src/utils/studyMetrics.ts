/**
 * Pure calculation utilities for StudySync academic metrics & streaks
 */

export interface SessionRecord {
  id: string;
  userId: string;
  subjectId: string;
  durationMinutes: number;
  date: string; // ISO date string YYYY-MM-DD or full ISO
  mode: 'timer' | 'pomodoro';
}

/**
 * Formats minutes into human-readable hours and minutes (e.g., "2h 30m" or "45m")
 */
export function formatStudyDuration(minutes: number): string {
  if (minutes < 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

/**
 * Calculates total study hours from an array of sessions
 */
export function calculateTotalStudyHours(sessions: SessionRecord[]): number {
  const totalMinutes = sessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  return Number((totalMinutes / 60).toFixed(1));
}

/**
 * Calculates today's study minutes given a reference date (YYYY-MM-DD)
 */
export function calculateTodayStudyMinutes(sessions: SessionRecord[], referenceDateStr?: string): number {
  const targetDate = referenceDateStr || new Date().toISOString().split('T')[0];
  return sessions
    .filter(s => s.date.startsWith(targetDate))
    .reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
}

/**
 * Computes consecutive study streak (in days) ending today or yesterday
 */
export function calculateStudyStreak(sessionDates: string[], referenceDate?: Date): number {
  if (!sessionDates || sessionDates.length === 0) return 0;

  // Extract unique sorted date strings (YYYY-MM-DD) in descending order
  const uniqueDates = Array.from(new Set(sessionDates.map(d => d.split('T')[0]))).sort().reverse();
  if (uniqueDates.length === 0) return 0;

  const today = referenceDate ? new Date(referenceDate) : new Date();
  // Use UTC-based date arithmetic to avoid timezone shifts
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayMs = new Date(todayStr + 'T00:00:00Z').getTime() - 86400000;
  const yesterdayStr = new Date(yesterdayMs).toISOString().split('T')[0];

  // If latest session is neither today nor yesterday, streak is broken (0)
  const latestDate = uniqueDates[0];
  if (latestDate !== todayStr && latestDate !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let expectedMs = new Date(latestDate + 'T00:00:00Z').getTime();

  for (const dateStr of uniqueDates) {
    const currentMs = new Date(dateStr + 'T00:00:00Z').getTime();
    const diffDays = Math.round((expectedMs - currentMs) / 86400000);
    
    if (diffDays === 0) {
      streak += 1;
      expectedMs -= 86400000;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Computes subject-wise distribution percentages
 */
export function calculateSubjectDistribution(
  sessions: SessionRecord[],
  subjects: { id: string; name: string; color: string }[]
): { subjectId: string; name: string; color: string; minutes: number; percentage: number }[] {
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const minutesBySubject: Record<string, number> = {};

  for (const session of sessions) {
    minutesBySubject[session.subjectId] = (minutesBySubject[session.subjectId] || 0) + session.durationMinutes;
  }

  return subjects.map(subj => {
    const minutes = minutesBySubject[subj.id] || 0;
    const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
    return {
      subjectId: subj.id,
      name: subj.name,
      color: subj.color,
      minutes,
      percentage
    };
  });
}
