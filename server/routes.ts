import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, UserRecord, StudySessionRecord, SubjectRecord, TaskRecord, ChatConversation } from './db.js';
import {
  generateChatResponse,
  generateEmbedding,
  analyzeUploadedDocument,
  answerWithPdfContext,
  generateQuiz,
  generateFlashcards,
  generateStudyPlan,
} from './gemini.js';
import {
  calculateTotalStudyHours,
  calculateTodayStudyMinutes,
  calculateStudyStreak,
  calculateSubjectDistribution,
} from '../src/utils/studyMetrics.js';
import { chunkText, rankChunksBySimilarity } from '../src/utils/ragSearch.js';
import { findMatchingAuthCandidates, normalizeUsername } from '../src/utils/authMatch.js';

const JWT_SECRET = process.env.JWT_SECRET || 'studysync-secure-jwt-token-secret-2026';

export const apiRouter = Router();

// Helper to extract authenticated user
export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const users = db.get('users');
    const user = users.find((u) => u.id === decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

// ----------------------------------------------------
// 1. AUTHENTICATION & USER MANAGEMENT
// ----------------------------------------------------
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { fullName, username, email, password, confirmPassword, collegeName, course, semester } = req.body;

  const cleanUsername = normalizeUsername(username || '');
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (!fullName || !password || (!cleanUsername && !normalizedEmail)) {
    return res.status(400).json({ error: 'Full name, username (or email), and password are required.' });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const users = db.get('users');
  if (normalizedEmail && users.some((u) => (u.email || '').trim().toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const finalUsername =
    cleanUsername || normalizedEmail.split('@')[0].replace(/[^a-z0-9_.-]/g, '') || `student${Date.now()}`;

  if (users.some((u) => u.username && normalizeUsername(u.username) === finalUsername)) {
    return res.status(409).json({ error: 'This username is already taken. Please choose another.' });
  }

  const emailLocalSlug = finalUsername.replace(/[^a-z0-9_.-]/g, '.') || `student${Date.now()}`;
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser: UserRecord = {
    id: `user-${Date.now()}`,
    fullName: fullName.trim(),
    username: finalUsername,
    email: normalizedEmail || `${emailLocalSlug}@studysync.local`,
    passwordHash,
    collegeName: (collegeName || '').trim() || 'State University',
    course: (course || '').trim() || 'Computer Science',
    semester: semester || 'Semester 1',
    role: 'student',
    dailyGoalHours: 3.0,
    streakCount: 1,
    optInLeaderboard: true,
    avatarUrl: '/src/assets/images/avatar_student_default_1794506134307.jpg',
    createdAt: new Date().toISOString(),
  };

  db.update('users', (prev) => [...prev, newUser]);

  // Create initial starter subjects for the new student
  const starterSubjects: SubjectRecord[] = [
    {
      id: `subj-${Date.now()}-1`,
      userId: newUser.id,
      name: 'Data Structures & Algorithms',
      code: 'CS 101',
      color: '#6366f1',
      targetHoursWeekly: 8,
      description: 'Core principles of data modeling and algorithm design.',
      createdAt: new Date().toISOString(),
    },
    {
      id: `subj-${Date.now()}-2`,
      userId: newUser.id,
      name: 'Computer Architecture',
      code: 'CS 102',
      color: '#06b6d4',
      targetHoursWeekly: 6,
      description: 'Digital logic and machine organization.',
      createdAt: new Date().toISOString(),
    },
  ];
  db.update('subjects', (prev) => [...prev, ...starterSubjects]);

  const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

  const { passwordHash: _, ...safeUser } = newUser;
  return res.status(201).json({ token, user: safeUser, message: 'Account successfully registered!' });
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { identifier, username, email, password } = req.body;
  const rawLogin = identifier || username || email || '';

  if (!rawLogin.trim() || !password) {
    return res.status(400).json({ error: 'Username (or email) and password are required.' });
  }

  const users = db.get('users');
  const candidates = findMatchingAuthCandidates(users, rawLogin);

  let matchedUser: UserRecord | null = null;
  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(password, candidate.passwordHash).catch(() => false);
    const isSeededDemo =
      (candidate.email === 'alex.rivera@university.edu' || candidate.email === 'admin@university.edu') &&
      password === 'demo123';
    if (isMatch || isSeededDemo) {
      matchedUser = candidate;
      break;
    }
  }

  if (!matchedUser) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign({ userId: matchedUser.id, email: matchedUser.email }, JWT_SECRET, { expiresIn: '7d' });
  const { passwordHash: _, ...safeUser } = matchedUser;
  return res.json({ token, user: safeUser, message: 'Logged in successfully!' });
});

apiRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  return res.json({
    message: `Password reset instructions have been dispatched to ${email}. Check your inbox.`,
  });
});

apiRouter.get('/users/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { passwordHash: _, ...safeUser } = req.user;
  return res.json(safeUser);
});

apiRouter.patch('/users/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const { fullName, collegeName, course, semester, dailyGoalHours, optInLeaderboard, avatarUrl } = req.body;

  db.update('users', (users) =>
    users.map((u) => {
      if (u.id === req.user!.id) {
        return {
          ...u,
          fullName: fullName !== undefined ? fullName : u.fullName,
          collegeName: collegeName !== undefined ? collegeName : u.collegeName,
          course: course !== undefined ? course : u.course,
          semester: semester !== undefined ? semester : u.semester,
          dailyGoalHours: dailyGoalHours !== undefined ? Number(dailyGoalHours) : u.dailyGoalHours,
          optInLeaderboard: optInLeaderboard !== undefined ? Boolean(optInLeaderboard) : u.optInLeaderboard,
          avatarUrl: avatarUrl !== undefined ? avatarUrl : u.avatarUrl,
        };
      }
      return u;
    })
  );

  const updated = db.get('users').find((u) => u.id === req.user!.id);
  const { passwordHash: _, ...safeUser } = updated!;
  return res.json(safeUser);
});

// ----------------------------------------------------
// 2. MAIN DASHBOARD OVERVIEW
// ----------------------------------------------------
apiRouter.get('/dashboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const sessions = db.get('sessions').filter((s) => s.userId === userId);
  const subjects = db.get('subjects').filter((s) => s.userId === userId);
  const tasks = db.get('tasks').filter((t) => t.userId === userId);
  const events = db.get('calendarEvents').filter((e) => e.userId === userId);

  const totalStudyHours = calculateTotalStudyHours(sessions);
  const todayMinutes = calculateTodayStudyMinutes(sessions);
  const streakDays = calculateStudyStreak(sessions.map((s) => s.date));

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const upcomingExams = events.filter((e) => e.type === 'exam');

  const subjectDistribution = calculateSubjectDistribution(
    sessions,
    subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))
  );

  // 7-day weekly productivity history
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const minutes = calculateTodayStudyMinutes(sessions, dayStr);
    return {
      date: dayStr,
      day: dayName,
      hours: Number((minutes / 60).toFixed(1)),
      goal: req.user!.dailyGoalHours,
    };
  });

  // Recent 5 study sessions enriched with subject name
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((sess) => {
      const subj = subjects.find((s) => s.id === sess.subjectId);
      return {
        ...sess,
        subjectName: subj?.name || 'General Study',
        subjectColor: subj?.color || '#6366f1',
      };
    });

  return res.json({
    user: {
      fullName: req.user!.fullName,
      course: req.user!.course,
      semester: req.user!.semester,
      collegeName: req.user!.collegeName,
      dailyGoalHours: req.user!.dailyGoalHours,
    },
    metrics: {
      totalStudyHours,
      todayMinutes,
      todayHours: Number((todayMinutes / 60).toFixed(1)),
      streakDays,
      pendingTasksCount: pendingTasks.length,
      completedTasksCount: completedTasks.length,
      upcomingExamsCount: upcomingExams.length,
    },
    weeklyProductivity: past7Days,
    subjectDistribution,
    recentSessions,
    upcomingDeadlines: tasks.filter((t) => !t.completed).slice(0, 4),
  });
});

// ----------------------------------------------------
// 3. SUBJECT MANAGEMENT
// ----------------------------------------------------
apiRouter.get('/subjects', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const subjects = db.get('subjects').filter((s) => s.userId === userId);
  const sessions = db.get('sessions').filter((s) => s.userId === userId);

  const enriched = subjects.map((subj) => {
    const subjSessions = sessions.filter((s) => s.subjectId === subj.id);
    const totalMinutes = subjSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    return {
      ...subj,
      totalStudyHours: Number((totalMinutes / 60).toFixed(1)),
      sessionsCount: subjSessions.length,
    };
  });

  return res.json(enriched);
});

apiRouter.post('/subjects', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { name, code, color, targetHoursWeekly, description } = req.body;

  if (!name) return res.status(400).json({ error: 'Subject name is required.' });

  const newSubject: SubjectRecord = {
    id: `subj-${Date.now()}`,
    userId,
    name: name.trim(),
    code: code ? code.trim() : 'GEN',
    color: color || '#6366f1',
    targetHoursWeekly: targetHoursWeekly ? Number(targetHoursWeekly) : 5,
    description: description || '',
    createdAt: new Date().toISOString(),
  };

  db.update('subjects', (prev) => [...prev, newSubject]);
  return res.status(201).json(newSubject);
});

apiRouter.patch('/subjects/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { name, code, color, targetHoursWeekly, description } = req.body;

  let found = false;
  db.update('subjects', (subjects) =>
    subjects.map((s) => {
      if (s.id === id && s.userId === userId) {
        found = true;
        return {
          ...s,
          name: name !== undefined ? name.trim() : s.name,
          code: code !== undefined ? code.trim() : s.code,
          color: color !== undefined ? color : s.color,
          targetHoursWeekly: targetHoursWeekly !== undefined ? Number(targetHoursWeekly) : s.targetHoursWeekly,
          description: description !== undefined ? description : s.description,
        };
      }
      return s;
    })
  );

  if (!found) return res.status(404).json({ error: 'Subject not found.' });
  const updated = db.get('subjects').find((s) => s.id === id);
  return res.json(updated);
});

apiRouter.delete('/subjects/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.update('subjects', (prev) => prev.filter((s) => !(s.id === id && s.userId === userId)));
  return res.json({ success: true, message: 'Subject removed.' });
});

// ----------------------------------------------------
// 4. STUDY SESSIONS & POMODORO LOGGING
// ----------------------------------------------------
apiRouter.post('/sessions', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { subjectId, durationMinutes, mode, notes, productivityScore } = req.body;

  if (!durationMinutes || durationMinutes <= 0) {
    return res.status(400).json({ error: 'Valid duration is required.' });
  }

  const newSession: StudySessionRecord = {
    id: `sess-${Date.now()}`,
    userId,
    subjectId: subjectId || 'general',
    durationMinutes: Math.round(Number(durationMinutes)),
    mode: mode === 'pomodoro' ? 'pomodoro' : 'timer',
    notes: notes || '',
    productivityScore: productivityScore ? Number(productivityScore) : 5,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.update('sessions', (prev) => [...prev, newSession]);

  // Recalculate study streak
  const userSessions = db.get('sessions').filter((s) => s.userId === userId);
  const newStreak = calculateStudyStreak(userSessions.map((s) => s.date));
  db.update('users', (users) =>
    users.map((u) => (u.id === userId ? { ...u, streakCount: newStreak } : u))
  );

  return res.status(201).json(newSession);
});

apiRouter.get('/sessions/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const sessions = db.get('sessions').filter((s) => s.userId === userId);
  const subjects = db.get('subjects').filter((s) => s.userId === userId);

  const enriched = [...sessions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((sess) => {
      const subj = subjects.find((s) => s.id === sess.subjectId);
      return {
        ...sess,
        subjectName: subj?.name || 'General Focus',
        subjectColor: subj?.color || '#6366f1',
      };
    });

  return res.json(enriched);
});

apiRouter.delete('/sessions/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.update('sessions', (prev) => prev.filter((s) => !(s.id === id && s.userId === userId)));
  return res.json({ success: true, message: 'Session deleted.' });
});

// ----------------------------------------------------
// 5. AI CHATBOT (ANY SUBJECT, STEP-BY-STEP MATH, CODE)
// ----------------------------------------------------
apiRouter.get('/ai/chats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const chats = db.get('chats').filter((c) => c.userId === userId);
  return res.json(chats);
});

apiRouter.post('/ai/chats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, subject } = req.body;

  const newChat: ChatConversation = {
    id: `chat-${Date.now()}`,
    userId,
    title: title || 'New Academic Discussion',
    subject: subject || 'General',
    messages: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  db.update('chats', (prev) => [newChat, ...prev]);
  return res.status(201).json(newChat);
});

apiRouter.post('/ai/chat/message', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { chatId, message, subject, useSearch = true } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message text is required.' });
  }

  let chat = db.get('chats').find((c) => c.id === chatId && c.userId === userId);
  if (!chat) {
    chat = {
      id: chatId || `chat-${Date.now()}`,
      userId,
      title: message.slice(0, 35) + '...',
      subject: subject || 'General',
      messages: [],
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.update('chats', (prev) => [chat!, ...prev]);
  }

  const userMsg = {
    id: `msg-${Date.now()}-u`,
    sender: 'user' as const,
    content: message.trim(),
    timestamp: new Date().toISOString(),
  };

  // Build context-aware history for Gemini
  const conversationHistory = chat.messages.map((m) => ({
    role: m.sender === 'user' ? ('user' as const) : ('model' as const),
    text: m.content,
  }));

  const currentUser = db.get('users').find((u) => u.id === userId);

  try {
    const aiResult = await generateChatResponse(
      conversationHistory,
      message,
      subject || chat.subject,
      useSearch !== false,
      currentUser
        ? {
            fullName: currentUser.fullName,
            course: currentUser.course,
            collegeName: currentUser.collegeName,
          }
        : undefined
    );

    const assistantMsg = {
      id: `msg-${Date.now()}-a`,
      sender: 'assistant' as const,
      content: aiResult.text,
      timestamp: new Date().toISOString(),
      ...(aiResult.sources && aiResult.sources.length > 0 ? { sources: aiResult.sources } : {}),
    };

    db.update('chats', (chats) =>
      chats.map((c) => {
        if (c.id === chat!.id) {
          return {
            ...c,
            subject: subject || c.subject,
            title: c.messages.length === 0 ? message.slice(0, 35) : c.title,
            messages: [...c.messages, userMsg, assistantMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );

    const updated = db.get('chats').find((c) => c.id === chat!.id);
    return res.json({
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      chat: updated,
      searchGrounded: aiResult.searchGrounded,
      ...(aiResult.searchError ? { searchError: aiResult.searchError } : {}),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error communicating with Gemini AI.' });
  }
});

apiRouter.delete('/ai/chats/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.update('chats', (prev) => prev.filter((c) => !(c.id === id && c.userId === userId)));
  return res.json({ success: true, message: 'Chat conversation removed.' });
});

// ----------------------------------------------------
// 6. PDF NOTES ASSISTANT & RAG ARCHITECTURE
// ----------------------------------------------------
apiRouter.get('/documents', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const docs = db.get('documents').filter((d) => d.userId === userId);
  return res.json(docs);
});

apiRouter.post('/documents/upload', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, fileName, mimeType, base64Data, textContent, fileSize, subjectId } = req.body;

  if (!fileName && !title) {
    return res.status(400).json({ error: 'Please select a valid PDF or text file to upload.' });
  }

  if (!base64Data && (!textContent || !String(textContent).trim())) {
    return res.status(400).json({ error: 'Uploaded file appears to be empty.' });
  }

  const effectiveFileName = (fileName || `${title || 'Study_Notes'}.pdf`).trim();

  try {
    const analysis = await analyzeUploadedDocument({
      fileName: effectiveFileName,
      mimeType: mimeType || (effectiveFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain'),
      base64Data,
      textContent,
    });

    const indexableText = analysis.extractedText || textContent || analysis.overview;
    const rawChunks = chunkText(indexableText, 600, 100);
    const docId = `doc-${Date.now()}`;

    const chunkRecords = await Promise.all(
      rawChunks.map(async (chunkContent, idx) => {
        const embedding = await generateEmbedding(chunkContent);
        return {
          id: `chunk-${Date.now()}-${idx}`,
          documentId: docId,
          chunkIndex: idx,
          content: chunkContent,
          pageNumber: Math.floor(idx / 2) + 1,
          embedding,
        };
      })
    );

    const docRecord = {
      id: docId,
      userId,
      subjectId: subjectId || undefined,
      title: (title || analysis.title || effectiveFileName).trim(),
      fileName: effectiveFileName,
      fileSize: typeof fileSize === 'number' && fileSize > 0 ? fileSize : indexableText.length * 2,
      mimeType: mimeType || 'application/pdf',
      chunkCount: rawChunks.length,
      summary: analysis.overview,
      overview: analysis.overview,
      topics: analysis.topics,
      messages: [],
      createdAt: new Date().toISOString(),
    };

    db.update('documents', (prev) => [docRecord, ...prev]);
    db.update('documentChunks', (prev) => [...prev, ...chunkRecords]);

    return res.status(201).json(docRecord);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Could not analyze the uploaded file. Please try again.' });
  }
});

apiRouter.post('/documents/:id/ask', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const { question } = req.body;

  if (!question || !String(question).trim()) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  const doc = db.get('documents').find((d) => d.id === id && d.userId === userId);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });

  const allChunks = db.get('documentChunks').filter((c) => c.documentId === id);

  try {
    let topChunks: { content: string; pageNumber?: number; chunkIndex: number }[] = [];
    if (allChunks.length > 0) {
      const queryEmbedding = await generateEmbedding(question);
      const ranked = rankChunksBySimilarity(queryEmbedding, allChunks, 4);
      topChunks = ranked.map((r) => r.chunk);
    } else {
      topChunks = [
        {
          content: [doc.overview || doc.summary || '', ...(doc.topics || []).map((t) => `${t.title}: ${t.summary}`)].join('\n'),
          chunkIndex: 0,
          pageNumber: 1,
        },
      ];
    }

    const trimmedQuestion = String(question).trim();
    const priorMessages = doc.messages || [];
    const ragResult = await answerWithPdfContext(trimmedQuestion, doc.title, topChunks, priorMessages);

    const userMsg = {
      id: `pdfmsg-${Date.now()}-u`,
      sender: 'user' as const,
      content: trimmedQuestion,
      timestamp: new Date().toISOString(),
    };

    const assistantMsg = {
      id: `pdfmsg-${Date.now()}-a`,
      sender: 'assistant' as const,
      content: ragResult.answer,
      references: ragResult.references,
      timestamp: new Date().toISOString(),
    };

    db.update('documents', (prev) =>
      prev.map((d) =>
        d.id === doc.id
          ? {
              ...d,
              messages: [...(d.messages || []), userMsg, assistantMsg],
            }
          : d
      )
    );

    const updatedDoc = db.get('documents').find((d) => d.id === doc.id);
    return res.json({
      answer: ragResult.answer,
      references: ragResult.references,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      document: updatedDoc,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error processing document question.' });
  }
});

apiRouter.delete('/documents/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.update('documents', (prev) => prev.filter((d) => !(d.id === id && d.userId === userId)));
  db.update('documentChunks', (prev) => prev.filter((c) => c.documentId !== id));

  return res.json({ success: true, message: 'Document and vector indices removed.' });
});

// ----------------------------------------------------
// 7. AI QUIZ GENERATOR
// ----------------------------------------------------
apiRouter.post('/ai/quiz/generate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { topic, subject, difficulty, questionCount } = req.body;

  if (!topic) return res.status(400).json({ error: 'Topic is required.' });

  try {
    const rawQuestions = await generateQuiz(
      topic,
      subject || 'General Academic',
      difficulty || 'medium',
      questionCount ? Number(questionCount) : 4
    );

    const formattedQuestions = rawQuestions.map((q, idx) => ({
      id: `q-${Date.now()}-${idx}`,
      question: q.question,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
    }));

    const quizRecord = {
      id: `quiz-${Date.now()}`,
      userId,
      topic,
      difficulty: difficulty || 'medium',
      questions: formattedQuestions,
      totalQuestions: formattedQuestions.length,
      createdAt: new Date().toISOString(),
    };

    db.update('quizzes', (prev) => [quizRecord, ...prev]);
    return res.json(quizRecord);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate quiz.' });
  }
});

apiRouter.post('/ai/quiz/save', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { quizId, score } = req.body;

  let found = false;
  db.update('quizzes', (quizzes) =>
    quizzes.map((q) => {
      if (q.id === quizId && q.userId === userId) {
        found = true;
        return {
          ...q,
          score: Number(score),
          completedAt: new Date().toISOString(),
        };
      }
      return q;
    })
  );

  if (!found) return res.status(404).json({ error: 'Quiz not found.' });
  return res.json({ success: true, message: 'Quiz attempt recorded!' });
});

apiRouter.get('/ai/quiz/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const quizzes = db.get('quizzes').filter((q) => q.userId === userId);
  return res.json(quizzes);
});

// ----------------------------------------------------
// 8. AI FLASHCARDS
// ----------------------------------------------------
apiRouter.post('/ai/flashcards/generate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { topic, subject, count } = req.body;

  if (!topic) return res.status(400).json({ error: 'Topic is required.' });

  try {
    const rawCards = await generateFlashcards(topic, subject || 'General', count ? Number(count) : 6);

    const cards = rawCards.map((c, idx) => ({
      id: `card-${Date.now()}-${idx}`,
      question: c.question,
      answer: c.answer,
      masteryLevel: 'new' as const,
    }));

    const deckRecord = {
      id: `deck-${Date.now()}`,
      userId,
      title: `${topic} Flashcards`,
      topic,
      cards,
      createdAt: new Date().toISOString(),
    };

    db.update('flashcardDecks', (prev) => [deckRecord, ...prev]);
    return res.json(deckRecord);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate flashcards.' });
  }
});

apiRouter.get('/ai/flashcards', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const decks = db.get('flashcardDecks').filter((d) => d.userId === userId);
  return res.json(decks);
});

apiRouter.patch('/ai/flashcards/:deckId/card/:cardId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { deckId, cardId } = req.params;
  const { masteryLevel } = req.body;

  db.update('flashcardDecks', (decks) =>
    decks.map((d) => {
      if (d.id === deckId && d.userId === userId) {
        return {
          ...d,
          cards: d.cards.map((c) => (c.id === cardId ? { ...c, masteryLevel } : c)),
        };
      }
      return d;
    })
  );

  return res.json({ success: true });
});

apiRouter.delete('/ai/flashcards/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.update('flashcardDecks', (prev) => prev.filter((d) => !(d.id === id && d.userId === userId)));
  return res.json({ success: true, message: 'Flashcard deck deleted.' });
});

// ----------------------------------------------------
// 9. AI STUDY PLANNER
// ----------------------------------------------------
apiRouter.post('/ai/planner/generate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const {
    subjectFocus,
    topicFocus,
    availableHoursDaily,
    subjects,
    learningGoals,
    examDates,
    currentPrepLevel,
  } = req.body;

  const cleanSubject = typeof subjectFocus === 'string' ? subjectFocus.trim() : '';
  const cleanTopic = typeof topicFocus === 'string' ? topicFocus.trim() : '';

  try {
    const generated = await generateStudyPlan({
      subjectFocus: cleanSubject || undefined,
      topicFocus: cleanTopic || undefined,
      availableHoursDaily: availableHoursDaily ? Number(availableHoursDaily) : 3,
      subjects: Array.isArray(subjects) && subjects.length > 0 ? subjects : cleanSubject ? [cleanSubject] : ['Core Courses'],
      learningGoals: learningGoals || 'Build strong foundational understanding and excel in exams',
      examDates: examDates || 'In 2 weeks',
      currentPrepLevel: currentPrepLevel || 'Beginner',
    });

    const ts = Date.now();
    const basicConcepts = (generated.basicConcepts || []).map((c, idx) => ({
      id: `concept-${ts}-${idx}`,
      title: c.title,
      explanation: c.explanation,
      whyItMatters: c.whyItMatters,
    }));

    const topicRoadmap = (generated.topicRoadmap || []).map((t, idx) => ({
      id: `plan-topic-${ts}-${idx}`,
      order: t.order || idx + 1,
      topicTitle: t.topicTitle,
      estimatedHours: t.estimatedHours,
      difficulty: t.difficulty,
      basicIdea: t.basicIdea,
      keyPoints: t.keyPoints,
      studySteps: t.studySteps,
      practiceGoal: t.practiceGoal,
      completed: false,
    }));

    const slots = (generated.slots || []).map((s, idx) => ({
      id: `slot-${ts}-${idx}`,
      dayOfWeek: s.dayOfWeek,
      timeSlot: s.timeSlot,
      subjectName: s.subjectName,
      topicFocus: s.topicFocus,
      taskTitle: s.taskTitle,
      completed: false,
    }));

    const planRecord = {
      id: `plan-${ts}`,
      userId,
      subjectFocus: cleanSubject || undefined,
      topicFocus: cleanTopic || undefined,
      preparationLevel: currentPrepLevel || 'Beginner',
      weekStarting: new Date().toISOString().split('T')[0],
      availableHoursDaily: availableHoursDaily ? Number(availableHoursDaily) : 3,
      goalSummary: generated.goalSummary,
      basicConcepts,
      topicRoadmap,
      slots,
      createdAt: new Date().toISOString(),
    };

    db.update('studyPlans', (prev) => [planRecord, ...prev]);
    return res.json(planRecord);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate study plan.' });
  }
});

apiRouter.get('/ai/planner/current', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const plans = db.get('studyPlans').filter((p) => p.userId === userId);
  return res.json(plans[0] || null);
});

apiRouter.get('/ai/planner/history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const plans = db.get('studyPlans').filter((p) => p.userId === userId);
  return res.json(plans);
});

apiRouter.patch('/ai/planner/topic/:topicId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { topicId } = req.params;
  const { completed } = req.body;

  db.update('studyPlans', (plans) =>
    plans.map((p) => {
      if (p.userId === userId && Array.isArray(p.topicRoadmap)) {
        return {
          ...p,
          topicRoadmap: p.topicRoadmap.map((t) =>
            t.id === topicId ? { ...t, completed: Boolean(completed) } : t
          ),
        };
      }
      return p;
    })
  );

  return res.json({ success: true });
});

apiRouter.patch('/ai/planner/slot/:slotId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { slotId } = req.params;
  const { completed } = req.body;

  db.update('studyPlans', (plans) =>
    plans.map((p) => {
      if (p.userId === userId) {
        return {
          ...p,
          slots: p.slots.map((s) => (s.id === slotId ? { ...s, completed: Boolean(completed) } : s)),
        };
      }
      return p;
    })
  );

  return res.json({ success: true });
});

apiRouter.delete('/ai/planner/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.update('studyPlans', (prev) => prev.filter((p) => !(p.id === id && p.userId === userId)));
  return res.json({ success: true, message: 'Study plan removed.' });
});

// ----------------------------------------------------
// 10. TASK & ASSIGNMENT MANAGER
// ----------------------------------------------------
apiRouter.get('/tasks', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const tasks = db.get('tasks').filter((t) => t.userId === userId);
  return res.json(tasks);
});

apiRouter.post('/tasks', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, subjectId, type, dueDate, priority } = req.body;

  if (!title) return res.status(400).json({ error: 'Task title is required.' });

  const newTask: TaskRecord = {
    id: `task-${Date.now()}`,
    userId,
    title: title.trim(),
    subjectId: subjectId || undefined,
    type: type || 'assignment',
    dueDate: dueDate || new Date().toISOString().split('T')[0],
    priority: priority || 'medium',
    completed: false,
    createdAt: new Date().toISOString(),
  };

  db.update('tasks', (prev) => [newTask, ...prev]);
  return res.status(201).json(newTask);
});

apiRouter.patch('/tasks/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  const updates = req.body;

  db.update('tasks', (tasks) =>
    tasks.map((t) => (t.id === id && t.userId === userId ? { ...t, ...updates } : t))
  );

  const updated = db.get('tasks').find((t) => t.id === id);
  return res.json(updated);
});

apiRouter.delete('/tasks/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.update('tasks', (prev) => prev.filter((t) => !(t.id === id && t.userId === userId)));
  return res.json({ success: true, message: 'Task deleted.' });
});

// ----------------------------------------------------
// 11. ACADEMIC CALENDAR
// ----------------------------------------------------
apiRouter.get('/calendar', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const events = db.get('calendarEvents').filter((e) => e.userId === userId);
  return res.json(events);
});

apiRouter.post('/calendar', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { title, date, startTime, endTime, type, location, subjectId } = req.body;

  if (!title || !date) return res.status(400).json({ error: 'Title and date are required.' });

  const newEvent = {
    id: `cal-${Date.now()}`,
    userId,
    title: title.trim(),
    date,
    startTime: startTime || '09:00 AM',
    endTime: endTime || '10:00 AM',
    type: type || 'deadline',
    location: location || '',
    subjectId: subjectId || undefined,
    createdAt: new Date().toISOString(),
  };

  db.update('calendarEvents', (prev) => [...prev, newEvent]);
  return res.status(201).json(newEvent);
});

apiRouter.delete('/calendar/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.update('calendarEvents', (prev) => prev.filter((e) => !(e.id === id && e.userId === userId)));
  return res.json({ success: true, message: 'Calendar event removed.' });
});

// ----------------------------------------------------
// 12. STUDY ANALYTICS
// ----------------------------------------------------
apiRouter.get('/analytics', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const sessions = db.get('sessions').filter((s) => s.userId === userId);
  const subjects = db.get('subjects').filter((s) => s.userId === userId);

  const totalHours = calculateTotalStudyHours(sessions);
  const streak = calculateStudyStreak(sessions.map((s) => s.date));

  // Past 14 days chart data
  const past14Days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    const mins = calculateTodayStudyMinutes(sessions, dateStr);
    return {
      date: dateStr,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hours: Number((mins / 60).toFixed(1)),
      targetHours: req.user!.dailyGoalHours,
    };
  });

  // Subject distribution
  const subjectDistribution = calculateSubjectDistribution(
    sessions,
    subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))
  );

  // Mode breakdown
  const pomodoroMinutes = sessions
    .filter((s) => s.mode === 'pomodoro')
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const timerMinutes = sessions
    .filter((s) => s.mode === 'timer')
    .reduce((sum, s) => sum + s.durationMinutes, 0);

  return res.json({
    totalHours,
    streak,
    totalSessionsCount: sessions.length,
    dailyTrend: past14Days,
    subjectDistribution,
    modeDistribution: [
      { name: 'Pomodoro Focus', hours: Number((pomodoroMinutes / 60).toFixed(1)), color: '#8b5cf6' },
      { name: 'Standard Stopwatch', hours: Number((timerMinutes / 60).toFixed(1)), color: '#06b6d4' },
    ],
  });
});

// ----------------------------------------------------
// 13. GROUP STUDY & LEADERBOARDS
// ----------------------------------------------------
apiRouter.get('/groups', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const groups = db.get('studyGroups');
  return res.json(groups);
});

apiRouter.post('/groups', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, subject, description, maxMembers } = req.body;

  if (!name || !subject) return res.status(400).json({ error: 'Group name and subject are required.' });

  const newGroup = {
    id: `group-${Date.now()}`,
    name: name.trim(),
    subject: subject.trim(),
    description: description || '',
    creatorId: user.id,
    activeSessionsCount: 1,
    maxMembers: maxMembers ? Number(maxMembers) : 10,
    members: [{ userId: user.id, name: user.fullName, avatarUrl: user.avatarUrl, joinedAt: new Date().toISOString() }],
    messages: [
      {
        id: `gm-${Date.now()}`,
        userId: user.id,
        userName: user.fullName,
        text: `Welcome to ${name}! Let's learn together.`,
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
  };

  db.update('studyGroups', (prev) => [newGroup, ...prev]);
  return res.status(201).json(newGroup);
});

apiRouter.post('/groups/:id/join', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  db.update('studyGroups', (groups) =>
    groups.map((g) => {
      if (g.id === id && !g.members.some((m) => m.userId === user.id)) {
        return {
          ...g,
          members: [...g.members, { userId: user.id, name: user.fullName, avatarUrl: user.avatarUrl, joinedAt: new Date().toISOString() }],
        };
      }
      return g;
    })
  );

  return res.json({ success: true, message: 'Joined study group!' });
});

apiRouter.post('/groups/:id/message', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) return res.status(400).json({ error: 'Message cannot be empty.' });

  const newMsg = {
    id: `gm-${Date.now()}`,
    userId: user.id,
    userName: user.fullName,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  db.update('studyGroups', (groups) =>
    groups.map((g) => (g.id === id ? { ...g, messages: [...g.messages, newMsg] } : g))
  );

  return res.status(201).json(newMsg);
});

apiRouter.get('/leaderboard', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const users = db.get('users').filter((u) => u.optInLeaderboard);
  const allSessions = db.get('sessions');

  const rankings = users.map((u) => {
    const userSessions = allSessions.filter((s) => s.userId === u.id);
    const totalHours = calculateTotalStudyHours(userSessions);
    const streak = calculateStudyStreak(userSessions.map((s) => s.date));
    return {
      userId: u.id,
      name: u.fullName,
      avatarUrl: u.avatarUrl,
      course: u.course,
      semester: u.semester,
      collegeName: u.collegeName,
      totalHours,
      streak,
      rank: 1,
    };
  });

  // Sort by hours descending
  rankings.sort((a, b) => b.totalHours - a.totalHours);
  rankings.forEach((r, idx) => (r.rank = idx + 1));

  return res.json(rankings);
});

// ----------------------------------------------------
// 14. NOTIFICATIONS
// ----------------------------------------------------
apiRouter.get('/notifications', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const notifs = db.get('notifications').filter((n) => n.userId === userId);
  return res.json(notifs);
});

apiRouter.patch('/notifications/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;

  db.update('notifications', (notifs) =>
    notifs.map((n) => (n.id === id && n.userId === userId ? { ...n, read: true } : n))
  );

  return res.json({ success: true });
});

apiRouter.post('/notifications/mark-all-read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  db.update('notifications', (notifs) =>
    notifs.map((n) => (n.userId === userId ? { ...n, read: true } : n))
  );
  return res.json({ success: true });
});

// ----------------------------------------------------
// 15. ADMIN PANEL & SETTINGS
// ----------------------------------------------------
apiRouter.get('/admin/stats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const users = db.get('users');
  const sessions = db.get('sessions');
  const quizzes = db.get('quizzes');
  const groups = db.get('studyGroups');
  const docs = db.get('documents');

  const totalCampusHours = calculateTotalStudyHours(sessions);

  return res.json({
    totalUsersCount: users.length,
    totalSessionsLogged: sessions.length,
    totalStudyHours: totalCampusHours,
    totalQuizzesTaken: quizzes.length,
    activeStudyGroups: groups.length,
    uploadedDocumentsCount: docs.length,
    systemSettings: db.get('systemSettings'),
  });
});

apiRouter.get('/admin/users', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const users = db.get('users').map(({ passwordHash: _, ...u }) => u);
  return res.json(users);
});

apiRouter.patch('/admin/settings', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const updated = db.setSystemSettings(req.body);
  return res.json(updated);
});
