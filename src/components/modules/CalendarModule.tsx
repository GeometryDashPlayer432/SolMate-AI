import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Video,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { gateway } from '../../services/workspaceGateway';
import { runGeminiAnalysis } from '../../services/aiService';
import { ConfirmDialog } from '../ConfirmDialog';
import type { CalendarEventItem } from '../../types/workspace';

export const CalendarModule: React.FC = () => {
  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Event Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [addMeet, setAddMeet] = useState(true);
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [creating, setCreating] = useState(false);

  // AI Meeting Prep State
  const [selectedEventForAI, setSelectedEventForAI] = useState<CalendarEventItem | null>(null);
  const [aiBrief, setAiBrief] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Delete Confirmation State
  const [eventToDelete, setEventToDelete] = useState<CalendarEventItem | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gateway.calendar.listEvents({
        maxResults: 25,
        timeMin: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      });
      setEvents(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Google Calendar events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // Default dates for new event (tomorrow 10:00 to 10:45)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setMinutes(tomorrowEnd.getMinutes() + 45);

    setNewEventStart(tomorrow.toISOString().slice(0, 16));
    setNewEventEnd(tomorrowEnd.toISOString().slice(0, 16));
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    setCreating(true);
    try {
      const startDateTime = new Date(newEventStart).toISOString();
      const endDateTime = new Date(newEventEnd).toISOString();

      const attendees = attendeeEmail.trim()
        ? attendeeEmail.split(',').map((e) => ({ email: e.trim() }))
        : undefined;

      await gateway.calendar.createEvent({
        summary: newEventTitle.trim(),
        description: newEventDesc.trim() || undefined,
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime },
        attendees,
        addMeetCall: addMeet,
      });

      setIsModalOpen(false);
      setNewEventTitle('');
      setNewEventDesc('');
      setAttendeeEmail('');
      await fetchEvents();
    } catch (err: any) {
      alert(`Could not create event: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      await gateway.calendar.deleteEvent(eventToDelete.id);
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      setEventToDelete(null);
    } catch (err: any) {
      alert(`Could not delete event: ${err.message}`);
    }
  };

  const handleAiMeetingPrep = async (event: CalendarEventItem) => {
    setSelectedEventForAI(event);
    setAiLoading(true);
    setAiBrief(null);
    try {
      const res = await runGeminiAnalysis('workspace_assistant', {
        prompt: `Prepare a professional executive meeting preparation brief and structured agenda for this Google Calendar event:
Meeting Title: "${event.summary}"
Description / Context: "${event.description || 'General sync'}"
Attendees: ${event.attendees?.map((a) => a.displayName || a.email).join(', ') || 'Team'}

Provide:
1. Meeting Objective
2. Suggested 3-part Agenda (with time estimates)
3. Key Discussion Questions
4. Expected Outcomes & Action Items`,
      });
      setAiBrief(res.text);
    } catch (err: any) {
      setAiBrief(`AI Meeting Brief error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const copyMeetLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-500" />
              Calendar &amp; Google Meet Synchronization
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Synchronize real-time schedule updates, schedule meetings with integrated Google Meet, and generate AI agendas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              Schedule Event / Meet
            </button>

            <button
              onClick={fetchEvents}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Events Schedule Timeline */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
              Synchronizing calendar schedule...
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              No upcoming events found on your Google Calendar.
            </div>
          ) : (
            events.map((event) => {
              const startDate = event.start?.dateTime ? new Date(event.start.dateTime) : null;
              const endDate = event.end?.dateTime ? new Date(event.end.dateTime) : null;
              const meetUri =
                event.hangoutLink ||
                event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === 'video')?.uri;

              return (
                <div
                  key={event.id}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-blue-400 hover:shadow-md transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate">
                        {event.summary || '(Untitled Event)'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        {startDate && (
                          <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            {startDate.toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            &bull; {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                            - {endDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}

                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAiMeetingPrep(event)}
                        title="Generate AI Meeting Brief"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Brief
                      </button>

                      <button
                        onClick={() => setEventToDelete(event)}
                        title="Delete event (Requires confirmation)"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      {event.description}
                    </p>
                  )}

                  {/* Google Meet & Attendee Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {meetUri ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={meetUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Join Google Meet
                        </a>

                        <button
                          onClick={() => copyMeetLink(meetUri)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          {copiedLink === meetUri ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink === meetUri ? 'Copied' : 'Copy Link'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">In-person / standard event</span>
                    )}

                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Users className="w-3.5 h-3.5" />
                        <span>{event.attendees.length} attendee{event.attendees.length === 1 ? '' : 's'}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* AI Meeting Prep Sidebar */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm sticky top-6 space-y-4">
            <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm">
              <Sparkles className="w-4 h-4" />
              Gemini Meeting Intelligence
            </div>

            {selectedEventForAI ? (
              <div className="space-y-3">
                <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                    Prepared for
                  </span>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                    {selectedEventForAI.summary}
                  </p>
                </div>

                {aiLoading ? (
                  <div className="py-12 text-center text-slate-500 text-sm space-y-2">
                    <Sparkles className="w-6 h-6 animate-pulse mx-auto text-purple-500" />
                    <p>Generating briefing notes and agenda...</p>
                  </div>
                ) : aiBrief ? (
                  <div className="prose dark:prose-invert text-xs leading-relaxed max-h-[460px] overflow-y-auto whitespace-pre-wrap bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 text-slate-800 dark:text-slate-200">
                    {aiBrief}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Select &ldquo;AI Brief&rdquo; on any scheduled meeting to automatically synthesize agenda points, discussion targets, and expected outcomes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                Schedule New Event
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Strategy Sync & Review"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newEventStart}
                    onChange={(e) => setNewEventStart(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newEventEnd}
                    onChange={(e) => setNewEventEnd(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attendees (comma-separated emails)
                </label>
                <input
                  type="text"
                  placeholder="colleague@example.com, manager@example.com"
                  value={attendeeEmail}
                  onChange={(e) => setAttendeeEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Agenda / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Meeting goals and key discussion points..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                <input
                  type="checkbox"
                  id="addMeetToggle"
                  checked={addMeet}
                  onChange={(e) => setAddMeet(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="addMeetToggle" className="text-xs font-medium text-blue-950 dark:text-blue-200 cursor-pointer flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-blue-600" />
                  Automatically generate and attach Google Meet video room
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {creating ? 'Scheduling...' : 'Confirm & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Event Deletion */}
      <ConfirmDialog
        isOpen={!!eventToDelete}
        title="Delete Calendar Event"
        description={`Are you sure you want to cancel and delete the event "${eventToDelete?.summary}" from your Google Calendar?`}
        confirmLabel="Delete Event"
        isDestructive={true}
        onConfirm={confirmDeleteEvent}
        onCancel={() => setEventToDelete(null)}
      />
    </div>
  );
};
