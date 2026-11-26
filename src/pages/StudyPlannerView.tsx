import React, { useState, useEffect } from 'react';
import {
  Compass,
  Sparkles,
  CheckCircle2,
  Circle,
  AlertCircle,
  BookOpen,
  Lightbulb,
  Layers,
  Clock,
  Calendar,
  Target,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { StudyPlan, StudyPlanTopicStep, Subject } from '../types';
import { calculatePlannerProgress, buildPlannerFocusLabel } from '../utils/plannerProgress';

const difficultyBadgeStyles: Record<StudyPlanTopicStep['difficulty'], string> = {
  Foundational:
    'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  Intermediate:
    'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
  Advanced:
    'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
};

export const StudyPlannerView: React.FC = () => {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [subjectFocus, setSubjectFocus] = useState('');
  const [topicFocus, setTopicFocus] = useState('');
  const [prepLevel, setPrepLevel] = useState('Beginner (Start from Basics)');
  const [availableHours, setAvailableHours] = useState(3.0);
  const [goals, setGoals] = useState('Master basic concepts first, then prepare topic-by-topic for exams');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  const fetchPlans = async () => {
    try {
      const history = await api.getStudyPlanHistory();
      setPlans(history);
      if (history.length > 0) {
        setSelectedPlanId((prev) => prev || history[0].id);
      }
    } catch {
      try {
        const current = await api.getCurrentStudyPlan();
        if (current) {
          setPlans([current]);
          setSelectedPlanId(current.id);
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getSubjects().then((res) => setSubjects(res)).catch(() => {});
    fetchPlans();
  }, []);

  const currentPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  useEffect(() => {
    if (currentPlan?.topicRoadmap && currentPlan.topicRoadmap.length > 0) {
      const init: Record<string, boolean> = {};
      currentPlan.topicRoadmap.forEach((t) => {
        init[t.id] = true;
      });
      setExpandedTopics(init);
    }
  }, [currentPlan?.id]);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubject = subjectFocus.trim();
    const cleanTopic = topicFocus.trim();

    if (!cleanSubject && !cleanTopic) {
      setErrorMsg('Please enter a Subject Name or Topic Name to generate your study plan.');
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    try {
      const subjectNames = subjects.map((s) => s.name);
      const newPlan: StudyPlan = await api.generateStudyPlan({
        subjectFocus: cleanSubject || undefined,
        topicFocus: cleanTopic || undefined,
        availableHoursDaily: availableHours,
        subjects: cleanSubject ? [cleanSubject] : subjectNames.length > 0 ? subjectNames : ['General Studies'],
        learningGoals: goals.trim() || 'Build strong basic concepts and master every topic',
        examDates: 'Exam & mastery timeline (7-day structured roadmap)',
        currentPrepLevel: prepLevel,
      });

      setPlans((prev) => [newPlan, ...prev]);
      setSelectedPlanId(newPlan.id);
      confetti({ particleCount: 55, spread: 55 });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating study plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleTopic = async (topicId: string, currentStatus: boolean) => {
    try {
      await api.togglePlanTopic(topicId, !currentStatus);
      if (!currentStatus) {
        confetti({ particleCount: 30, spread: 45 });
      }
      setPlans((prev) =>
        prev.map((p) =>
          p.id === currentPlan?.id
            ? {
                ...p,
                topicRoadmap: (p.topicRoadmap || []).map((t) =>
                  t.id === topicId ? { ...t, completed: !currentStatus } : t
                ),
              }
            : p
        )
      );
    } catch (err) {
      console.error('Error toggling topic:', err);
    }
  };

  const handleToggleSlot = async (slotId: string, currentStatus: boolean) => {
    try {
      await api.togglePlanSlot(slotId, !currentStatus);
      if (!currentStatus) {
        confetti({ particleCount: 30, spread: 45 });
      }
      setPlans((prev) =>
        prev.map((p) =>
          p.id === currentPlan?.id
            ? {
                ...p,
                slots: p.slots.map((s) => (s.id === slotId ? { ...s, completed: !currentStatus } : s)),
              }
            : p
        )
      );
    } catch (err) {
      console.error('Error toggling slot:', err);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await api.deleteStudyPlan(planId);
      const remaining = plans.filter((p) => p.id !== planId);
      setPlans(remaining);
      if (selectedPlanId === planId) {
        setSelectedPlanId(remaining[0]?.id || null);
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  const toggleTopicExpand = (topicId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: prev[topicId] === false }));
  };

  const progress = calculatePlannerProgress(currentPlan);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-7">
      {/* Page Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>AI Subject & Topic-Wise Study Planner</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Enter any subject or topic name to get its basic concepts explained simply, a step-by-step topic-wise roadmap, and a structured study schedule.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Planner Generator Form */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Prepare a Study Plan by Subject or Topic</span>
          </h3>

          {subjects.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
                Your Subjects:
              </span>
              {subjects.slice(0, 4).map((subj) => (
                <button
                  key={subj.id}
                  type="button"
                  onClick={() => setSubjectFocus(subj.name)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                    subjectFocus === subj.name
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  {subj.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleGeneratePlan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="planner-subject-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Subject Name
              </label>
              <input
                id="planner-subject-input"
                type="text"
                value={subjectFocus}
                onChange={(e) => setSubjectFocus(e.target.value)}
                placeholder="e.g., Operating Systems, Calculus, Organic Chemistry"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="planner-topic-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Topic Name <span className="text-slate-400 font-normal">(optional or specific)</span>
              </label>
              <input
                id="planner-topic-input"
                type="text"
                value={topicFocus}
                onChange={(e) => setTopicFocus(e.target.value)}
                placeholder="e.g., CPU Scheduling & Deadlocks, Dynamic Programming"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="planner-level-select"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Current Preparation Level
              </label>
              <select
                id="planner-level-select"
                value={prepLevel}
                onChange={(e) => setPrepLevel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Beginner (Start from Basics)">Beginner (Start from Basics)</option>
                <option value="Intermediate">Intermediate (Know Basics, Need Structure)</option>
                <option value="Exam Revision">Exam Revision (Fast Topic Review)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label
                htmlFor="planner-hours-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Daily Study Hours
              </label>
              <input
                id="planner-hours-input"
                type="number"
                step="0.5"
                min="0.5"
                max="14"
                value={availableHours}
                onChange={(e) => setAvailableHours(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="planner-goals-input"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Learning Goal / Exam Target
              </label>
              <input
                id="planner-goals-input"
                type="text"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="E.g., Build fundamentals and score high in next week's midterm"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={generating}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? 'Building Study Plan...' : 'Build Topic-Wise Study Plan'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Saved Study Plans Switcher */}
      {plans.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-1">
            Saved Plans:
          </span>
          {plans.map((p) => {
            const isSelected = p.id === currentPlan?.id;
            const label = buildPlannerFocusLabel(p.subjectFocus, p.topicFocus);
            return (
              <div
                key={p.id}
                className={`inline-flex items-center rounded-xl border text-xs transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedPlanId(p.id)}
                  className="px-3 py-1.5 font-semibold text-left"
                >
                  {label}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePlan(p.id)}
                  aria-label={`Delete plan ${label}`}
                  className={`pr-2.5 py-1.5 opacity-75 hover:opacity-100 ${
                    isSelected ? 'text-white' : 'text-slate-400 hover:text-rose-500'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {generating && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-500/30 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Preparing your plan for {buildPlannerFocusLabel(subjectFocus, topicFocus)}...
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Summarizing basic concepts first, organizing topic-wise modules, and building your study timetable.
            </p>
          </div>
        </div>
      )}

      {!loading && !currentPlan && !generating && (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-indigo-500 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Study Plan Created Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Enter a subject or topic above and click <strong>Build Topic-Wise Study Plan</strong> to get beginner-friendly basic concepts, topic-by-topic steps, and a study schedule.
          </p>
        </div>
      )}

      {!loading && currentPlan && (
        <div className="space-y-8">
          {/* Active Plan Header & Overall Progress */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {buildPlannerFocusLabel(currentPlan.subjectFocus, currentPlan.topicFocus)}
                </span>
                {currentPlan.preparationLevel && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {currentPlan.preparationLevel}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{currentPlan.goalSummary}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentPlan.availableHoursDaily}h/day study pace
                {progress.totalTopicHours > 0 ? ` · ${progress.totalTopicHours}h total topic roadmap` : ''}
              </p>
            </div>

            <div className="min-w-[220px] space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Plan Completion</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {progress.overallProgressPct}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${progress.overallProgressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-right tabular-nums">
                {progress.totalTopics > 0
                  ? `${progress.completedTopics}/${progress.totalTopics} topics · `
                  : ''}
                {progress.completedSlots}/{progress.totalSlots} schedule slots
              </p>
            </div>
          </div>

          {/* 1. Basic Concepts Foundation */}
          {currentPlan.basicConcepts && currentPlan.basicConcepts.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Basic Concepts to Learn First ({currentPlan.basicConcepts.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPlan.basicConcepts.map((concept, idx) => (
                  <div
                    key={concept.id || idx}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{concept.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {concept.explanation}
                    </p>
                    {concept.whyItMatters && (
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-500/20 rounded-lg px-2.5 py-1.5">
                        <strong>Why it matters:</strong> {concept.whyItMatters}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. Topic-Wise Study Roadmap */}
          {currentPlan.topicRoadmap && currentPlan.topicRoadmap.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Topic-Wise Study Plan ({currentPlan.topicRoadmap.length} Topics)</span>
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {progress.completedTopics} of {progress.totalTopics} mastered
                </span>
              </div>

              <div className="space-y-3">
                {currentPlan.topicRoadmap.map((topic, idx) => {
                  const isExpanded = expandedTopics[topic.id] !== false;
                  return (
                    <div
                      key={topic.id}
                      className={`rounded-2xl border shadow-sm overflow-hidden transition-colors ${
                        topic.completed
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-300 dark:border-emerald-500/40'
                          : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="p-4 md:p-5 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleToggleTopic(topic.id, topic.completed)}
                            aria-label={
                              topic.completed
                                ? `Mark topic ${topic.topicTitle} incomplete`
                                : `Mark topic ${topic.topicTitle} complete`
                            }
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-500 transition-colors"
                          >
                            {topic.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>

                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                Topic {topic.order || idx + 1}
                              </span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                  difficultyBadgeStyles[topic.difficulty] || difficultyBadgeStyles.Intermediate
                                }`}
                              >
                                {topic.difficulty}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {topic.estimatedHours}h
                              </span>
                            </div>

                            <h4
                              className={`text-sm font-bold ${
                                topic.completed
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {topic.topicTitle}
                            </h4>
                            {topic.basicIdea && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {topic.basicIdea}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleTopicExpand(topic.id)}
                          aria-label={isExpanded ? `Collapse ${topic.topicTitle}` : `Expand ${topic.topicTitle}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="px-4 md:px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              Basic Points to Know
                            </p>
                            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                              {topic.keyPoints.map((pt, kIdx) => (
                                <li key={kIdx} className="flex items-start gap-2">
                                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
                                  <span>{pt}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-500/20 space-y-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                              Step-by-Step Preparation
                            </p>
                            <ol className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                              {topic.studySteps.map((step, sIdx) => (
                                <li key={sIdx} className="flex items-start gap-2">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                    {sIdx + 1}.
                                  </span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>

                          {topic.practiceGoal && (
                            <div className="md:col-span-2 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                              <Target className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold">Practice Goal: </span>
                                <span>{topic.practiceGoal}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 3. Weekly Study Timetable */}
          {currentPlan.slots && currentPlan.slots.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Daily & Weekly Study Timetable
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentPlan.slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => handleToggleSlot(slot.id, slot.completed)}
                    className={`p-4 rounded-xl border text-left transition-all shadow-sm ${
                      slot.completed
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40 text-slate-500 dark:text-slate-400'
                        : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 block">
                          {slot.dayOfWeek} · {slot.timeSlot}
                        </span>
                        <h4
                          className={`text-xs font-bold mt-1 ${
                            slot.completed ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {slot.topicFocus || slot.subjectName}
                        </h4>
                        {slot.topicFocus && slot.subjectName && slot.topicFocus !== slot.subjectName && (
                          <span className="text-[10px] font-medium text-cyan-700 dark:text-cyan-400 block mt-0.5">
                            {slot.subjectName}
                          </span>
                        )}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {slot.taskTitle}
                        </p>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        <CheckCircle2
                          className={`w-5 h-5 transition-colors ${
                            slot.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
