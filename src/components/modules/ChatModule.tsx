import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  ExternalLink,
  RefreshCw,
  Users,
  Info,
  Building,
} from 'lucide-react';
import { gateway } from '../../services/workspaceGateway';
import type { ChatSpaceItem } from '../../types/workspace';

export const ChatModule: React.FC = () => {
  const [spaces, setSpaces] = useState<ChatSpaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSpaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gateway.chat.listSpaces();
      setSpaces(res.spaces || []);
    } catch (err: any) {
      // Surface helpful guidance if Chat App needs configuration in Cloud Console
      setError(err.message || 'Failed to list Google Chat spaces.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const filteredSpaces = spaces.filter((s) =>
    (s.displayName || s.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-teal-600" />
              Google Chat Spaces &amp; Conversations
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Look for team channels, spaces, and direct communications across your Google Workspace.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://chat.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-md transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Google Chat
            </a>

            <button
              onClick={fetchSpaces}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-5 relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search chat spaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-xs space-y-2">
          <div className="font-semibold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-600" />
            Google Chat Notice
          </div>
          <p>{error}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Note: Google Chat API access requires a Google Workspace organization or configured Chat app in Google Cloud Console. You can also access Google Chat directly via the button above.
          </p>
        </div>
      )}

      {/* Spaces Grid */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-500 mb-2" />
          Querying Google Chat spaces...
        </div>
      ) : filteredSpaces.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400 space-y-3">
          <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm">No chat spaces returned or configured.</p>
          <a
            href="https://chat.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:underline font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Jump to Google Chat web interface
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpaces.map((space) => (
            <div
              key={space.name}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-teal-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {space.spaceType || space.type || 'Space'}
                  </span>
                </div>

                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {space.displayName || space.name}
                </h4>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-[150px]">{space.name}</span>
                <a
                  href={`https://chat.google.com/room/${encodeURIComponent(space.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-teal-600 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Space
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
