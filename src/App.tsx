import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  testFirestoreConnection,
} from './services/firebase';
import { Navigation } from './components/Navigation';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OmniSearch } from './components/OmniSearch';
import { DriveModule } from './components/modules/DriveModule';
import { GmailModule } from './components/modules/GmailModule';
import { CalendarModule } from './components/modules/CalendarModule';
import { DocsWorkflowModule } from './components/modules/DocsWorkflowModule';
import { TasksModule } from './components/modules/TasksModule';
import { SlidesModule } from './components/modules/SlidesModule';
import { KeepNotesModule } from './components/modules/KeepNotesModule';
import { ContactsModule } from './components/modules/ContactsModule';
import { ChatModule } from './components/modules/ChatModule';
import { FormsModule } from './components/modules/FormsModule';
import { GatewayModule } from './components/modules/GatewayModule';
import { UpdatesModule } from './components/modules/UpdatesModule';
import {
  Sparkles,
  ShieldCheck,
  Folder,
  Mail,
  Calendar,
  FileText,
  ListCheck,
  Presentation,
  StickyNote,
  Users,
  Terminal,
  WifiOff,
  CheckCircle2,
  Bell,
  X,
  Zap,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('drive');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Offline Mode State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Light / Dark Mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('solmate_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Automated Welcome Email Toast & Status
  const [botToast, setBotToast] = useState<{ title: string; message: string } | null>(null);

  // Track unread notifications
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const saved = localStorage.getItem('solmate_notifications');
    if (saved) {
      try {
        const notifs = JSON.parse(saved);
        return notifs.filter((n: any) => !n.read).length;
      } catch {
        return 0;
      }
    }
    return 1;
  });

  // Theme synchronization with html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('solmate_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dispatch automated welcome email by SolmateAI Bot (no asking/modal)
  const triggerAutomatedBotWelcome = async (targetUser: User) => {
    if (!targetUser.email) return;

    const alreadySentKey = `solmate_bot_welcome_${targetUser.uid}`;
    if (localStorage.getItem(alreadySentKey)) return;

    try {
      const res = await fetch('/api/bot/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetUser.email,
          displayName: targetUser.displayName || targetUser.email.split('@')[0],
          optInUpdates: true,
          optInPromotions: false,
        }),
      });

      if (res.ok) {
        localStorage.setItem(alreadySentKey, 'true');
        setBotToast({
          title: 'Welcome Email Sent by SolmateAI Bot',
          message: `Dispatched automatically from bot@solmate.ai to ${targetUser.email}.`,
        });

        // Add welcome notification
        const welcomeNotif = {
          id: 'notif_' + Date.now(),
          title: 'Welcome to SolmateAI from System Bot',
          message: `Automatic welcome email delivered to ${targetUser.email} from SolmateAI System Bot (bot@solmate.ai).`,
          type: 'welcome',
          read: false,
          createdAt: new Date().toISOString(),
          botSender: 'SolmateAI System Bot <bot@solmate.ai>',
        };

        const existingNotifs = JSON.parse(localStorage.getItem('solmate_notifications') || '[]');
        const updated = [welcomeNotif, ...existingNotifs];
        localStorage.setItem('solmate_notifications', JSON.stringify(updated));
        setUnreadCount(updated.filter((n: any) => !n.read).length);

        setTimeout(() => setBotToast(null), 6000);
      }
    } catch (e) {
      console.warn('Bot welcome dispatch notice:', e);
    }
  };

  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);

        // Automatically trigger welcome email from SolmateAI Bot upon sign in
        triggerAutomatedBotWelcome(currentUser);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );

    // Keyboard shortcut for Cmd+K / Ctrl+K
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setNeedsAuth(false);
        triggerAutomatedBotWelcome(res.user);
      }
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setNeedsAuth(true);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50/80 dark:bg-slate-950/80 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* 🌟 Ambient Flowing Google Colors Background with Deep Blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        {/* Google Blue Orb */}
        <div className="absolute -top-32 -left-28 w-96 sm:w-[540px] h-96 sm:h-[540px] rounded-full bg-[#4285F4] opacity-35 dark:opacity-20 blur-[100px] sm:blur-[140px] animate-float-blue" />

        {/* Google Red Orb */}
        <div className="absolute top-1/4 -right-32 w-96 sm:w-[560px] h-96 sm:h-[560px] rounded-full bg-[#EA4335] opacity-30 dark:opacity-20 blur-[110px] sm:blur-[150px] animate-float-red" />

        {/* Google Yellow Orb */}
        <div className="absolute -bottom-28 left-1/4 w-96 sm:w-[500px] h-96 sm:h-[500px] rounded-full bg-[#FBBC05] opacity-30 dark:opacity-15 blur-[100px] sm:blur-[140px] animate-float-yellow" />

        {/* Google Green Orb */}
        <div className="absolute bottom-1/3 -right-20 w-96 sm:w-[520px] h-96 sm:h-[520px] rounded-full bg-[#34A853] opacity-30 dark:opacity-20 blur-[110px] sm:blur-[150px] animate-float-green" />

        {/* Central Violet/Indigo Ambient Core */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] rounded-full bg-indigo-400/10 dark:bg-indigo-600/10 blur-[150px]" />
      </div>

      {/* Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'updates') {
            setUnreadCount(0);
          }
        }}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        onOpenSearch={() => setIsSearchOpen(true)}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((prev) => !prev)}
        isOffline={isOffline}
        unreadNotificationsCount={unreadCount}
      />

      {/* Offline Mode Banner */}
      {isOffline && (
        <div className="bg-amber-500/90 dark:bg-amber-600/90 text-amber-950 dark:text-white px-4 py-2.5 text-xs font-semibold backdrop-blur-md shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>
                <strong>Offline Mode Active:</strong> You are currently disconnected. Cached files &amp; Keep notes remain accessible, but AI intelligence tools (Gemini 3.8 / 3.1) and live cloud updates require an active internet connection.
              </span>
            </div>
            <span className="shrink-0 text-[11px] underline">Auto-reconnects when online</span>
          </div>
        </div>
      )}

      {/* Bot Toast Notification */}
      {botToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-purple-200 dark:border-purple-800 shadow-2xl flex items-start gap-3 max-w-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {botToast.title}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                {botToast.message}
              </p>
            </div>
            <button
              onClick={() => setBotToast(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {needsAuth ? (
          /* Landing Screen when user needs to authenticate */
          <div className="space-y-12 py-10 max-w-4xl mx-auto">
            {/* Hero Card */}
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-white/70 dark:bg-slate-900/70 text-slate-800 dark:text-slate-200 border border-white/50 dark:border-white/10 shadow-sm backdrop-blur-md">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                </span>
                <span>Welcome to SolmateAI &bull; Automated Bot &amp; Workspace Hub</span>
              </div>

              <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.15]">
                Intelligent Hub for all your <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] bg-clip-text text-transparent">
                  Google Workspace Apps
                </span>
              </h2>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                Experience seamless productivity with <strong>SolmateAI</strong>. Pull Drive files instantly, categorize Gmail with Gemini AI, sync Calendar and Meet, automate Google Doc approvals, and manage Tasks, Slides, Keep, and Contacts through a unified API gateway.
              </p>

              {/* Official Google Sign-in & Download Web App Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="gsi-material-button inline-flex items-center justify-center gap-3 px-7 py-4 border border-white/60 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-900 dark:text-slate-100 bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] backdrop-blur-xl disabled:opacity-50"
                >
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 block">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  </div>
                  <span>{isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google to Connect'}</span>
                </button>

                <PWAInstallButton variant="hero" />
              </div>

              <div className="flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 pt-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Official OAuth 2.0
                </span>
                <span>Automated Bot Welcome Email</span>
                <span>Offline Support</span>
              </div>
            </div>

            {/* Feature Suite Showcase Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4">
              {[
                { title: 'Google Drive Puller', desc: 'Pull files instantly without opening new tabs, filter by Docs, Sheets, Slides, and PDFs.', icon: Folder, color: 'text-blue-500' },
                { title: 'Gmail AI Priority Sorter', desc: 'Categorize incoming emails by priority score, draft smart replies, and summarize threads.', icon: Mail, color: 'text-red-500' },
                { title: 'Calendar & Meet Sync', desc: 'Real-time schedule timeline, create meetings with automated Google Meet video links.', icon: Calendar, color: 'text-blue-600' },
                { title: 'Doc Workflow Automation', desc: 'Design approval pipelines for Google Docs with automated Gemini compliance reviews.', icon: FileText, color: 'text-indigo-600' },
                { title: 'Tasks Progress Dashboard', desc: 'Synchronize Google Tasks, track project milestones, and turn ideas into action checklists.', icon: ListCheck, color: 'text-emerald-600' },
                { title: 'Google Slides & AI Decks', desc: 'Integrate presentations and let Gemini generate multi-slide deck outlines with notes.', icon: Presentation, color: 'text-amber-500' },
                { title: 'Keep Notes Across Devices', desc: 'Keep-style color-coded sticky notes with tags, AI polish, and export to Docs & Tasks.', icon: StickyNote, color: 'text-amber-600' },
                { title: 'Google People & Contacts', desc: 'Sync your contact list, start emails, and schedule meetings in one click.', icon: Users, color: 'text-sky-600' },
                { title: 'Unified API Gateway', desc: 'Centralized developer gateway with live request telemetry, cURL snippets, and test bench.', icon: Terminal, color: 'text-emerald-500' },
              ].map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={i}
                    className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-white/50 dark:border-white/10 shadow-sm backdrop-blur-md space-y-2.5 transition-all hover:shadow-md hover:scale-[1.01]"
                  >
                    <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 w-fit">
                      <Icon className={`w-5 h-5 ${f.color}`} />
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{f.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard View */
          <div className="relative">
            {activeTab === 'drive' && <DriveModule />}
            {activeTab === 'gmail' && <GmailModule />}
            {activeTab === 'calendar' && <CalendarModule />}
            {activeTab === 'doc_workflows' && <DocsWorkflowModule />}
            {activeTab === 'tasks' && <TasksModule />}
            {activeTab === 'slides' && <SlidesModule />}
            {activeTab === 'keep' && <KeepNotesModule />}
            {activeTab === 'contacts' && (
              <ContactsModule
                onScheduleWithContact={() => setActiveTab('calendar')}
              />
            )}
            {activeTab === 'chat' && <ChatModule />}
            {activeTab === 'forms' && <FormsModule />}
            {activeTab === 'gateway' && <GatewayModule />}
            {activeTab === 'updates' && (
              <UpdatesModule user={user} isOffline={isOffline} />
            )}
          </div>
        )}
      </main>

      {/* Global Omni-Search Modal */}
      <OmniSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTab={(tabId) => setActiveTab(tabId)}
      />

      {/* Footer */}
      <footer className="border-t border-white/40 dark:border-white/10 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            <strong className="text-slate-800 dark:text-slate-200">SolmateAI</strong> &bull; Powered by Google Workspace APIs, Firebase, and Gemini 3.8
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              SolmateAI Notification Bot Active
            </span>
            <span>Firestore Cloud Sync</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
