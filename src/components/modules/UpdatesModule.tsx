import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bell,
  Send,
  CheckCircle,
  Radio,
  Clock,
  Shield,
  Layers,
  RefreshCw,
  Sliders,
  Tag,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { SystemUpdateItem, UserNotificationItem } from '../../types/workspace';
import type { User } from 'firebase/auth';

interface UpdatesModuleProps {
  user: User | null;
  isOffline: boolean;
  onNotificationsRead?: () => void;
}

export const UpdatesModule: React.FC<UpdatesModuleProps> = ({ user, isOffline }) => {
  const [updates, setUpdates] = useState<SystemUpdateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'changelog' | 'notifications' | 'preferences'>('changelog');

  // Preferences State
  const [optInUpdates, setOptInUpdates] = useState<boolean>(true);
  const [optInPromos, setOptInPromos] = useState<boolean>(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Bot Broadcast Modal
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [newVersion, setNewVersion] = useState('v1.3.1');
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newCategory, setNewCategory] = useState<'feature' | 'improvement' | 'security' | 'announcement'>('feature');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bot/updates');
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates || []);
      }
    } catch (e) {
      console.warn('Could not fetch updates from server:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();

    // Load local notification items
    const saved = localStorage.getItem('solmate_notifications');
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch {
        // ignore
      }
    } else if (user) {
      // Default initial welcome notification from SolmateAI Bot
      const initial: UserNotificationItem[] = [
        {
          id: 'notif_welcome',
          title: 'Welcome to SolmateAI from System Bot',
          message: 'Your Google Workspace account is connected. Automatic welcome email dispatched by SolmateAI Bot (bot@solmate.ai).',
          type: 'welcome',
          read: false,
          createdAt: new Date().toISOString(),
          botSender: 'SolmateAI System Bot <bot@solmate.ai>',
        },
        {
          id: 'notif_update_v13',
          title: 'New Release: Offline Mode & Notification Engine',
          message: 'SolmateAI Bot now delivers automated update notices. Offline mode keeps your workspace accessible anytime.',
          type: 'update',
          read: false,
          createdAt: new Date().toISOString(),
          botSender: 'SolmateAI System Bot <bot@solmate.ai>',
        },
      ];
      setNotifications(initial);
      localStorage.setItem('solmate_notifications', JSON.stringify(initial));
    }

    // Load subscriber prefs
    const savedPrefs = localStorage.getItem('solmate_subscriber_prefs');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setOptInUpdates(parsed.optInUpdates ?? true);
        setOptInPromos(parsed.optInPromotions ?? false);
      } catch {
        // ignore
      }
    }
  }, [user]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;

    try {
      await fetch('/api/bot/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          optInUpdates,
          optInPromotions: optInPromos,
        }),
      });

      localStorage.setItem(
        'solmate_subscriber_prefs',
        JSON.stringify({ optInUpdates, optInPromotions: optInPromos })
      );
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
    } catch (err: any) {
      alert(`Could not save preferences: ${err.message}`);
    }
  };

  const handleBroadcastUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;

    setIsBroadcasting(true);
    setDispatchStatus(null);
    try {
      const res = await fetch('/api/bot/dispatch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: newVersion.trim(),
          title: newTitle.trim(),
          summary: newSummary.trim(),
          category: newCategory,
        }),
      });

      if (!res.ok) throw new Error('Broadcast failed');
      const data = await res.json();

      // Add to notifications
      const notif: UserNotificationItem = {
        id: 'notif_' + Date.now(),
        title: `Release ${newVersion}: ${newTitle}`,
        message: newSummary,
        type: 'update',
        read: false,
        createdAt: new Date().toISOString(),
        botSender: 'SolmateAI System Bot <bot@solmate.ai>',
      };

      const updatedNotifs = [notif, ...notifications];
      setNotifications(updatedNotifs);
      localStorage.setItem('solmate_notifications', JSON.stringify(updatedNotifs));

      setDispatchStatus(`Successfully broadcasted ${newVersion} to ${data.deliveredTo?.length || 1} subscribers via SolmateAI Bot.`);
      setNewTitle('');
      setNewSummary('');
      await fetchUpdates();
    } catch (err: any) {
      alert(`Broadcast failed: ${err.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const markAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('solmate_notifications', JSON.stringify(updated));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                Live Bot Dispatcher Active
              </span>
              {isOffline && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  <WifiOff className="w-3 h-3" /> Offline Mode
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              Latest Updates &amp; Notifications Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Stay in sync with all new SolmateAI releases. Dispatches come from <strong>SolmateAI System Bot</strong> (<code className="text-xs text-purple-600 dark:text-purple-300">bot@solmate.ai</code>).
            </p>
          </div>

          <button
            onClick={fetchUpdates}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Updates
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
          <button
            onClick={() => setActiveSubTab('changelog')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'changelog'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Platform Changelog ({updates.length})
          </button>

          <button
            onClick={() => setActiveSubTab('notifications')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all relative ${
              activeSubTab === 'notifications'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" />
              Bot Notifications
            </span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('preferences')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'preferences'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Bot Email Preferences
            </span>
          </button>
        </div>
      </div>

      {/* View: Platform Changelog */}
      {activeSubTab === 'changelog' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Release History &amp; What&apos;s New
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Dispatched automatically by SolmateAI Bot
            </span>
          </div>

          <div className="space-y-4">
            {updates.map((upd) => (
              <div
                key={upd.id}
                className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-white/50 dark:border-white/10 shadow-sm backdrop-blur-md space-y-3 transition-all hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      {upd.version}
                    </span>
                    <h4 className="font-extrabold text-base text-slate-950 dark:text-white">
                      {upd.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(upd.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {upd.summary}
                </p>

                {upd.details && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                    {upd.details}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                    <Send className="w-3 h-3" />
                    Sent by SolmateAI Bot &bull; {upd.deliveredToCount} subscriber{upd.deliveredToCount === 1 ? '' : 's'}
                  </span>
                  <span className="capitalize text-slate-400 font-medium">
                    Category: {upd.category}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Trigger New Update (Developer / Bot Broadcast Tool) */}
          <div className="mt-8 p-6 rounded-3xl bg-gradient-to-tr from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200/60 dark:border-purple-800/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Send className="w-4 h-4 text-purple-600" />
                  Broadcast Live Update via SolmateAI Bot
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Whenever you make an update, tell the bot to broadcast it to subscribed users and write to this changelog.
                </p>
              </div>
            </div>

            <form onSubmit={handleBroadcastUpdate} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Version Tag
                  </label>
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Update Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Added real-time presence & enhanced search"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Summary / Changelog Details
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain the new feature or improvement..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              {dispatchStatus && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs">
                  {dispatchStatus}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isBroadcasting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isBroadcasting ? 'animate-spin' : ''}`} />
                  {isBroadcasting ? 'Broadcasting...' : 'Tell Bot to Broadcast Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View: Notifications Feed */}
      {activeSubTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Bot Messages &amp; System Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-200/50 dark:border-slate-800/50">
              <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              No notifications yet.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 rounded-2xl border transition-all ${
                  notif.read
                    ? 'bg-white/60 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60'
                    : 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/60 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                        {notif.type}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {notif.title}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-2">
                      <span>From: {notif.botSender || 'SolmateAI System Bot'}</span>
                      <span>&bull;</span>
                      <span>{new Date(notif.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {!notif.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0 mt-1" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* View: Bot Email Preferences */}
      {activeSubTab === 'preferences' && (
        <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-white/50 dark:border-white/10 shadow-sm backdrop-blur-md space-y-6">
          <div className="space-y-1">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              Bot Email Notification Preferences
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure what SolmateAI System Bot (<code className="text-purple-600 dark:text-purple-300">bot@solmate.ai</code>) delivers to your email.
            </p>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={optInUpdates}
                  onChange={(e) => setOptInUpdates(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Receive Live Feature Updates &amp; Changelogs
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    SolmateAI Bot will send an email whenever a new update or capability is deployed. (Optional, you can always view them in the Notifications tab).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                <input
                  type="checkbox"
                  checked={optInPromos}
                  onChange={(e) => setOptInPromos(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    Receive Workspace Tips &amp; Promotions
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Hear about upcoming feature previews, productivity workflows, and AI templates.
                  </span>
                </div>
              </label>
            </div>

            {prefsSaved && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Preferences saved successfully!
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
            >
              Save Email Preferences
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
