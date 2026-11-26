export interface User {
  id: string;
  fullName: string;
  username?: string;
  email: string;
  collegeName: string;
  course: string;
  semester: string;
  avatarUrl?: string;
  role: 'student' | 'admin';
  dailyGoalHours: number;
  streakCount: number;
  optInLeaderboard: boolean;
  createdAt: string;
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  code: string;
  color: string;
  targetHoursWeekly: number;
  description?: string;
  totalStudyHours?: number;
  sessionsCount?: number;
  createdAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  subjectName?: string;
  subjectColor?: string;
  durationMinutes: number;
  date: string;
  mode: 'timer' | 'pomodoro';
  notes?: string;
  productivityScore?: number;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  type: 'assignment' | 'exam' | 'project' | 'reading';
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: 'exam' | 'deadline' | 'study_group' | 'lecture';
  location?: string;
  createdAt: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: GroundingSource[];
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  subject?: string;
  messages: ChatMessage[];
  updatedAt: string;
  createdAt: string;
}

export interface PdfTopicBreakdown {
  id: string;
  title: string;
  summary: string;
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  keyConcepts: string[];
  howToLearn: string[];
  practiceTip: string;
}

export interface PdfQaMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  references?: { pageNumber?: number; snippet: string }[];
  timestamp: string;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  chunkCount: number;
  summary?: string;
  overview?: string;
  topics?: PdfTopicBreakdown[];
  messages?: PdfQaMessage[];
  createdAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  userId: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  score?: number;
  totalQuestions: number;
  completedAt?: string;
  createdAt: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  masteryLevel: 'new' | 'hard' | 'medium' | 'easy';
}

export interface FlashcardDeck {
  id: string;
  userId: string;
  title: string;
  topic: string;
  cards: Flashcard[];
  createdAt: string;
}

export interface StudyPlanSlot {
  id: string;
  dayOfWeek: string;
  timeSlot: string;
  subjectName: string;
  topicFocus?: string;
  taskTitle: string;
  completed: boolean;
}

export interface StudyPlanBasicConcept {
  id: string;
  title: string;
  explanation: string;
  whyItMatters: string;
}

export interface StudyPlanTopicStep {
  id: string;
  order: number;
  topicTitle: string;
  estimatedHours: number;
  difficulty: 'Foundational' | 'Intermediate' | 'Advanced';
  basicIdea: string;
  keyPoints: string[];
  studySteps: string[];
  practiceGoal: string;
  completed: boolean;
}

export interface StudyPlan {
  id: string;
  userId: string;
  subjectFocus?: string;
  topicFocus?: string;
  preparationLevel?: string;
  weekStarting: string;
  availableHoursDaily: number;
  goalSummary: string;
  basicConcepts?: StudyPlanBasicConcept[];
  topicRoadmap?: StudyPlanTopicStep[];
  slots: StudyPlanSlot[];
  createdAt: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  description: string;
  creatorId: string;
  members: { userId: string; name: string; avatarUrl?: string; joinedAt: string }[];
  activeSessionsCount: number;
  maxMembers: number;
  messages: { id: string; userId: string; userName: string; text: string; timestamp: string }[];
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'streak' | 'group' | 'achievement';
  read: boolean;
  createdAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  avatarUrl?: string;
  course: string;
  semester: string;
  collegeName: string;
  totalHours: number;
  streak: number;
  rank: number;
}
