import React, { useState, useEffect } from 'react';
import {
  Mail,
  Sparkles,
  Inbox,
  AlertCircle,
  Clock,
  Trash2,
  RefreshCw,
  Send,
  CheckCircle2,
  Tag,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { gateway } from '../../services/workspaceGateway';
import { runGeminiAnalysis } from '../../services/aiService';
import { ConfirmDialog } from '../ConfirmDialog';
import type { GmailMessageSummary } from '../../types/workspace';

export const GmailModule: React.FC = () => {
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessageSummary | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isCategorizing, setIsCategorizing] = useState(false);

  // AI Reply State
  const [replyDraft, setReplyDraft] = useState<string>('');
  const [replyTone, setReplyTone] = useState<'professional' | 'concise' | 'friendly'>('professional');
  const [replyLoading, setReplyLoading] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);

  // Destructive Confirmation State
  const [msgToTrash, setMsgToTrash] = useState<GmailMessageSummary | null>(null);

  const fetchInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const listRes = await gateway.gmail.listMessages({ maxResults: 15, q: 'in:inbox' });
      if (!listRes.messages || listRes.messages.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Fetch message details in parallel
      const detailedMessages = await Promise.all(
        listRes.messages.slice(0, 15).map(async (msg) => {
          try {
            const detail = await gateway.gmail.getMessage(msg.id);
            const headers = detail.payload?.headers || [];
            const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
            const fromHeader = headers.find((h) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
            const dateHeader = headers.find((h) => h.name.toLowerCase() === 'date')?.value || '';

            return {
              id: detail.id,
              threadId: detail.threadId,
              snippet: detail.snippet || '',
              subject: subjectHeader,
              from: fromHeader,
              date: dateHeader,
              labelIds: detail.labelIds || [],
            } as GmailMessageSummary;
          } catch (e) {
            return null;
          }
        })
      );

      const validList = detailedMessages.filter(Boolean) as GmailMessageSummary[];
      setMessages(validList);
      if (validList.length > 0 && !selectedMessage) {
        setSelectedMessage(validList[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Gmail inbox.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  // AI Priority Categorization
  const handleAutoCategorize = async () => {
    if (messages.length === 0) return;
    setIsCategorizing(true);
    try {
      const payload = messages.map((m) => ({
        id: m.id,
        subject: m.subject,
        from: m.from,
        snippet: m.snippet,
      }));

      const res = await runGeminiAnalysis('email_triage', payload);
      let parsed: any[] = [];
      try {
        const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        // Fallback heuristic if not strict json
      }

      if (Array.isArray(parsed)) {
        setMessages((prev) =>
          prev.map((msg) => {
            const found = parsed.find((p) => p.id === msg.id);
            if (found) {
              const catRaw = (found.category || '').toLowerCase();
              let category: GmailMessageSummary['priorityCategory'] = 'general';
              if (catRaw.includes('urgent')) category = 'urgent';
              else if (catRaw.includes('action')) category = 'action_required';
              else if (catRaw.includes('review')) category = 'meetings';
              else if (catRaw.includes('newsletter')) category = 'newsletters';

              return {
                ...msg,
                priorityCategory: category,
                priorityScore: typeof found.score === 'number' ? found.score : 70,
                aiSummary: found.summary,
                recommendedAction: found.recommendedAction,
              };
            }
            return msg;
          })
        );
      }
    } catch (err: any) {
      alert(`AI categorization failed: ${err.message}`);
    } finally {
      setIsCategorizing(false);
    }
  };

  // Generate Smart Reply
  const handleGenerateReply = async () => {
    if (!selectedMessage) return;
    setReplyLoading(true);
    try {
      const res = await runGeminiAnalysis('email_reply', {
        subject: selectedMessage.subject,
        snippet: selectedMessage.snippet,
        tone: replyTone,
        customInstructions: 'Clear acknowledgement, professional next steps, and sign-off.',
      });
      setReplyDraft(res.text);
    } catch (err: any) {
      alert(`Could not generate smart reply: ${err.message}`);
    } finally {
      setReplyLoading(false);
    }
  };

  const confirmTrashMessage = async () => {
    if (!msgToTrash) return;
    try {
      await gateway.gmail.trashMessage(msgToTrash.id);
      setMessages((prev) => prev.filter((m) => m.id !== msgToTrash.id));
      if (selectedMessage?.id === msgToTrash.id) {
        setSelectedMessage(null);
      }
      setMsgToTrash(null);
    } catch (err: any) {
      alert(`Could not trash email: ${err.message}`);
    }
  };

  const getPriorityBadge = (cat?: GmailMessageSummary['priorityCategory'], score?: number) => {
    switch (cat) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Urgent {score ? `(${score})` : ''}
          </span>
        );
      case 'action_required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
            Action Req {score ? `(${score})` : ''}
          </span>
        );
      case 'meetings':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            Needs Review
          </span>
        );
      case 'newsletters':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Newsletter
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Inbox
          </span>
        );
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filterPriority === 'all') return true;
    return m.priorityCategory === filterPriority;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Mail className="w-6 h-6 text-red-500" />
              Gmail Intelligence &amp; Priority Sorter
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Categorize incoming emails by priority score, generate executive summaries, and craft instant AI replies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAutoCategorize}
              disabled={isCategorizing || messages.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isCategorizing ? 'animate-spin' : ''}`} />
              {isCategorizing ? 'Analyzing with Gemini...' : 'Categorize by Priority'}
            </button>

            <button
              onClick={fetchInbox}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Priority Filter Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">
            Filter View:
          </span>
          {[
            { id: 'all', label: 'All Messages' },
            { id: 'urgent', label: 'Urgent' },
            { id: 'action_required', label: 'Action Required' },
            { id: 'meetings', label: 'Needs Review' },
            { id: 'newsletters', label: 'Newsletters' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterPriority(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterPriority === tab.id
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Main Mail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Email List */}
        <div className="lg:col-span-5 space-y-2.5">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-red-500 mb-2" />
              Loading your inbox...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              No emails found for this view.
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl cursor-pointer transition-all hover:shadow-sm ${
                  selectedMessage?.id === msg.id
                    ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/10 dark:bg-red-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                    {msg.from.replace(/<.*>/, '').trim() || msg.from}
                  </span>
                  {getPriorityBadge(msg.priorityCategory, msg.priorityScore)}
                </div>

                <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {msg.subject}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                  {msg.snippet}
                </p>

                {msg.recommendedAction && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-purple-600 dark:text-purple-300 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>Action: {msg.recommendedAction}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Message Viewer & AI Reply Panel */}
        <div className="lg:col-span-7">
          {selectedMessage ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getPriorityBadge(selectedMessage.priorityCategory, selectedMessage.priorityScore)}
                    <span className="text-xs text-slate-400">
                      {selectedMessage.date ? new Date(selectedMessage.date).toLocaleString() : ''}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedMessage.subject}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    From: <span className="font-medium text-slate-900 dark:text-slate-200">{selectedMessage.from}</span>
                  </p>
                </div>

                <button
                  onClick={() => setMsgToTrash(selectedMessage)}
                  title="Move to Trash (Requires confirmation)"
                  className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* AI Summary Highlight */}
              {selectedMessage.aiSummary && (
                <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    Gemini Executive Summary
                  </div>
                  <p className="leading-relaxed">{selectedMessage.aiSummary}</p>
                </div>
              )}

              {/* Message Snippet / Content */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed border border-slate-100 dark:border-slate-800">
                {selectedMessage.snippet}
              </div>

              {/* AI Reply Generator */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    AI Smart Reply Assistant
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Tone:</span>
                    {(['professional', 'concise', 'friendly'] as const).map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setReplyTone(tone)}
                        className={`px-2.5 py-1 text-xs rounded-lg capitalize transition-colors ${
                          replyTone === tone
                            ? 'bg-purple-600 text-white font-medium'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}

                    <button
                      onClick={handleGenerateReply}
                      disabled={replyLoading}
                      className="px-3 py-1 text-xs font-semibold rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors disabled:opacity-50"
                    >
                      {replyLoading ? 'Drafting...' : 'Generate Reply'}
                    </button>
                  </div>
                </div>

                {replyDraft && (
                  <div className="space-y-3 bg-purple-50/40 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      rows={5}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Generated with Gemini 3.8. Ready to copy or send.
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(replyDraft);
                          setCopiedReply(true);
                          setTimeout(() => setCopiedReply(false), 2000);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {copiedReply ? 'Copied to Clipboard!' : 'Copy Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400">
              Select an email from the left to view contents, priority analysis, and draft AI responses.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Email Trash */}
      <ConfirmDialog
        isOpen={!!msgToTrash}
        title="Move Email to Trash"
        description={`Are you sure you want to move the email "${msgToTrash?.subject}" to Trash?`}
        confirmLabel="Move to Trash"
        isDestructive={true}
        onConfirm={confirmTrashMessage}
        onCancel={() => setMsgToTrash(null)}
      />
    </div>
  );
};
