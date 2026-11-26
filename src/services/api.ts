/**
 * HTTP API client for StudySync backend REST endpoints
 */

const getAuthToken = (): string | null => {
  return localStorage.getItem('studysync_token');
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401 && !endpoint.startsWith('/auth/')) {
    localStorage.removeItem('studysync_token');
    window.dispatchEvent(new Event('studysync:unauthorized'));
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        (response.status >= 500
          ? `Server temporarily unavailable (${response.status}). Please retry.`
          : `Request failed (${response.status})`)
    );
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  forgotPassword: (payload: any) => request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  getMe: () => request<any>('/users/me'),
  updateProfile: (payload: any) => request<any>('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }),

  // Dashboard
  getDashboard: () => request<any>('/dashboard'),

  // Subjects
  getSubjects: () => request<any[]>('/subjects'),
  createSubject: (payload: any) => request<any>('/subjects', { method: 'POST', body: JSON.stringify(payload) }),
  updateSubject: (id: string, payload: any) => request<any>(`/subjects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteSubject: (id: string) => request<any>(`/subjects/${id}`, { method: 'DELETE' }),

  // Study Sessions
  logSession: (payload: any) => request<any>('/sessions', { method: 'POST', body: JSON.stringify(payload) }),
  getSessionHistory: () => request<any[]>('/sessions/history'),
  deleteSession: (id: string) => request<any>(`/sessions/${id}`, { method: 'DELETE' }),

  // AI Chat
  getChats: () => request<any[]>('/ai/chats'),
  createChat: (payload: any) => request<any>('/ai/chats', { method: 'POST', body: JSON.stringify(payload) }),
  sendChatMessage: (payload: any) => request<any>('/ai/chat/message', { method: 'POST', body: JSON.stringify(payload) }),
  deleteChat: (id: string) => request<any>(`/ai/chats/${id}`, { method: 'DELETE' }),

  // PDF Notes RAG
  getDocuments: () => request<any[]>('/documents'),
  uploadDocument: (payload: any) => request<any>('/documents/upload', { method: 'POST', body: JSON.stringify(payload) }),
  askDocument: (id: string, question: string) => request<any>(`/documents/${id}/ask`, { method: 'POST', body: JSON.stringify({ question }) }),
  deleteDocument: (id: string) => request<any>(`/documents/${id}`, { method: 'DELETE' }),

  // AI Quiz
  generateQuiz: (payload: any) => request<any>('/ai/quiz/generate', { method: 'POST', body: JSON.stringify(payload) }),
  saveQuizAttempt: (payload: any) => request<any>('/ai/quiz/save', { method: 'POST', body: JSON.stringify(payload) }),
  getQuizHistory: () => request<any[]>('/ai/quiz/history'),

  // AI Flashcards
  generateFlashcards: (payload: any) => request<any>('/ai/flashcards/generate', { method: 'POST', body: JSON.stringify(payload) }),
  getFlashcardDecks: () => request<any[]>('/ai/flashcards'),
  updateFlashcardMastery: (deckId: string, cardId: string, masteryLevel: string) =>
    request<any>(`/ai/flashcards/${deckId}/card/${cardId}`, { method: 'PATCH', body: JSON.stringify({ masteryLevel }) }),
  deleteFlashcardDeck: (id: string) => request<any>(`/ai/flashcards/${id}`, { method: 'DELETE' }),

  // AI Study Planner
  generateStudyPlan: (payload: any) => request<any>('/ai/planner/generate', { method: 'POST', body: JSON.stringify(payload) }),
  getCurrentStudyPlan: () => request<any>('/ai/planner/current'),
  getStudyPlanHistory: () => request<any[]>('/ai/planner/history'),
  togglePlanTopic: (topicId: string, completed: boolean) =>
    request<any>(`/ai/planner/topic/${topicId}`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  togglePlanSlot: (slotId: string, completed: boolean) =>
    request<any>(`/ai/planner/slot/${slotId}`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  deleteStudyPlan: (id: string) => request<any>(`/ai/planner/${id}`, { method: 'DELETE' }),

  // Tasks & Assignments
  getTasks: () => request<any[]>('/tasks'),
  createTask: (payload: any) => request<any>('/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  updateTask: (id: string, payload: any) => request<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTask: (id: string) => request<any>(`/tasks/${id}`, { method: 'DELETE' }),

  // Academic Calendar
  getCalendarEvents: () => request<any[]>('/calendar'),
  createCalendarEvent: (payload: any) => request<any>('/calendar', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCalendarEvent: (id: string) => request<any>(`/calendar/${id}`, { method: 'DELETE' }),

  // Study Analytics
  getAnalytics: () => request<any>('/analytics'),

  // Notifications
  getNotifications: () => request<any[]>('/notifications'),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/notifications/mark-all-read', { method: 'POST' }),
};
