import React, { useState, useEffect } from 'react';
import {
  Search,
  Folder,
  Mail,
  CheckSquare,
  X,
  ExternalLink,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { gateway } from '../services/workspaceGateway';
import type { DriveFileItem, GmailMessageSummary } from '../types/workspace';

interface OmniSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
}

export const OmniSearch: React.FC<OmniSearchProps> = ({ isOpen, onClose, onSelectTab }) => {
  const [queryText, setQueryText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [driveResults, setDriveResults] = useState<DriveFileItem[]>([]);
  const [gmailResults, setGmailResults] = useState<GmailMessageSummary[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setQueryText('');
      setDriveResults([]);
      setGmailResults([]);
    }
  }, [isOpen]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;

    setIsSearching(true);
    try {
      const q = queryText.trim();

      // Parallel search across Drive and Gmail
      const [driveRes, gmailListRes] = await Promise.allSettled([
        gateway.drive.listFiles({
          q: `name contains '${q.replace(/'/g, "\\'")}' and trashed = false`,
          pageSize: 5,
        }),
        gateway.gmail.listMessages({
          q: `${q} in:inbox`,
          maxResults: 5,
        }),
      ]);

      if (driveRes.status === 'fulfilled' && driveRes.value.files) {
        setDriveResults(driveRes.value.files);
      } else {
        setDriveResults([]);
      }

      if (gmailListRes.status === 'fulfilled' && gmailListRes.value.messages) {
        const msgs = await Promise.all(
          gmailListRes.value.messages.slice(0, 4).map(async (m) => {
            try {
              const d = await gateway.gmail.getMessage(m.id);
              const headers = d.payload?.headers || [];
              const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
              const from = headers.find((h) => h.name.toLowerCase() === 'from')?.value || 'Unknown';
              return {
                id: d.id,
                threadId: d.threadId,
                snippet: d.snippet || '',
                subject,
                from,
                date: '',
                labelIds: [],
              } as GmailMessageSummary;
            } catch {
              return null;
            }
          })
        );
        setGmailResults(msgs.filter(Boolean) as GmailMessageSummary[]);
      } else {
        setGmailResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
      >
        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search files across Drive, emails in Gmail, tasks... (Press Enter)"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          {queryText && (
            <button
              type="button"
              onClick={() => setQueryText('')}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </form>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {isSearching ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Search className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              Searching across your Google Workspace...
            </div>
          ) : driveResults.length === 0 && gmailResults.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Type your search keywords and press Enter to query Drive files and Gmail messages simultaneously.
            </div>
          ) : (
            <>
              {/* Google Drive Results */}
              {driveResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                    <span className="flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-blue-500" />
                      Google Drive Files
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onSelectTab('drive');
                      }}
                      className="text-blue-600 hover:underline flex items-center gap-1 normal-case"
                    >
                      View all in Drive <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {driveResults.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-slate-200 dark:border-slate-800 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {f.name}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : ''}
                        </span>
                      </div>

                      {f.webViewLink && (
                        <a
                          href={f.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Gmail Results */}
              {gmailResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-2 pt-2">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-red-500" />
                      Gmail Messages
                    </span>
                    <button
                      onClick={() => {
                        onClose();
                        onSelectTab('gmail');
                      }}
                      className="text-red-500 hover:underline flex items-center gap-1 normal-case"
                    >
                      View in Gmail <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {gmailResults.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        onClose();
                        onSelectTab('gmail');
                      }}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-red-50/30 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {m.from.replace(/<.*>/, '').trim()}
                        </span>
                      </div>
                      <h4 className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {m.subject}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {m.snippet}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
