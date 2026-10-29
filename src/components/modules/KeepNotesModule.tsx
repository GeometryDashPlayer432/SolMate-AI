import React, { useState, useEffect } from 'react';
import {
  StickyNote,
  Pin,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  CheckSquare,
  Search,
  Tag,
  Palette,
  ExternalLink,
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../../services/firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { gateway } from '../../services/workspaceGateway';
import { runGeminiAnalysis } from '../../services/aiService';
import { ConfirmDialog } from '../ConfirmDialog';
import type { KeepNoteRecord } from '../../types/workspace';

const NOTE_COLORS = [
  { id: 'yellow', bg: 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800' },
  { id: 'teal', bg: 'bg-teal-100 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800' },
  { id: 'indigo', bg: 'bg-indigo-100 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800' },
  { id: 'rose', bg: 'bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800' },
  { id: 'emerald', bg: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800' },
  { id: 'default', bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' },
];

export const KeepNotesModule: React.FC = () => {
  const [notes, setNotes] = useState<KeepNoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // New Note State
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState('yellow');
  const [newTags, setNewTags] = useState('');

  // AI Polish State
  const [isPolishing, setIsPolishing] = useState(false);

  // Confirmation State
  const [noteToDelete, setNoteToDelete] = useState<KeepNoteRecord | null>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const path = 'notes';
    const q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: KeepNoteRecord[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setNotes(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newTitle.trim()) return;

    const path = 'notes';
    const noteId = 'note_' + Date.now();
    const tagArray = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const record: KeepNoteRecord = {
        id: noteId,
        userId: auth.currentUser.uid,
        title: newTitle.trim(),
        content: newContent.trim(),
        color: newColor,
        isPinned: false,
        tags: tagArray,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, path, noteId), record);
      setNewTitle('');
      setNewContent('');
      setNewTags('');
      setIsCreating(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const handleTogglePin = async (note: KeepNoteRecord) => {
    const path = 'notes';
    try {
      await updateDoc(doc(db, path, note.id), {
        isPinned: !note.isPinned,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    const path = 'notes';
    try {
      await deleteDoc(doc(db, path, noteToDelete.id));
      setNoteToDelete(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  // AI Note Polish
  const handleAiPolish = async () => {
    if (!newContent.trim()) return;
    setIsPolishing(true);
    try {
      const res = await runGeminiAnalysis('note_polish', { text: newContent });
      setNewContent(res.text.trim());
    } catch (err: any) {
      alert(`AI note polish error: ${err.message}`);
    } finally {
      setIsPolishing(false);
    }
  };

  // Export note to Google Doc
  const handleExportToGoogleDoc = async (note: KeepNoteRecord) => {
    try {
      const docRes = await gateway.docs.createDocument(note.title);
      alert(`Created Google Doc "${note.title}" in your Google Drive!`);
      if (docRes.documentId) {
        window.open(`https://docs.google.com/document/d/${docRes.documentId}/edit`, '_blank');
      }
    } catch (err: any) {
      alert(`Could not export to Google Docs: ${err.message}`);
    }
  };

  // Export note to Google Tasks
  const handleExportToTasks = async (note: KeepNoteRecord) => {
    try {
      await gateway.tasks.createTask('@default', {
        title: note.title,
        notes: note.content,
      });
      alert(`Saved note as a new Google Task!`);
    } catch (err: any) {
      alert(`Could not export to Google Tasks: ${err.message}`);
    }
  };

  const filteredNotes = notes.filter((n) =>
    (n.title + ' ' + n.content + ' ' + n.tags.join(' ')).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const otherNotes = filteredNotes.filter((n) => !n.isPinned);

  const getColorClasses = (colorId: string) => {
    const found = NOTE_COLORS.find((c) => c.id === colorId);
    return found ? found.bg : NOTE_COLORS[0].bg;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <StickyNote className="w-6 h-6 text-amber-500" />
              Google Keep Notes &amp; Ideas Sync
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Organize notes, pin key thoughts, synchronize across all devices via Firestore, and export directly to Google Docs &amp; Tasks.
            </p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-5 relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search notes and tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* New Note Creator Form */}
      {isCreating && (
        <form
          onSubmit={handleSaveNote}
          className="bg-white dark:bg-slate-900 border-2 border-amber-400 rounded-2xl p-5 shadow-lg space-y-4 max-w-xl mx-auto animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Create Sticky Note
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <input
            type="text"
            required
            placeholder="Note title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full font-semibold text-sm bg-transparent border-b border-slate-200 dark:border-slate-700 pb-2 focus:outline-none focus:border-amber-500 text-slate-900 dark:text-slate-100"
          />

          <textarea
            rows={4}
            placeholder="Take a note or braindump ideas..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full text-xs leading-relaxed bg-transparent focus:outline-none text-slate-800 dark:text-slate-200 resize-none"
          />

          <input
            type="text"
            placeholder="Tags (comma-separated, e.g. project, marketing, ideas)"
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            className="w-full text-xs px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none"
          />

          {/* Color Chooser & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              {NOTE_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setNewColor(c.id)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    c.bg.split(' ')[0]
                  } ${newColor === c.id ? 'scale-125 border-amber-600' : 'border-slate-300'}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAiPolish}
                disabled={isPolishing || !newContent.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-200 transition-colors disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isPolishing ? 'animate-spin' : ''}`} />
                {isPolishing ? 'Polishing...' : 'AI Polish'}
              </button>

              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-sm transition-colors"
              >
                Save Note
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Notes Grid Display */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          Loading synchronized notes...
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400">
          No notes found. Click &ldquo;New Note&rdquo; to organize your thoughts and sync across devices.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-amber-500" />
                Pinned Notes
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {pinnedNotes.map((note) => renderNoteCard(note))}
              </div>
            </div>
          )}

          {/* Others Section */}
          {otherNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Others
                </span>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {otherNotes.map((note) => renderNoteCard(note))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Note Deletion */}
      <ConfirmDialog
        isOpen={!!noteToDelete}
        title="Delete Keep Note"
        description={`Are you sure you want to delete "${noteToDelete?.title}"? This note will be removed across all devices.`}
        confirmLabel="Delete Note"
        isDestructive={true}
        onConfirm={confirmDeleteNote}
        onCancel={() => setNoteToDelete(null)}
      />
    </div>
  );

  function renderNoteCard(note: KeepNoteRecord) {
    return (
      <div
        key={note.id}
        className={`p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between space-y-4 ${getColorClasses(
          note.color
        )}`}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {note.title}
            </h4>

            <button
              onClick={() => handleTogglePin(note)}
              className={`p-1 rounded-lg transition-colors ${
                note.isPinned
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Pin className="w-4 h-4 fill-current" />
            </button>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-6">
            {note.content}
          </p>

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {note.tags.map((t, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExportToGoogleDoc(note)}
              title="Export note into a Google Doc"
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleExportToTasks(note)}
              title="Add note as a Google Task"
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setNoteToDelete(note)}
            className="p-1.5 rounded-lg hover:bg-rose-100 hover:text-rose-600 text-slate-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
};
