import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Clock, Trash2, Edit3, X, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Subject } from '../types';

const PRESET_COLORS = [
  '#6366f1',
  '#06b6d4',
  '#8b5cf6',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#3b82f6',
  '#f43f5e',
];

export const SubjectsView: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [targetHoursWeekly, setTargetHoursWeekly] = useState(6);
  const [description, setDescription] = useState('');

  const fetchSubjects = async () => {
    try {
      const data = await api.getSubjects();
      setSubjects(data);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setColor(PRESET_COLORS[0]);
    setTargetHoursWeekly(6);
    setDescription('');
    setErrorMsg(null);
    setShowModal(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingId(sub.id);
    setName(sub.name);
    setCode(sub.code);
    setColor(sub.color);
    setTargetHoursWeekly(sub.targetHoursWeekly);
    setDescription(sub.description || '');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (editingId) {
        await api.updateSubject(editingId, { name, code, color, targetHoursWeekly, description });
      } else {
        await api.createSubject({ name, code, color, targetHoursWeekly, description });
      }
      setShowModal(false);
      fetchSubjects();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving subject.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSubject(id);
      fetchSubjects();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting subject.');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Academic Subjects & Learning Goals</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define semester courses, weekly focus hours targets, and monitor your study completion.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Subject</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-44 bg-slate-200 dark:bg-slate-900 rounded-2xl" />
          <div className="h-44 bg-slate-200 dark:bg-slate-900 rounded-2xl" />
        </div>
      ) : subjects.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No Subjects Enrolled Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Add your college courses to start logging study time and generating targeted AI quizzes.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium"
          >
            Create Your First Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subjects.map((sub) => {
            const studyHours = sub.totalStudyHours || 0;
            const target = sub.targetHoursWeekly || 5;
            const progressPct = Math.min(100, Math.round((studyHours / target) * 100));

            return (
              <div
                key={sub.id}
                className="flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all"
              >
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: sub.color }} />

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                          {sub.name}
                        </h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{sub.code}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(sub)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Edit Subject"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {sub.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {sub.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>
                        Weekly Goal: <strong className="text-slate-900 dark:text-white tabular-nums">{target}h</strong>
                      </span>
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium tabular-nums">
                      {studyHours}h logged ({progressPct}%)
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%`, backgroundColor: sub.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              {editingId ? 'Edit Subject' : 'Add Academic Subject'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="E.g., Distributed Operating Systems"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="CS 450"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Hours / Week</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={targetHoursWeekly}
                    onChange={(e) => setTargetHoursWeekly(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Color Accent</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    >
                      {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Syllabus / Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Key exam milestones or topics covered..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
                >
                  {editingId ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
