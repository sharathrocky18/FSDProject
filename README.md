# StudySync – Where Is My Time Going?
**Tagline:** Learn Better. Focus Smarter. Achieve More.

StudySync is a full-stack AI-powered student learning and productivity web platform engineered specifically for university and college students. It combines real-time study tracking, academic course management, Google Gemini AI learning assistance, productivity analytics, active recall tools, and collaborative learning squads.

---

## Architecture Overview

```
StudySync/
├── server.ts                  # Express server mounting REST APIs + Vite middleware in dev
├── server/
│   ├── db.ts                  # Persistent document database layer with Mongoose-style schema
│   ├── gemini.ts              # Server-side @google/genai SDK client (gemini-3.8-flash)
│   └── routes.ts              # Modular REST API endpoints with JWT authentication
├── src/
│   ├── components/            # Sidebar, TopNav, AuthModal, Reusable controls
│   ├── context/               # AuthContext for session & profile persistence
│   ├── pages/                 # 18 dedicated application modules
│   │   ├── DashboardView.tsx        # Overview with Recharts analytics & recent logs
│   │   ├── TimerView.tsx            # Stopwatch & Pomodoro interval focus system
│   │   ├── SubjectsView.tsx         # Course enrollment, goals & custom color accents
│   │   ├── ChatbotView.tsx          # Multi-subject AI tutor, step-by-step math, code
│   │   ├── PdfAssistantView.tsx     # Semantic RAG over lecture slides with citations
│   │   ├── QuizGeneratorView.tsx    # Interactive AI examination & recall tests
│   │   ├── FlashcardsView.tsx       # Spaced-repetition flip decks with confidence rating
│   │   ├── StudyPlannerView.tsx     # Personalized AI timetable & study slot checklist
│   │   ├── TasksView.tsx            # Coursework & deadline manager with priority filters
│   │   ├── CalendarView.tsx         # Campus calendar, exam milestones & study groups
│   │   ├── AnalyticsView.tsx        # In-depth productivity breakdowns & habit trends
│   │   ├── StreaksView.tsx          # Consecutive streak tracker & milestone badges
│   │   ├── GroupStudyView.tsx       # Collaborative squads & real-time discussion
│   │   ├── LeaderboardView.tsx      # Campus rankings with opt-in privacy controls
│   │   ├── SessionHistoryView.tsx   # Detailed historical log of all study intervals
│   │   ├── ProfileView.tsx          # Student credentials & daily target preferences
│   │   ├── AdminView.tsx            # Campus administrator statistics & user directory
│   │   └── SettingsView.tsx         # Timer audio, alert preferences & AI status
│   ├── services/api.ts        # Typed API client with Bearer token authentication
│   └── utils/
│       ├── studyMetrics.ts    # Pure metrics, streak calculation & distribution logic
│       ├── studyMetrics.test.ts # Unit tests executed via node:test and tsx
│       └── ragSearch.ts       # Chunking & cosine similarity vector search
└── package.json
```

---

## Key Features

1. **Dedicated Login & Registration Portal**: Full-screen authentication portal with tabs for student sign-in, comprehensive new user registration (Full Name, College, Course/Major, Semester, Email, Password verification), instant demo logins (Alex Rivera & Prof. Marcus), and password recovery.
2. **Universal AI Subject Tutor (`gemini-3.8-flash`)**: Universal subject selector supporting enrolled courses, major academic disciplines (STEM, Humanities, Business, Medicine, Law), and custom subject input. Ask any question on any subject to receive step-by-step mathematical proofs, working code, and structured academic explanations.
3. **Student Dashboard & Live Analytics**: Real-time overview of study hours, streak counter, upcoming exams, 7-day productivity bar chart, and subject distribution donut chart.
4. **Study & Pomodoro Focus Timer**: Customizable work/break intervals, session note logging, productivity ratings (1-5 stars), and automatic database recording.
5. **PDF Notes Assistant (RAG)**: Document upload, sliding-window chunking, vector embedding generation, and cosine-similarity retrieval grounding answers with excerpt citations.
6. **Active Recall Tools**: AI Quiz Generator with instant scoring and explanations, plus 3D interactive Flashcards with self-assessed mastery levels.
7. **AI Study Planner**: Personalized weekly schedule generation matching student deadlines and available study capacity.
8. **Campus Community & Leaderboard**: Collaborative study squads with live chat, plus opt-in campus rankings by study hours and active streaks.

---

## Environment Variables

Configure the following variables in your `.env` or deployment secrets:

```env
# Google AI Studio Gemini API Key (Automatically injected in AI Studio)
GEMINI_API_KEY="your-gemini-api-key"

# Secret key for JWT session verification
JWT_SECRET="studysync-secure-jwt-token-secret-2026"

# Optional: MongoDB Atlas URI (App defaults to persistent JSON document store out of the box)
# MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/studysync"

# Server Port (defaults to 3000)
PORT=3000
```

---

## Running the Application

### 1. Run Development Server
```bash
npm run dev
```
The server starts at `http://localhost:3000` with Express REST API endpoints mounted at `/api/*` and Vite frontend hot middleware.

### 2. Run Unit Test Suite
```bash
npx --yes tsx --test src/utils/studyMetrics.test.ts
```

### 3. Build for Production
```bash
npm run build
npm start
```
