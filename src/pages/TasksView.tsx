import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Task, Subject } from '../types';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [type, setType] = useState<'assignment' | 'exam' | 'project' | 'reading'>('assignment');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getSubjects().then((res) => {
      setSubjects(res);
      if (res.length > 0) setSubjectId(res[0].id);
    });
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setErrorMsg(null);
    try {
      const newTask = await api.createTask({
        title: title.trim(),
        subjectId,
        type,
        dueDate,
        priority,
      });

      setTasks([newTask, ...tasks]);
      setShowAddModal(false);
      setTitle('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating task.');
    }
  };

  const handleToggleComplete = async (task: Task) => {
    try {
      const updated = await api.updateTask(task.id, { completed: !task.completed });
      if (!task.completed) {
        confetti({ particleCount: 40, spread: 50 });
      }

      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterStatus === 'pending') return !t.completed;
    if (filterStatus === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Task & Assignment Manager</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Organize coursework deadlines, projects, and reading milestones with prioritized alerts.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Assignment</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          {(['all', 'pending', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                filterStatus === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {loading ? 'Loading...' : `Showing ${filteredTasks.length} of ${tasks.length} total tasks`}
        </span>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
            <CheckCircle2 className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">No tasks in this category.</p>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const subj = subjects.find((s) => s.id === t.subjectId);
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm ${
                  t.completed
                    ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-75'
                    : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <button
                    onClick={() => handleToggleComplete(t)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      t.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-400 dark:border-slate-600 hover:border-indigo-500'
                    }`}
                  >
                    {t.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold truncate ${
                        t.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {subj && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subj.color }} />
                          <span>{subj.name}</span>
                          <span>·</span>
                        </span>
                      )}
                      <span className="capitalize">{t.type}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span>Due {t.dueDate}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      t.priority === 'high'
                        ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                        : t.priority === 'medium'
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.priority.toUpperCase()}
                  </span>

                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create Assignment or Task</h3>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Problem Set 5: Graph Theory"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="exam">Examination</option>
                    <option value="project">Project Lab</option>
                    <option value="reading">Textbook Reading</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
