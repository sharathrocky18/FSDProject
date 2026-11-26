import React, { useState, useEffect } from 'react';
import {
  Award,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  XCircle,
  History,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Quiz, Subject } from '../types';

export const QuizGeneratorView: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topic, setTopic] = useState('');
  const [subjectName, setSubjectName] = useState('General Academic');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questionCount, setQuestionCount] = useState(4);

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const [history, setHistory] = useState<Quiz[]>([]);

  useEffect(() => {
    api
      .getSubjects()
      .then((res) => {
        setSubjects(res);
      })
      .catch(() => {});
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getQuizHistory();
      setHistory(data);
    } catch {
      // ignore
    }
  };

  const triggerGenerateQuiz = async () => {
    if (!topic.trim() || generating) return;

    setGenerating(true);
    setErrorMsg(null);
    setCurrentQuiz(null);
    setSelectedAnswers({});
    setSubmitted(false);

    try {
      const quiz = await api.generateQuiz({
        topic: topic.trim(),
        subject: subjectName,
        difficulty,
        questionCount,
      });

      if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error('No quiz questions were returned. Please try again.');
      }

      setCurrentQuiz(quiz);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating quiz. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    await triggerGenerateQuiz();
  };

  const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmitQuiz = async () => {
    if (!currentQuiz) return;

    let correctCount = 0;
    currentQuiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctOptionIndex) {
        correctCount += 1;
      }
    });

    setScore(correctCount);
    setSubmitted(true);

    if (correctCount >= currentQuiz.questions.length / 2) {
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    }

    try {
      await api.saveQuizAttempt({ quizId: currentQuiz.id, score: correctCount });
      loadHistory();
    } catch (err) {
      console.error('Error saving quiz result:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>AI Examination Quiz Generator</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Generate rigorous multiple choice questions to test active recall before campus exams.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={triggerGenerateQuiz}
            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <form onSubmit={handleGenerateQuiz} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Topic or Concept
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="E.g., Dynamic Programming & Knapsack, Virtual Memory Paging"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Subject / Domain
              </label>
              <select
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
                <option value="General Academic">General Academic / Any Subject</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Difficulty Level
              </label>
              <div className="flex gap-2">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                      difficulty === diff
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Number of Questions
              </label>
              <div className="flex gap-2">
                {[3, 4, 6, 8].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      questionCount === cnt
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {cnt} Qs
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={generating || !topic.trim()}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Generating examination questions...' : 'Generate AI Quiz'}</span>
          </button>
        </form>
      </div>

      {currentQuiz && (
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-6 shadow-md">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {currentQuiz.difficulty} Difficulty · {currentQuiz.questions.length} Questions
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{currentQuiz.topic}</h3>
            </div>

            {submitted && (
              <div className="text-right">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {score} / {currentQuiz.questions.length}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Score Recorded</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {currentQuiz.questions.map((q, qIdx) => {
              const selectedOption = selectedAnswers[qIdx];
              const isCorrect = selectedOption === q.correctOptionIndex;

              return (
                <div
                  key={q.id}
                  className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3.5"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {qIdx + 1}. {q.question}
                  </p>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => {
                      const isChosen = selectedOption === optIdx;
                      let optionStyle =
                        'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700';

                      if (submitted) {
                        if (optIdx === q.correctOptionIndex) {
                          optionStyle =
                            'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-400 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-semibold';
                        } else if (isChosen && !isCorrect) {
                          optionStyle =
                            'bg-rose-50 dark:bg-rose-500/20 border-rose-400 dark:border-rose-500/50 text-rose-800 dark:text-rose-300 font-semibold';
                        }
                      } else if (isChosen) {
                        optionStyle =
                          'bg-indigo-50 dark:bg-indigo-600/30 border-indigo-500 text-indigo-900 dark:text-white font-medium';
                      }

                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleOptionSelect(qIdx, optIdx)}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-all ${optionStyle}`}
                        >
                          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-mono shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {submitted && optIdx === q.correctOptionIndex && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                          {submitted && isChosen && !isCorrect && (
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                      <p className="font-semibold text-indigo-600 dark:text-cyan-400 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Explanation:</span>
                      </p>
                      <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submitted ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={Object.keys(selectedAnswers).length < currentQuiz.questions.length}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg transition-all"
            >
              Submit Quiz & Calculate Score
            </button>
          ) : (
            <button
              onClick={() => {
                setCurrentQuiz(null);
                setSubmitted(false);
              }}
              className="w-full py-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold shadow transition-all"
            >
              Take Another Quiz
            </button>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Previous Quiz Attempts</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {history.map((h) => (
              <div
                key={h.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/70 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-xs">{h.topic}</p>
                  <p className="text-[10px] text-slate-500">
                    {h.difficulty} difficulty · {h.totalQuestions} questions
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {h.score !== undefined ? `${h.score}/${h.totalQuestions}` : 'Incomplete'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
