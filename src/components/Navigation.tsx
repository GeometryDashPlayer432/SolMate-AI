import React from 'react';
import {
  Folder,
  Mail,
  Calendar,
  FileText,
  ListCheck,
  Presentation,
  StickyNote,
  Users,
  MessageSquare,
  FileCheck2,
  Terminal,
  Search,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  Bell,
  WifiOff,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { PWAInstallButton } from './PWAInstallButton';

export interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge?: string;
}

export const NAV_TABS: TabItem[] = [
  { id: 'drive', label: 'Drive Files', icon: Folder, color: 'text-blue-500' },
  { id: 'gmail', label: 'Gmail Priority', icon: Mail, color: 'text-red-500' },
  { id: 'calendar', label: 'Calendar & Meet', icon: Calendar, color: 'text-blue-600' },
  { id: 'doc_workflows', label: 'Doc Workflows', icon: FileText, color: 'text-indigo-600', badge: 'AI' },
  { id: 'tasks', label: 'Tasks Dashboard', icon: ListCheck, color: 'text-emerald-600' },
  { id: 'slides', label: 'Google Slides', icon: Presentation, color: 'text-amber-500', badge: 'AI' },
  { id: 'keep', label: 'Keep Notes', icon: StickyNote, color: 'text-amber-600' },
  { id: 'contacts', label: 'Contacts', icon: Users, color: 'text-sky-600' },
  { id: 'chat', label: 'Google Chat', icon: MessageSquare, color: 'text-teal-600' },
  { id: 'forms', label: 'Google Forms', icon: FileCheck2, color: 'text-violet-600' },
  { id: 'gateway', label: 'API Gateway', icon: Terminal, color: 'text-emerald-500', badge: 'Dev' },
  { id: 'updates', label: 'Updates & Bot', icon: Sparkles, color: 'text-purple-600', badge: 'Live' },
];

interface NavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  onOpenSearch: () => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  isOffline: boolean;
  unreadNotificationsCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  onOpenSearch,
  darkMode,
  onToggleTheme,
  isOffline,
  unreadNotificationsCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-white/50 dark:border-white/10 shadow-sm transition-colors duration-300">
      {/* Top Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => onTabChange('drive')}>
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-red-500 to-amber-500 rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-md">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
                <span className="bg-gradient-to-r from-blue-600 via-red-500 to-amber-500 bg-clip-text text-transparent">
                  SolmateAI
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100/80 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                  Workspace
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden md:block">
                All-in-One Google Workspace Intelligence &bull; Unified Gateway
              </p>
            </div>
          </div>

          {/* Omni Search Button */}
          {user && (
            <button
              onClick={onOpenSearch}
              className="flex-1 max-w-md hidden md:flex items-center justify-between px-3.5 py-2 text-xs text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/60 hover:bg-white/90 dark:hover:bg-slate-800/90 rounded-xl border border-slate-200/60 dark:border-slate-700/60 transition-all backdrop-blur-md shadow-sm"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-4 h-4 text-slate-400" />
                <span>Search Drive files, emails, tasks...</span>
              </span>
              <kbd className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-[10px] font-semibold text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Offline status indicator */}
            {isOffline && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/60">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline Mode</span>
              </span>
            )}

            {/* Notifications Bell */}
            {user && (
              <button
                onClick={() => onTabChange('updates')}
                title="View Updates & Notifications"
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm transition-all shadow-sm"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* PWA Install Button */}
            <PWAInstallButton variant="nav" />

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm transition-all shadow-sm"
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-180 duration-300" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700 animate-in spin-in-180 duration-300" />
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate max-w-[140px]">
                    {user.displayName || user.email}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {user.email}
                  </span>
                </div>

                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || ''}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="gsi-material-button inline-flex items-center justify-center gap-2.5 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm hover:shadow disabled:opacity-50"
              >
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 block">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                </div>
                <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Workspace App Tabs Bar */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none">
          <nav className="flex space-x-1.5 py-1.5 min-w-max">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white dark:text-slate-900' : tab.color}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        isActive
                          ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
