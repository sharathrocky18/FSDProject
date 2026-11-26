import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  RotateCw,
  AlertCircle,
  Trash2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { FlashcardDeck } from '../types';

export const FlashcardsView: React.FC = () => {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('Algorithms & Data Structures');
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadDecks = async () => {
    try {
      const data = await api.getFlashcardDecks();
      setDecks(data);
      if (data.length > 0 && !activeDeckId) {
        setActiveDeckId(data[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const activeDeck = decks.find((d) => d.id === activeDeckId) || decks[0];
  const currentCard = activeDeck?.cards?.[cardIndex];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setGenerating(true);
    setErrorMsg(null);
    try {
      const deck = await api.generateFlashcards({
        topic: topic.trim(),
        subject,
        count: 6,
      });

      setDecks([deck, ...decks]);
      setActiveDeckId(deck.id);
      setCardIndex(0);
      setIsFlipped(false);
      setTopic('');
      confetti({ particleCount: 50, spread: 50 });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating flashcards.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMastery = async (level: 'easy' | 'medium' | 'hard') => {
    if (!activeDeck || !currentCard) return;

    try {
      await api.updateFlashcardMastery(activeDeck.id, currentCard.id, level);

      setDecks((prev) =>
        prev.map((d) => {
          if (d.id === activeDeck.id) {
            return {
              ...d,
              cards: d.cards.map((c) => (c.id === currentCard.id ? { ...c, masteryLevel: level } : c)),
            };
          }
          return d;
        })
      );

      if (cardIndex < activeDeck.cards.length - 1) {
        setCardIndex((prev) => prev + 1);
        setIsFlipped(false);
      } else {
        confetti({ particleCount: 70, spread: 60 });
      }
    } catch (err) {
      console.error('Error saving mastery level:', err);
    }
  };

  const handleDeleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteFlashcardDeck(id);
      const remaining = decks.filter((d) => d.id !== id);
      setDecks(remaining);
      if (activeDeckId === id) {
        setActiveDeckId(remaining[0]?.id || null);
        setCardIndex(0);
      }
    } catch (err) {
      console.error('Error deleting deck:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <span>AI Spaced-Repetition Flashcards</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Master challenging university concepts with active recall and self-assessed confidence levels.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Deck Topic</label>
            <input
              type="text"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="E.g., Operating Systems Scheduling & Semaphores"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="E.g., Computer Science"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={generating || !topic.trim()}
            className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>{generating ? 'Generating Deck...' : 'Generate Deck'}</span>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Saved Flashcard Decks ({decks.length})</span>
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {decks.map((deck) => {
              const isSelected = deck.id === activeDeck?.id;
              const easyCount = deck.cards.filter((c) => c.masteryLevel === 'easy').length;

              return (
                <div
                  key={deck.id}
                  onClick={() => {
                    setActiveDeckId(deck.id);
                    setCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className={`group p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-slate-800 border-indigo-400 dark:border-indigo-500/60 ring-1 ring-indigo-500/30'
                      : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{deck.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {easyCount}/{deck.cards.length} mastered · {deck.cards.length} cards
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteDeck(deck.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow mt-4">
            <img
              src="/src/assets/images/quiz_flashcard_study_1794506134916.jpg"
              alt="Flashcard study setup"
              className="w-full h-36 object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col items-center justify-between p-6 md:p-10 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-xl min-h-[460px]">
          {activeDeck && currentCard ? (
            <div className="w-full flex-1 flex flex-col justify-between items-center space-y-6">
              <div className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{activeDeck.title}</span>
                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  Card {cardIndex + 1} of {activeDeck.cards.length}
                </span>
              </div>

              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full max-w-xl h-64 p-8 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-950 dark:to-[#0c1220] border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-lg flex flex-col items-center justify-center text-center cursor-pointer transition-all transform hover:scale-[1.01] select-none relative group"
              >
                <span className="absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {isFlipped ? 'Answer (Click to flip)' : 'Question (Click to flip)'}
                </span>

                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm md:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed px-4">
                    {isFlipped ? currentCard.answer : currentCard.question}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Click anywhere to flip</span>
                </div>
              </div>

              <div className="w-full max-w-xl space-y-3">
                <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">Rate your recall confidence:</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleMastery('hard')}
                    className="flex-1 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-all"
                  >
                    Hard (Review Soon)
                  </button>
                  <button
                    onClick={() => handleMastery('medium')}
                    className="flex-1 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold transition-all"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => handleMastery('easy')}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition-all"
                  >
                    Easy (Mastered)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  disabled={cardIndex === 0}
                  onClick={() => {
                    setCardIndex((prev) => prev - 1);
                    setIsFlipped(false);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  disabled={cardIndex === activeDeck.cards.length - 1}
                  onClick={() => {
                    setCardIndex((prev) => prev + 1);
                    setIsFlipped(false);
                  }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500">
              No deck selected. Generate your first flashcard deck above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
