import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Clock,
  MapPin,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';
import { CalendarEvent } from '../types';

export const CalendarView: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('12:00 PM');
  const [type, setType] = useState<'exam' | 'deadline' | 'study_group' | 'lecture'>('exam');
  const [location, setLocation] = useState('');

  const fetchEvents = async () => {
    try {
      const data = await api.getCalendarEvents();
      setEvents(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setErrorMsg(null);
    try {
      const newEv = await api.createCalendarEvent({
        title: title.trim(),
        date,
        startTime,
        endTime,
        type,
        location,
      });

      setEvents([...events, newEv]);
      setShowAddModal(false);
      setTitle('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating event.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCalendarEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Campus Academic Calendar</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track midterm schedules, finals dates, project milestones, and lectures.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Academic Event</span>
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading calendar...</div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
            <p className="text-xs text-slate-500 dark:text-slate-400">No events scheduled. Add your first exam or study session!</p>
          </div>
        ) : (
          events
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((ev) => {
              const isExam = ev.type === 'exam';
              return (
                <div
                  key={ev.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border gap-4 transition-all shadow-sm ${
                    isExam
                      ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
                      : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl flex flex-col items-center justify-center min-w-[60px] text-center shrink-0 ${
                        isExam
                          ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">
                        {new Date(ev.date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-lg font-extrabold leading-none tabular-nums">
                        {new Date(ev.date).getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ev.title}</h4>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                            isExam
                              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                              : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400'
                          }`}
                        >
                          {ev.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>
                            {ev.startTime} - {ev.endTime}
                          </span>
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            <span>{ev.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(ev.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 self-end sm:self-center"
                    title="Delete Event"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Academic Calendar Event</h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., CS 301 Midterm Examination"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="exam">Examination</option>
                    <option value="deadline">Submission Deadline</option>
                    <option value="lecture">Important Lecture</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="12:00 PM"
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Location / Hall</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="E.g., Engineering Hall Room 204"
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
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
                  Add Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
