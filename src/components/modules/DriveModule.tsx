import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  Table,
  Presentation,
  FileCode,
  Search,
  ExternalLink,
  Sparkles,
  Trash2,
  RefreshCw,
  Clock,
  User as UserIcon,
  Filter,
} from 'lucide-react';
import { gateway } from '../../services/workspaceGateway';
import { runGeminiAnalysis } from '../../services/aiService';
import { ConfirmDialog } from '../ConfirmDialog';
import type { DriveFileItem } from '../../types/workspace';

export const DriveModule: React.FC = () => {
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<DriveFileItem | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Delete Confirmation state
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      let q = 'trashed = false';
      if (filterType === 'docs') {
        q += " and mimeType = 'application/vnd.google-apps.document'";
      } else if (filterType === 'sheets') {
        q += " and mimeType = 'application/vnd.google-apps.spreadsheet'";
      } else if (filterType === 'slides') {
        q += " and mimeType = 'application/vnd.google-apps.presentation'";
      } else if (filterType === 'forms') {
        q += " and mimeType = 'application/vnd.google-apps.form'";
      } else if (filterType === 'pdf') {
        q += " and mimeType = 'application/pdf'";
      }

      const res = await gateway.drive.listFiles({
        q,
        pageSize: 40,
        orderBy: 'modifiedTime desc',
      });
      setFiles(res.files || []);
    } catch (err: any) {
      setError(err.message || 'Failed to pull Google Drive files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [filterType]);

  const handleAiAnalyze = async (file: DriveFileItem) => {
    setSelectedFile(file);
    setAiLoading(true);
    setAiInsight(null);
    try {
      const res = await runGeminiAnalysis('doc_review', {
        title: file.name,
        stage: 'Drive File Analysis',
        content: `File name: ${file.name}, MIME Type: ${file.mimeType}, Last Modified: ${file.modifiedTime}`,
      });
      setAiInsight(res.text);
    } catch (err: any) {
      setAiInsight(`AI Analysis unavailable: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      await gateway.drive.deleteFile(fileToDelete.id);
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (err: any) {
      alert(`Could not delete file: ${err.message}`);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('document')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (mimeType.includes('spreadsheet')) return <Table className="w-5 h-5 text-emerald-500" />;
    if (mimeType.includes('presentation')) return <Presentation className="w-5 h-5 text-amber-500" />;
    if (mimeType.includes('folder')) return <Folder className="w-5 h-5 text-indigo-500" />;
    return <FileCode className="w-5 h-5 text-slate-500" />;
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Folder className="w-6 h-6 text-blue-600" />
              Unified Google Drive File Puller
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pull files instantly across your entire Google Drive without opening dozens of browser tabs.
            </p>
          </div>
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Files
          </button>
        </div>

        {/* Search & Filter bar */}
        <div className="mt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: 'all', label: 'All Files' },
              { id: 'docs', label: 'Docs' },
              { id: 'sheets', label: 'Sheets' },
              { id: 'slides', label: 'Slides' },
              { id: 'forms', label: 'Forms' },
              { id: 'pdf', label: 'PDFs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* File List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
              Loading your Google Drive items...
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              No files found matching your search.
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div
                key={file.id}
                className={`p-4 bg-white dark:bg-slate-900 border rounded-xl transition-all hover:border-blue-400 hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  selectedFile?.id === file.id
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate">
                      {file.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'N/A'}
                      </span>
                      {file.owners?.[0] && (
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <UserIcon className="w-3 h-3" />
                          {file.owners[0].displayName || file.owners[0].emailAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleAiAnalyze(file)}
                    title="Analyze with Gemini AI"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    AI Summary
                  </button>

                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open in Google Workspace"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open
                    </a>
                  )}

                  <button
                    onClick={() => setFileToDelete(file)}
                    title="Delete file (Requires confirmation)"
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* AI Insight Sidebar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit sticky top-6">
          <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm mb-3">
            <Sparkles className="w-4 h-4" />
            Gemini Workspace Intelligence
          </div>

          {selectedFile ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                  Target File
                </span>
                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm mt-0.5 truncate">
                  {selectedFile.name}
                </p>
              </div>

              {aiLoading ? (
                <div className="py-8 text-center text-slate-500 text-sm space-y-2">
                  <Sparkles className="w-6 h-6 animate-pulse mx-auto text-purple-500" />
                  <p>Gemini is reviewing this document...</p>
                </div>
              ) : aiInsight ? (
                <div className="prose dark:prose-invert text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap bg-purple-50/50 dark:bg-purple-950/20 p-3.5 rounded-xl border border-purple-100 dark:border-purple-900/40 text-slate-800 dark:text-slate-200">
                  {aiInsight}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Click &ldquo;AI Summary&rdquo; on any file to generate automated insights and action items.
                </p>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Select any Google Drive document or spreadsheet to run instant Gemini insights.
            </div>
          )}
        </div>
      </div>

      {/* User Confirmation Dialog for File Deletion */}
      <ConfirmDialog
        isOpen={!!fileToDelete}
        title="Delete Google Drive File"
        description={`Are you sure you want to permanently delete "${fileToDelete?.name}" from your Google Drive? This action cannot be undone.`}
        confirmLabel="Delete File"
        isDestructive={true}
        onConfirm={confirmDeleteFile}
        onCancel={() => setFileToDelete(null)}
      />
    </div>
  );
};
