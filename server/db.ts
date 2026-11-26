import fs from 'node:fs';
import path from 'node:path';

// Local persistent JSON database with collections and atomic operations
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface UserRecord {
  id: string;
  fullName: string;
  username?: string;
  email: string;
  passwordHash: string;
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

export interface SubjectRecord {
  id: string;
  userId: string;
  name: string;
  code: string;
  color: string;
  targetHoursWeekly: number;
  description?: string;
  createdAt: string;
}

export interface StudySessionRecord {
  id: string;
  userId: string;
  subjectId: string;
  durationMinutes: number;
  date: string; // ISO date string
  mode: 'timer' | 'pomodoro';
  notes?: string;
  productivityScore?: number; // 1-5
  createdAt: string;
}

export interface TaskRecord {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  type: 'assignment' | 'exam' | 'project' | 'reading';
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  createdAt: string;
}

export interface CalendarEventRecord {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  date: string; // YYYY-MM-DD
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
  codeBlocks?: { language: string; code: string }[];
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

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  pageNumber?: number;
  embedding: number[];
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

export interface QuizRecord {
  id: string;
  userId: string;
  subjectId?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questions: QuizQuestion[];
  score?: number;
  totalQuestions: number;
  completedAt?: string;
  createdAt: string;
}

export interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  masteryLevel: 'new' | 'hard' | 'medium' | 'easy';
}

export interface FlashcardDeckRecord {
  id: string;
  userId: string;
  subjectId?: string;
  title: string;
  topic: string;
  cards: FlashcardItem[];
  createdAt: string;
}

export interface StudyPlanSlot {
  id: string;
  dayOfWeek: string; // Monday, Tuesday, etc.
  timeSlot: string; // 09:00 - 10:30
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

export interface StudyPlanRecord {
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

export interface StudyGroupRecord {
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

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'streak' | 'group' | 'achievement';
  read: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserRecord[];
  subjects: SubjectRecord[];
  sessions: StudySessionRecord[];
  tasks: TaskRecord[];
  calendarEvents: CalendarEventRecord[];
  chats: ChatConversation[];
  documents: DocumentRecord[];
  documentChunks: DocumentChunk[];
  quizzes: QuizRecord[];
  flashcardDecks: FlashcardDeckRecord[];
  studyPlans: StudyPlanRecord[];
  studyGroups: StudyGroupRecord[];
  notifications: NotificationRecord[];
  systemSettings: {
    campusName: string;
    allowRegistration: boolean;
    geminiModel: string;
    maintenanceMode: boolean;
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.load();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Failed reading db.json, initializing fresh store:', err);
      }
    }
    const initial = this.getSeedData();
    this.save(initial);
    return initial;
  }

  private save(data?: DatabaseSchema) {
    try {
      this.ensureDirectory();
      const payload = data || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed writing db.json:', err);
    }
  }

  public get<K extends keyof DatabaseSchema>(collection: K): DatabaseSchema[K] {
    return this.data[collection];
  }

  public update<K extends keyof DatabaseSchema>(collection: K, updater: (items: DatabaseSchema[K]) => DatabaseSchema[K]) {
    this.data[collection] = updater(this.data[collection]);
    this.save();
    return this.data[collection];
  }

  public setSystemSettings(settings: Partial<DatabaseSchema['systemSettings']>) {
    this.data.systemSettings = { ...this.data.systemSettings, ...settings };
    this.save();
    return this.data.systemSettings;
  }

  private getSeedData(): DatabaseSchema {
    const demoUserId = 'demo-student-id';
    const adminUserId = 'admin-user-id';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Dates for recent past sessions
    const d1 = new Date(now.getTime() - 1 * 86400000).toISOString().split('T')[0];
    const d2 = new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0];
    const d3 = new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0];
    const d4 = new Date(now.getTime() - 4 * 86400000).toISOString().split('T')[0];
    const d5 = new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0];

    const users: UserRecord[] = [
      {
        id: demoUserId,
        fullName: 'Alex Rivera',
        email: 'alex.rivera@university.edu',
        passwordHash: '$2a$10$wT70bY66Q4i5VvWz8dFhOeqzKqT9rLgVbJ85C7xH3sD9l6P2Q9yC6', // demo123
        collegeName: 'California Institute of Technology',
        course: 'Computer Science & AI',
        semester: 'Semester 5',
        avatarUrl: '/src/assets/images/avatar_student_default_1794506134307.jpg',
        role: 'student',
        dailyGoalHours: 3.5,
        streakCount: 5,
        optInLeaderboard: true,
        createdAt: new Date(now.getTime() - 30 * 86400000).toISOString()
      },
      {
        id: adminUserId,
        fullName: 'Prof. Marcus Vance',
        email: 'admin@university.edu',
        passwordHash: '$2a$10$wT70bY66Q4i5VvWz8dFhOeqzKqT9rLgVbJ85C7xH3sD9l6P2Q9yC6', // demo123
        collegeName: 'University Academic Council',
        course: 'Academic Administration',
        semester: 'Staff',
        avatarUrl: '/src/assets/images/avatar_student_default_1794506134307.jpg',
        role: 'admin',
        dailyGoalHours: 2.0,
        streakCount: 12,
        optInLeaderboard: false,
        createdAt: new Date(now.getTime() - 60 * 86400000).toISOString()
      },
      {
        id: 'student-2',
        fullName: 'Sophia Chen',
        email: 'sophia.c@university.edu',
        passwordHash: '$2a$10$wT70bY66Q4i5VvWz8dFhOeqzKqT9rLgVbJ85C7xH3sD9l6P2Q9yC6',
        collegeName: 'California Institute of Technology',
        course: 'Data Science',
        semester: 'Semester 5',
        role: 'student',
        dailyGoalHours: 4.0,
        streakCount: 9,
        optInLeaderboard: true,
        createdAt: new Date(now.getTime() - 40 * 86400000).toISOString()
      },
      {
        id: 'student-3',
        fullName: 'Liam Patel',
        email: 'liam.p@university.edu',
        passwordHash: '$2a$10$wT70bY66Q4i5VvWz8dFhOeqzKqT9rLgVbJ85C7xH3sD9l6P2Q9yC6',
        collegeName: 'California Institute of Technology',
        course: 'Electrical Engineering',
        semester: 'Semester 5',
        role: 'student',
        dailyGoalHours: 3.0,
        streakCount: 7,
        optInLeaderboard: true,
        createdAt: new Date(now.getTime() - 25 * 86400000).toISOString()
      }
    ];

    const subjects: SubjectRecord[] = [
      {
        id: 'subj-1',
        userId: demoUserId,
        name: 'Algorithms & Data Structures',
        code: 'CS 301',
        color: '#6366f1', // Indigo
        targetHoursWeekly: 8,
        description: 'Tree structures, graph traversals, dynamic programming, and asymptotic complexity.',
        createdAt: new Date(now.getTime() - 28 * 86400000).toISOString()
      },
      {
        id: 'subj-2',
        userId: demoUserId,
        name: 'Operating Systems & Kernels',
        code: 'CS 340',
        color: '#06b6d4', // Cyan
        targetHoursWeekly: 6,
        description: 'Processes, concurrency, virtual memory paging, and storage subsystems.',
        createdAt: new Date(now.getTime() - 28 * 86400000).toISOString()
      },
      {
        id: 'subj-3',
        userId: demoUserId,
        name: 'Machine Learning Foundations',
        code: 'CS 410',
        color: '#8b5cf6', // Violet
        targetHoursWeekly: 7,
        description: 'Supervised regression, neural networks, backpropagation, and loss surfaces.',
        createdAt: new Date(now.getTime() - 28 * 86400000).toISOString()
      },
      {
        id: 'subj-4',
        userId: demoUserId,
        name: 'Database Architecture & SQL',
        code: 'CS 320',
        color: '#10b981', // Emerald
        targetHoursWeekly: 5,
        description: 'B+ Trees, ACID transactions, WAL logging, and query optimization.',
        createdAt: new Date(now.getTime() - 28 * 86400000).toISOString()
      }
    ];

    const sessions: StudySessionRecord[] = [
      {
        id: 'sess-1',
        userId: demoUserId,
        subjectId: 'subj-1',
        durationMinutes: 90,
        date: `${todayStr}T09:30:00Z`,
        mode: 'pomodoro',
        notes: 'Reviewed Dijkstra and A* pathfinding implementation in C++.',
        productivityScore: 5,
        createdAt: `${todayStr}T11:00:00Z`
      },
      {
        id: 'sess-2',
        userId: demoUserId,
        subjectId: 'subj-3',
        durationMinutes: 60,
        date: `${todayStr}T14:00:00Z`,
        mode: 'timer',
        notes: 'Derived cross-entropy gradient math and softmax temperature scaling.',
        productivityScore: 4,
        createdAt: `${todayStr}T15:00:00Z`
      },
      {
        id: 'sess-3',
        userId: demoUserId,
        subjectId: 'subj-2',
        durationMinutes: 120,
        date: `${d1}T10:00:00Z`,
        mode: 'pomodoro',
        notes: 'Implemented POSIX mutex locks and producer-consumer ring buffer.',
        productivityScore: 5,
        createdAt: `${d1}T12:00:00Z`
      },
      {
        id: 'sess-4',
        userId: demoUserId,
        subjectId: 'subj-4',
        durationMinutes: 75,
        date: `${d2}T15:30:00Z`,
        mode: 'timer',
        notes: 'Analyzed query execution plans and index selectivity on PostgreSQL.',
        productivityScore: 4,
        createdAt: `${d2}T16:45:00Z`
      },
      {
        id: 'sess-5',
        userId: demoUserId,
        subjectId: 'subj-1',
        durationMinutes: 105,
        date: `${d3}T11:00:00Z`,
        mode: 'pomodoro',
        notes: 'Red-Black tree rotations and invariant proof practice problems.',
        productivityScore: 5,
        createdAt: `${d3}T12:45:00Z`
      },
      {
        id: 'sess-6',
        userId: demoUserId,
        subjectId: 'subj-3',
        durationMinutes: 80,
        date: `${d4}T16:00:00Z`,
        mode: 'timer',
        notes: 'Trained convolutional filters for MNIST digits and checked overfitting.',
        productivityScore: 4,
        createdAt: `${d4}T17:20:00Z`
      },
      {
        id: 'sess-7',
        userId: demoUserId,
        subjectId: 'subj-2',
        durationMinutes: 90,
        date: `${d5}T13:00:00Z`,
        mode: 'pomodoro',
        notes: 'Virtual memory page fault handler simulation and LRU cache replacement.',
        productivityScore: 5,
        createdAt: `${d5}T14:30:00Z`
      }
    ];

    const tasks: TaskRecord[] = [
      {
        id: 'task-1',
        userId: demoUserId,
        subjectId: 'subj-1',
        title: 'Problem Set 4: Dynamic Programming & Knapsack',
        type: 'assignment',
        dueDate: new Date(now.getTime() + 2 * 86400000).toISOString().split('T')[0],
        priority: 'high',
        completed: false,
        createdAt: now.toISOString()
      },
      {
        id: 'task-2',
        userId: demoUserId,
        subjectId: 'subj-2',
        title: 'Kernel Lab 2: Multi-threaded Threadpool',
        type: 'project',
        dueDate: new Date(now.getTime() + 4 * 86400000).toISOString().split('T')[0],
        priority: 'high',
        completed: false,
        createdAt: now.toISOString()
      },
      {
        id: 'task-3',
        userId: demoUserId,
        subjectId: 'subj-3',
        title: 'Review Chapter 5: Backprop & Optimization',
        type: 'reading',
        dueDate: new Date(now.getTime() + 1 * 86400000).toISOString().split('T')[0],
        priority: 'medium',
        completed: true,
        createdAt: now.toISOString()
      },
      {
        id: 'task-4',
        userId: demoUserId,
        subjectId: 'subj-4',
        title: 'SQL Schema Normalization Assignment (3NF/BCNF)',
        type: 'assignment',
        dueDate: new Date(now.getTime() + 6 * 86400000).toISOString().split('T')[0],
        priority: 'medium',
        completed: false,
        createdAt: now.toISOString()
      }
    ];

    const calendarEvents: CalendarEventRecord[] = [
      {
        id: 'cal-1',
        userId: demoUserId,
        subjectId: 'subj-1',
        title: 'Midterm Exam: Algorithms & Complexity',
        date: new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0],
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        type: 'exam',
        location: 'Hall B, CS Building',
        createdAt: now.toISOString()
      },
      {
        id: 'cal-2',
        userId: demoUserId,
        subjectId: 'subj-2',
        title: 'OS Lab Demonstration Deadline',
        date: new Date(now.getTime() + 4 * 86400000).toISOString().split('T')[0],
        startTime: '04:00 PM',
        endTime: '05:00 PM',
        type: 'deadline',
        location: 'Lab Room 204',
        createdAt: now.toISOString()
      },
      {
        id: 'cal-3',
        userId: demoUserId,
        subjectId: 'subj-3',
        title: 'Deep Learning Study Jam',
        date: new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0],
        startTime: '06:00 PM',
        endTime: '08:00 PM',
        type: 'study_group',
        location: 'Campus Library 3F',
        createdAt: now.toISOString()
      }
    ];

    const chats: ChatConversation[] = [
      {
        id: 'chat-1',
        userId: demoUserId,
        title: 'Dijkstra vs A* Algorithm Proof',
        subject: 'Algorithms & Data Structures',
        updatedAt: now.toISOString(),
        createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
        messages: [
          {
            id: 'm1',
            sender: 'user',
            content: 'Can you explain the main difference between Dijkstra and A* pathfinding, and when is A* guaranteed to be optimal?',
            timestamp: new Date(now.getTime() - 2 * 86400000).toISOString()
          },
          {
            id: 'm2',
            sender: 'assistant',
            content: `**Dijkstra's Algorithm vs A* Search**

1. **Core Distinction**:
   - **Dijkstra's Algorithm**: Explores paths uniformly in order of their cumulative cost from the start node: $f(n) = g(n)$. It does not use any domain heuristic about where the target node lies.
   - **A* Search**: Guides exploration using both the actual cost so far $g(n)$ plus an estimated heuristic cost to the goal $h(n)$:
   $$f(n) = g(n) + h(n)$$

2. **Optimality Guarantee**:
   A* is mathematically guaranteed to find the shortest path if its heuristic function $h(n)$ satisfies:
   - **Admissibility**: It never overestimates the actual cost to reach the goal ($h(n) \\le h^*(n)$ for all $n$).
   - **Consistency (Monotonicity)**: For any edge $(n, n')$ with weight $c(n, n')$, $h(n) \\le c(n, n') + h(n')$.

When $h(n) = 0$ everywhere, A* degrades precisely to Dijkstra's algorithm.`,
            timestamp: new Date(now.getTime() - 2 * 86400000 + 5000).toISOString()
          }
        ]
      }
    ];

    const documents: DocumentRecord[] = [
      {
        id: 'doc-1',
        userId: demoUserId,
        subjectId: 'subj-1',
        title: 'Lecture 7 - Advanced Trees & Heap Invariants.pdf',
        fileName: 'Lecture_07_Heap_Invariants.pdf',
        fileSize: 1024 * 720,
        chunkCount: 6,
        summary: 'Comprehensive analysis of binary min-heaps, Fibonacci heaps, amortized insertion time, and Dijkstra priority queue integration.',
        createdAt: new Date(now.getTime() - 7 * 86400000).toISOString()
      }
    ];

    const dummyEmbedding = Array.from({ length: 16 }, (_, i) => Math.sin(i + 1) * 0.5);

    const documentChunks: DocumentChunk[] = [
      {
        id: 'chunk-1',
        documentId: 'doc-1',
        chunkIndex: 0,
        content: 'Binary heaps maintain the shape property (complete binary tree) and heap property. In a min-heap, for any given node C, if P is a parent node of C, then the key of P is less than or equal to the key of C.',
        pageNumber: 1,
        embedding: dummyEmbedding
      },
      {
        id: 'chunk-2',
        documentId: 'doc-1',
        chunkIndex: 1,
        content: 'Heap operations: Insert takes O(log n) via sift-up bubbling. Extract-Min takes O(log n) via sift-down sinking. Build-Heap on an unordered array runs in O(n) linear time through bottom-up heapification.',
        pageNumber: 2,
        embedding: dummyEmbedding
      }
    ];

    const quizzes: QuizRecord[] = [
      {
        id: 'quiz-1',
        userId: demoUserId,
        subjectId: 'subj-1',
        topic: 'Binary Heaps and Graph Search',
        difficulty: 'medium',
        totalQuestions: 3,
        score: 3,
        completedAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
        createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
        questions: [
          {
            id: 'q1',
            question: 'What is the time complexity of building a binary heap from an unsorted array of n elements?',
            options: ['O(n log n)', 'O(n)', 'O(log n)', 'O(n^2)'],
            correctOptionIndex: 1,
            explanation: 'Bottom-up heapification satisfies the summation sum(h / 2^h) for h=0 to log n, converging to O(n) linear time.'
          },
          {
            id: 'q2',
            question: 'What condition must a heuristic satisfy for A* graph search to be optimal on a general graph with cycles?',
            options: ['Only admissibility', 'Consistency (monotonicity)', 'Non-negative edge weights only', 'Strictly zero cost'],
            correctOptionIndex: 1,
            explanation: 'On graph search where visited nodes are closed, consistency ensures that when a node is expanded, the path found to it is already optimal.'
          },
          {
            id: 'q3',
            question: 'Which page replacement policy suffers from Belady\'s Anomaly?',
            options: ['LRU (Least Recently Used)', 'FIFO (First-In First-Out)', 'Optimal Page Replacement', 'Clock algorithm'],
            correctOptionIndex: 1,
            explanation: 'FIFO can cause more page faults with more memory frames (Belady\'s anomaly), while stack algorithms like LRU never exhibit this.'
          }
        ]
      }
    ];

    const flashcardDecks: FlashcardDeckRecord[] = [
      {
        id: 'deck-1',
        userId: demoUserId,
        subjectId: 'subj-1',
        title: 'Core Asymptotic Complexities',
        topic: 'Algorithm Time & Space Limits',
        createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
        cards: [
          {
            id: 'c1',
            question: 'What is the average and worst-case time complexity of QuickSelect for the k-th smallest element?',
            answer: 'Average: O(n) with random pivot. Worst-case: O(n^2) if pivot selection repeatedly isolates one element.',
            masteryLevel: 'medium'
          },
          {
            id: 'c2',
            question: 'State the Master Theorem formula for T(n) = a*T(n/b) + f(n).',
            answer: 'Compare f(n) to n^(log_b a). Case 1: polynomial smaller -> O(n^(log_b a)). Case 2: equal -> O(n^(log_b a) * log n). Case 3: polynomial larger and regularity holds -> O(f(n)).',
            masteryLevel: 'easy'
          },
          {
            id: 'c3',
            question: 'Why does Dijkstra fail on graphs with negative edge weights?',
            answer: 'Dijkstra assumes that adding edges to a known path will only increase its total cost (greedy non-decreasing property). A negative edge violates this assumption.',
            masteryLevel: 'hard'
          }
        ]
      }
    ];

    const studyPlans: StudyPlanRecord[] = [
      {
        id: 'plan-1',
        userId: demoUserId,
        weekStarting: todayStr,
        availableHoursDaily: 3.5,
        goalSummary: 'Prepare for CS 301 Midterm and complete Kernel Lab 2 milestone',
        createdAt: now.toISOString(),
        slots: [
          { id: 's1', dayOfWeek: 'Monday', timeSlot: '09:00 - 10:30', subjectName: 'Algorithms & Data Structures', taskTitle: 'Master Theorem & Recurrence Trees', completed: true },
          { id: 's2', dayOfWeek: 'Monday', timeSlot: '16:00 - 18:00', subjectName: 'Operating Systems & Kernels', taskTitle: 'Producer-Consumer Synchronization', completed: true },
          { id: 's3', dayOfWeek: 'Tuesday', timeSlot: '10:00 - 11:30', subjectName: 'Machine Learning', taskTitle: 'Gradient Descent Optimization', completed: false },
          { id: 's4', dayOfWeek: 'Wednesday', timeSlot: '14:00 - 16:00', subjectName: 'Algorithms & Data Structures', taskTitle: 'Graph Theory & Bellman-Ford Practice', completed: false },
          { id: 's5', dayOfWeek: 'Thursday', timeSlot: '09:00 - 11:00', subjectName: 'Operating Systems & Kernels', taskTitle: 'Paging & Memory Management', completed: false }
        ]
      }
    ];

    const studyGroups: StudyGroupRecord[] = [
      {
        id: 'group-1',
        name: 'CS 301 Algorithms Study Squad',
        subject: 'Algorithms & Data Structures',
        description: 'Collaborative problem solving for CS 301. Weekly coding challenges and exam prep.',
        creatorId: demoUserId,
        activeSessionsCount: 3,
        maxMembers: 8,
        members: [
          { userId: demoUserId, name: 'Alex Rivera', avatarUrl: '/src/assets/images/avatar_student_default_1794506134307.jpg', joinedAt: now.toISOString() },
          { userId: 'student-2', name: 'Sophia Chen', joinedAt: now.toISOString() },
          { userId: 'student-3', name: 'Liam Patel', joinedAt: now.toISOString() }
        ],
        messages: [
          { id: 'gm-1', userId: 'student-2', userName: 'Sophia Chen', text: 'Hey squad! Don\'t forget we are solving problem set 4 question 3 together at 5 PM.', timestamp: new Date(now.getTime() - 3600000).toISOString() },
          { id: 'gm-2', userId: demoUserId, userName: 'Alex Rivera', text: 'I just finished the dynamic programming proof for that one! Will share my notes.', timestamp: new Date(now.getTime() - 1800000).toISOString() }
        ],
        createdAt: new Date(now.getTime() - 14 * 86400000).toISOString()
      },
      {
        id: 'group-2',
        name: 'Systems & Kernels Deep Dive',
        subject: 'Operating Systems',
        description: 'Kernel module debugging, concurrent thread synchronization, and assembly optimization.',
        creatorId: 'student-3',
        activeSessionsCount: 2,
        maxMembers: 6,
        members: [
          { userId: 'student-3', name: 'Liam Patel', joinedAt: now.toISOString() },
          { userId: demoUserId, name: 'Alex Rivera', avatarUrl: '/src/assets/images/avatar_student_default_1794506134307.jpg', joinedAt: now.toISOString() }
        ],
        messages: [
          { id: 'gm-3', userId: 'student-3', userName: 'Liam Patel', text: 'Has anyone seen why the spinlock test deadlocks on 4-core simulator?', timestamp: new Date(now.getTime() - 7200000).toISOString() }
        ],
        createdAt: new Date(now.getTime() - 10 * 86400000).toISOString()
      }
    ];

    const notifications: NotificationRecord[] = [
      {
        id: 'notif-1',
        userId: demoUserId,
        title: '5-Day Study Streak!',
        message: 'Awesome focus! You have hit a 5-day consistent study streak. Keep up the momentum!',
        type: 'streak',
        read: false,
        createdAt: `${todayStr}T09:00:00Z`
      },
      {
        id: 'notif-2',
        userId: demoUserId,
        title: 'Upcoming Assignment Due',
        message: 'Problem Set 4: Dynamic Programming is due in 2 days.',
        type: 'reminder',
        read: false,
        createdAt: `${todayStr}T08:00:00Z`
      },
      {
        id: 'notif-3',
        userId: demoUserId,
        title: 'Group Study Session Scheduled',
        message: 'CS 301 Algorithms Study Squad has a group session scheduled today at 5:00 PM.',
        type: 'group',
        read: true,
        createdAt: `${d1}T18:00:00Z`
      }
    ];

    return {
      users,
      subjects,
      sessions,
      tasks,
      calendarEvents,
      chats,
      documents,
      documentChunks,
      quizzes,
      flashcardDecks,
      studyPlans,
      studyGroups,
      notifications,
      systemSettings: {
        campusName: 'California Institute of Technology',
        allowRegistration: true,
        geminiModel: 'gemini-3.8-flash',
        maintenanceMode: false
      }
    };
  }
}

export const db = new Database();
