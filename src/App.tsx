import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { AuthModal } from './components/AuthModal';

import { DashboardView } from './pages/DashboardView';
import { TimerView } from './pages/TimerView';
import { SubjectsView } from './pages/SubjectsView';
import { SessionHistoryView } from './pages/SessionHistoryView';
import { ChatbotView } from './pages/ChatbotView';
import { PdfAssistantView } from './pages/PdfAssistantView';
import { QuizGeneratorView } from './pages/QuizGeneratorView';
import { FlashcardsView } from './pages/FlashcardsView';
import { StudyPlannerView } from './pages/StudyPlannerView';
import { TasksView } from './pages/TasksView';
import { CalendarView } from './pages/CalendarView';
import { AnalyticsView } from './pages/AnalyticsView';
import { StreaksView } from './pages/StreaksView';
import { ProfileView } from './pages/ProfileView';
import { SettingsView } from './pages/SettingsView';
import { AuthPage } from './pages/AuthPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Reset active tab to dashboard whenever user logs out or switches account
  useEffect(() => {
    if (!user) {
      setCurrentTab('dashboard');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19] text-slate-600 dark:text-slate-300 text-xs font-medium">
        Loading StudySync...
      </div>
    );
  }

  // First-visit / unauthenticated state always displays Login & Registration page first
  if (!user) {
    return <AuthPage onSuccess={() => setCurrentTab('dashboard')} />;
  }

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'timer':
        return <TimerView />;
      case 'subjects':
        return <SubjectsView />;
      case 'history':
        return <SessionHistoryView />;
      case 'chatbot':
        return <ChatbotView />;
      case 'pdf':
        return <PdfAssistantView />;
      case 'quiz':
        return <QuizGeneratorView />;
      case 'flashcards':
        return <FlashcardsView />;
      case 'planner':
        return <StudyPlannerView />;
      case 'tasks':
        return <TasksView />;
      case 'calendar':
        return <CalendarView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'streaks':
        return <StreaksView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView onNavigate={(tab) => setCurrentTab(tab)} />;
      default:
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#0b0f19] dark:text-slate-100 font-sans transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0b0f19] transition-colors">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
