import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Sparkles,
  AlertCircle,
  RotateCcw,
  MessageSquare,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { ChatConversation, ChatMessage } from '../types';
import { FormattedMessage } from '../components/FormattedMessage';

const UNIVERSAL_SUGGESTIONS = [
  {
    title: 'Real-Time Google Search',
    prompt: 'What are the biggest AI and technology news stories happening right now?',
  },
  {
    title: 'Live Facts & Current Info',
    prompt: 'What is the latest stable version of React and Node.js available today?',
  },
  {
    title: 'Write & Debug Code',
    prompt: 'Write a clean Python function for binary search and explain its time complexity.',
  },
  {
    title: 'Step-by-Step Math & Concepts',
    prompt: 'Solve the quadratic equation 2x^2 - 7x + 3 = 0 step by step.',
  },
];

export const ChatbotView: React.FC = () => {
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [useSearch, setUseSearch] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadChats = async () => {
    try {
      const chatData = await api.getChats();
      setChats(chatData);
      if (chatData.length > 0 && !activeChatId) {
        setActiveChatId(chatData[0].id);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChatId, loading, errorMsg]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  const handleCreateNewChat = async () => {
    setErrorMsg(null);
    setLastFailedPrompt(null);
    try {
      const newChat = await api.createChat({
        title: 'New Gemini Chat',
        subject: 'General',
      });
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not start a new chat.');
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend ?? inputPrompt).trim();
    if (!prompt || loading) return;

    setInputPrompt('');
    setErrorMsg(null);
    setLastFailedPrompt(null);
    setLoading(true);

    const tempChatId = activeChat?.id || `temp-chat-${Date.now()}`;
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
    };

    // Show user's message immediately (avoid duplicate if retrying same last message)
    if (activeChat) {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== activeChat.id) return c;
          const last = c.messages[c.messages.length - 1];
          if (last && last.sender === 'user' && last.content === prompt) {
            return c;
          }
          return { ...c, messages: [...c.messages, tempUserMsg] };
        })
      );
    } else {
      const optimisticChat: ChatConversation = {
        id: tempChatId,
        userId: 'me',
        title: prompt.slice(0, 35),
        subject: 'General',
        messages: [tempUserMsg],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setChats((prev) => [optimisticChat, ...prev]);
      setActiveChatId(tempChatId);
    }

    try {
      const res = await api.sendChatMessage({
        chatId: activeChat?.id?.startsWith('temp-chat-') ? undefined : activeChat?.id,
        message: prompt,
        subject: 'General',
        useSearch,
      });

      if (res.chat) {
        setChats((prev) => {
          const filtered = prev.filter((c) => c.id !== tempChatId && c.id !== res.chat.id);
          return [res.chat, ...filtered];
        });
        setActiveChatId(res.chat.id);
      }
    } catch (err: any) {
      // Keep conversation clean and show non-blocking inline error with retry
      setErrorMsg(err.message || 'Unable to reach Gemini right now. Please try again.');
      setLastFailedPrompt(prompt);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteChat(id);
      const remaining = chats.filter((c) => c.id !== id);
      setChats(remaining);
      if (activeChatId === id) {
        setActiveChatId(remaining[0]?.id || null);
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-[calc(100vh-57px)] bg-slate-50 dark:bg-[#070b13] overflow-hidden transition-colors">
      {/* Chats Sidebar */}
      <div className="w-60 md:w-68 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16] flex flex-col shrink-0">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80">
          <button
            onClick={handleCreateNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {chats.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 p-4 text-center">No chats yet.</p>
          ) : (
            chats.map((c) => {
              const isActive = c.id === activeChat?.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveChatId(c.id);
                    setErrorMsg(null);
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-colors ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-900 dark:text-white font-medium shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.title || 'New Chat'}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {c.messages.length} messages
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-[#0b0f19] relative min-w-0">
        {/* Clean Header with Google Search Grounding Toggle */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>StudySync Gemini Chatbot</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  Context-Aware
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ask any question — powered by Gemini with live Google Search Grounding
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setUseSearch((prev) => !prev)}
              aria-pressed={useSearch}
              title={
                useSearch
                  ? 'Google Search Grounding is ON (click to switch off)'
                  : 'Google Search Grounding is OFF (click to enable real-time web info)'
              }
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                useSearch
                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Globe className={`w-3.5 h-3.5 ${useSearch ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
              <span>Google Search: {useSearch ? 'ON' : 'OFF'}</span>
            </button>

            {activeChat && activeChat.messages.length > 0 && (
              <button
                onClick={handleCreateNewChat}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New Chat
              </button>
            )}
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {!activeChat || activeChat.messages.length === 0 ? (
            <div className="max-w-2xl mx-auto py-10 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
                <Bot className="w-7 h-7 text-white" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Ask Gemini Anything
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Context-aware chat powered by Google Gemini with real-time Google Search Grounding. Ask about live news, current events, coding, math, science, or follow-up questions.
                </p>
              </div>

              {/* Universal Prompt Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                {UNIVERSAL_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 shadow-sm transition-all text-xs group"
                  >
                    <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {item.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeChat.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 max-w-3xl mx-auto ${
                  msg.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
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
                  className={`relative p-4 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
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

                  {msg.sender === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        <span>Google Search Sources</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-cyan-300 transition-colors max-w-[220px]"
                            title={src.title}
                          >
                            <span className="truncate">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {msg.sender === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="mt-3 flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors pt-2 border-t border-slate-100 dark:border-slate-800/60"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3.5 max-w-3xl mx-auto">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-600/30 border border-purple-200 dark:border-purple-500/50 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1">
                  {useSearch ? 'Searching Google & thinking...' : 'Thinking...'}
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              {lastFailedPrompt && (
                <button
                  type="button"
                  onClick={() => handleSendMessage(lastFailedPrompt)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold shrink-0"
                >
                  <RotateCcw className="w-3 h-3" /> Retry
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Input Box */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#090d16]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 max-w-3xl mx-auto"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask any question — real-time news, live facts, coding, math, or follow-ups..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-sm"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || loading}
              className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shadow-md transition-all shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
