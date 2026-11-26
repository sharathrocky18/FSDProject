import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  Sparkles,
  AlertCircle,
  Clock,
  CheckCircle2,
  BookOpen,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Send,
  Bot,
  User,
  Bookmark,
  History,
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentRecord, PdfTopicBreakdown } from '../types';
import { FormattedMessage } from '../components/FormattedMessage';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      resolve(commaIndex > -1 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

const difficultyStyles: Record<PdfTopicBreakdown['difficulty'], string> = {
  Foundational:
    'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
  Intermediate:
    'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
  Advanced:
    'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30',
};

export const PdfAssistantView: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [question, setQuestion] = useState('');
  const [querying, setQuerying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchDocuments = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
      if (data.length > 0 && !selectedDocId) {
        setSelectedDocId(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching PDF history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  useEffect(() => {
    if (selectedDoc?.topics && selectedDoc.topics.length > 0) {
      const initial: Record<string, boolean> = {};
      selectedDoc.topics.forEach((t) => {
        initial[t.id] = true;
      });
      setExpandedTopics(initial);
    }
  }, [selectedDoc?.id]);

  const triggerSystemFilePicker = () => {
    if (uploading) return;
    setErrorMsg(null);
    fileInputRef.current?.click();
  };

  const processFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 14 * 1024 * 1024) {
      setErrorMsg('Please select a file smaller than 14 MB.');
      return;
    }

    setUploading(true);
    setUploadingFileName(file.name);
    setErrorMsg(null);

    try {
      const lower = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');

      let payload: any = {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || (isPdf ? 'application/pdf' : 'text/plain'),
      };

      if (isPdf) {
        payload.base64Data = await readFileAsBase64(file);
      } else {
        const text = await file.text();
        if (!text.trim()) {
          throw new Error('The selected file has no readable text content.');
        }
        payload.textContent = text;
      }

      const analyzedDoc: DocumentRecord = await api.uploadDocument(payload);
      setDocuments((prev) => [analyzedDoc, ...prev]);
      setSelectedDocId(analyzedDoc.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not analyze the uploaded file. Please try another file.');
    } finally {
      setUploading(false);
      setUploadingFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFileUpload(file);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!selectedDoc || !trimmed || querying) return;

    setQuestion('');
    setQuerying(true);
    setErrorMsg(null);

    const tempUserMsg = {
      id: `temp-u-${Date.now()}`,
      sender: 'user' as const,
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === selectedDoc.id ? { ...d, messages: [...(d.messages || []), tempUserMsg] } : d
      )
    );

    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const res = await api.askDocument(selectedDoc.id, trimmed);
      if (res.document) {
        setDocuments((prev) => prev.map((d) => (d.id === res.document.id ? res.document : d)));
      }
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error answering your question about this file.');
    } finally {
      setQuerying(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteDocument(id);
      const remaining = documents.filter((d) => d.id !== id);
      setDocuments(remaining);
      if (selectedDocId === id) {
        setSelectedDocId(remaining[0]?.id || null);
      }
    } catch (err) {
      console.error('Error deleting file from history:', err);
    }
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const totalMinutes =
    selectedDoc?.topics?.reduce((acc, t) => acc + (t.estimatedMinutes || 0), 0) || 0;

  return (
    <div className="flex h-[calc(100vh-57px)] bg-slate-50 dark:bg-[#070b13] overflow-hidden transition-colors">
      {/* Hidden Native System File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.md,.csv,.json,application/pdf,text/plain,text/markdown"
        onChange={handleFileInputChange}
        className="hidden"
        aria-label="Choose study file from system"
      />

      {/* ChatGPT-Style History Sidebar */}
      <aside className="w-64 md:w-72 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16] flex flex-col shrink-0">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80">
          <button
            type="button"
            onClick={triggerSystemFilePicker}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Analyzing File...' : 'Upload File'}</span>
          </button>
        </div>

        <div className="px-3.5 pt-3 pb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <History className="w-3 h-3" />
          <span>Saved History</span>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {loading ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 p-4 text-center">Loading history...</p>
          ) : documents.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 p-4 text-center leading-relaxed">
              No files uploaded yet. Click Upload File to analyze your notes.
            </p>
          ) : (
            documents.map((doc) => {
              const isSelected = doc.id === selectedDoc?.id;
              const topicCount = doc.topics?.length || 0;
              const msgCount = doc.messages?.length || 0;

              return (
                <div
                  key={doc.id}
                  className={`group flex items-center justify-between rounded-xl text-xs transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-900 dark:text-white font-medium shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setErrorMsg(null);
                    }}
                    className="flex items-center gap-2.5 min-w-0 flex-1 p-2.5 pr-1 text-left"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{doc.title}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        {topicCount > 0 ? `${topicCount} topics` : doc.fileName}
                        {msgCount > 0 ? ` · ${msgCount} Q&A` : ''}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-2 text-slate-400 hover:text-rose-500 transition-opacity shrink-0"
                    title={`Delete ${doc.title}`}
                    aria-label={`Delete ${doc.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Analysis & Follow-Up Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0b0f19] relative min-w-0">
        {/* Header Bar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                PDF Notes Assistant
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Upload any PDF or study file to get a topic-by-topic learning guide & saved Q&A history
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={triggerSystemFilePicker}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-xs font-semibold transition-colors shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Choose File</span>
          </button>
        </div>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {errorMsg && (
            <div className="max-w-4xl mx-auto flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {uploading && (
            <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-500/30 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-600/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Analyzing "{uploadingFileName}"...
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Reading your file, breaking down each topic, and generating your step-by-step learning plan.
                </p>
              </div>
            </div>
          )}

          {!selectedDoc && !uploading ? (
            <div className="max-w-2xl mx-auto py-10">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`p-10 rounded-2xl border-2 border-dashed text-center space-y-5 transition-all ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30'
                    : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
                  <Upload className="w-7 h-7 text-white" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Upload Study File from Your System
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Choose any PDF lecture slide, textbook chapter, or study notes file (.pdf, .txt, .md). Gemini will analyze it, break down every topic, and show you step by step how to learn each one.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={triggerSystemFilePicker}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload File from Computer</span>
                </button>
              </div>
            </div>
          ) : selectedDoc ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Document Summary Header Card */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{selectedDoc.fileName}</span>
                    <span>·</span>
                    <span>{Math.max(1, Math.round(selectedDoc.fileSize / 1024))} KB</span>
                  </span>
                  {totalMinutes > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                      Est. Total Study Time: {totalMinutes} min
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedDoc.title}</h3>

                {(selectedDoc.overview || selectedDoc.summary) && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedDoc.overview || selectedDoc.summary}
                  </p>
                )}
              </div>

              {/* Topic-by-Topic Learning Breakdown */}
              {selectedDoc.topics && selectedDoc.topics.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Topic-by-Topic Learning Breakdown ({selectedDoc.topics.length} Topics)</span>
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {selectedDoc.topics.map((topic, idx) => {
                      const isExpanded = expandedTopics[topic.id] !== false;
                      return (
                        <div
                          key={topic.id}
                          className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => toggleTopic(topic.id)}
                            className="w-full p-4 md:p-5 flex items-start justify-between gap-4 text-left hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                  Topic {idx + 1}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                    difficultyStyles[topic.difficulty] || difficultyStyles.Intermediate
                                  }`}
                                >
                                  {topic.difficulty}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {topic.estimatedMinutes} min
                                </span>
                              </div>
                              <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                                {topic.title}
                              </h5>
                              {topic.summary && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {topic.summary}
                                </p>
                              )}
                            </div>
                            <span className="text-slate-400 mt-1 shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="px-4 md:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Key Concepts */}
                              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/70 space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                                  <span>Key Concepts to Master</span>
                                </p>
                                <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                  {topic.keyConcepts.map((concept, cIdx) => (
                                    <li key={cIdx} className="flex items-start gap-2">
                                      <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
                                      <span>{concept}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* How to Learn Step-by-Step */}
                              <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-500/20 space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>How to Learn This Topic</span>
                                </p>
                                <ol className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                                  {topic.howToLearn.map((step, sIdx) => (
                                    <li key={sIdx} className="flex items-start gap-2">
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                                        {sIdx + 1}.
                                      </span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              {/* Practice Tip */}
                              {topic.practiceTip && (
                                <div className="md:col-span-2 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-bold">Practice Check: </span>
                                    <span>{topic.practiceTip}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Saved Q&A Follow-Up Conversation History */}
              {((selectedDoc.messages && selectedDoc.messages.length > 0) || querying) && (
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Follow-Up Q&A History
                  </h4>

                  <div className="space-y-4">
                    {(selectedDoc.messages || []).map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            msg.sender === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-purple-100 dark:bg-purple-600/30 border border-purple-200 dark:border-purple-500/50 text-purple-700 dark:text-purple-300'
                          }`}
                        >
                          {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        <div
                          className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                            msg.sender === 'user'
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 shadow-sm'
                          }`}
                        >
                          {msg.sender === 'assistant' ? (
                            <FormattedMessage content={msg.content} />
                          ) : (
                            <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                          )}

                          {msg.sender === 'assistant' && msg.references && msg.references.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Bookmark className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                                <span>Document Excerpts</span>
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {msg.references.map((ref, rIdx) => (
                                  <div
                                    key={rIdx}
                                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400"
                                  >
                                    <span className="font-semibold text-cyan-700 dark:text-cyan-400 block mb-0.5">
                                      {ref.pageNumber ? `Section ${ref.pageNumber}` : `Excerpt #${rIdx + 1}`}
                                    </span>
                                    <span className="italic line-clamp-2">"{ref.snippet}"</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {querying && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-600/30 border border-purple-200 dark:border-purple-500/50 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                          <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
                          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.4s]" />
                          <span className="ml-1">Analyzing document for your answer...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          ) : null}
        </div>

        {/* Sticky Bottom ChatGPT-Style Follow-Up Input */}
        {selectedDoc && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16]">
            <form onSubmit={handleAskQuestion} className="flex items-center gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`Ask a follow-up question about "${selectedDoc.title}"...`}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
              />
              <button
                type="submit"
                disabled={!question.trim() || querying}
                className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md transition-all shrink-0"
                title="Ask about this document"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
