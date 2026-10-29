import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock,
  ListCheck,
} from 'lucide-react';
import { gateway } from '../../services/workspaceGateway';
import { runGeminiAnalysis } from '../../services/aiService';
import { ConfirmDialog } from '../ConfirmDialog';
import type { GoogleTaskItem } from '../../types/workspace';

export const TasksModule: React.FC = () => {
  const [taskLists, setTaskLists] = useState<{ id: string; title: string }[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('@default');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // AI Breakdown Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [rawTextForAi, setRawTextForAi] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Confirmation State
  const [taskToDelete, setTaskToDelete] = useState<GoogleTaskItem | null>(null);

  const fetchTaskLists = async () => {
    try {
      const res = await gateway.tasks.listTaskLists();
      if (res.items && res.items.length > 0) {
        setTaskLists(res.items);
        setSelectedListId(res.items[0].id);
      }
    } catch (err: any) {
      console.warn('Task lists fetch notice:', err.message);
    }
  };

  const fetchTasks = async (listId: string = selectedListId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await gateway.tasks.listTasks(listId);
      setTasks(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to pull Google Tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskLists();
  }, []);

  useEffect(() => {
    if (selectedListId) {
      fetchTasks(selectedListId);
    }
  }, [selectedListId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsAdding(true);
    try {
      const dueTimestamp = newTaskDue ? new Date(newTaskDue).toISOString() : undefined;
      await gateway.tasks.createTask(selectedListId, {
        title: newTaskTitle.trim(),
        notes: newTaskNotes.trim() || undefined,
        due: dueTimestamp,
      });

      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDue('');
      await fetchTasks(selectedListId);
    } catch (err: any) {
      alert(`Could not create Google Task: ${err.message}`);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleTask = async (task: GoogleTaskItem) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );

    try {
      await gateway.tasks.updateTask(selectedListId, task.id, {
        id: task.id,
        status: newStatus,
        completed: newStatus === 'completed' ? new Date().toISOString() : null,
      });
    } catch (err: any) {
      // Revert if error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
      alert(`Could not update task status: ${err.message}`);
    }
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await gateway.tasks.deleteTask(selectedListId, taskToDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    } catch (err: any) {
      alert(`Could not delete task: ${err.message}`);
    }
  };

  // AI Task Breakdown
  const handleAiBreakdown = async () => {
    if (!rawTextForAi.trim()) return;
    setAiGenerating(true);
    try {
      const res = await runGeminiAnalysis('tasks_breakdown', { text: rawTextForAi });
      let parsedTasks: any[] = [];
      try {
        const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedTasks = JSON.parse(cleaned);
      } catch {
        // Fallback
      }

      if (Array.isArray(parsedTasks)) {
        for (const item of parsedTasks) {
          if (item.title) {
            await gateway.tasks.createTask(selectedListId, {
              title: item.title,
              notes: item.notes || `Priority: ${item.urgency || 'Normal'}`,
            });
          }
        }
        setIsAiModalOpen(false);
        setRawTextForAi('');
        await fetchTasks(selectedListId);
      }
    } catch (err: any) {
      alert(`AI Task Breakdown failed: ${err.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  // Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ListCheck className="w-6 h-6 text-emerald-600" />
              Google Tasks &amp; Project Dashboard
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track project milestones, sync Google Tasks seamlessly, and convert unstructured thoughts into action items with Gemini.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              AI Task Breakdown
            </button>

            <button
              onClick={() => fetchTasks(selectedListId)}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dashboard Progress Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">
              Total Tasks
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {totalTasks}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 uppercase font-semibold">
              Completed
            </span>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
              {completedTasks}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <span className="text-xs text-blue-700 dark:text-blue-400 uppercase font-semibold">
              Pending
            </span>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
              {pendingTasks}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
            <span className="text-xs text-purple-700 dark:text-purple-400 uppercase font-semibold">
              Progress Rate
            </span>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
              {completionRate}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Grid: Create Task & Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Create Task Form */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            Add New Google Task
          </h3>

          <form onSubmit={handleCreateTask} className="space-y-4">
            {taskLists.length > 1 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Task List
                </label>
                <select
                  value={selectedListId}
                  onChange={(e) => setSelectedListId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                >
                  {taskLists.map((tl) => (
                    <option key={tl.id} value={tl.id}>
                      {tl.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Finalize slide deck for investors"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                placeholder="Additional requirements or links..."
                value={newTaskNotes}
                onChange={(e) => setNewTaskNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              {isAdding ? 'Adding Task...' : 'Add to Google Tasks'}
            </button>
          </form>
        </div>

        {/* Task List */}
        <div className="lg:col-span-8 space-y-2.5">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
              Loading Google Tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              No tasks found. Create a task or use AI Task Breakdown to populate your list.
            </div>
          ) : (
            tasks.map((task) => {
              const isCompleted = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl transition-all flex items-start justify-between gap-4 ${
                    isCompleted
                      ? 'border-slate-100 dark:border-slate-800/60 opacity-60 bg-slate-50/50 dark:bg-slate-800/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shrink-0"
                    >
                      {isCompleted ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div className="min-w-0 space-y-1">
                      <h4
                        className={`text-sm font-medium ${
                          isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </h4>

                      {task.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                          {task.notes}
                        </p>
                      )}

                      {task.due && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(task.due).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setTaskToDelete(task)}
                    title="Delete task (Requires confirmation)"
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* AI Task Breakdown Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Gemini AI Task Breakdown
              </h3>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste meeting notes, project briefs, or rough ideas. Gemini 3.1 Flash-Lite will convert them into structured, actionable Google Tasks.
            </p>

            <textarea
              rows={5}
              placeholder="e.g. Next week we need to finalize the quarterly review with sales, prepare the updated roadmap presentation for engineering, and send confirmation emails to all pilot clients..."
              value={rawTextForAi}
              onChange={(e) => setRawTextForAi(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-slate-100"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAiBreakdown}
                disabled={aiGenerating || !rawTextForAi.trim()}
                className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
              >
                {aiGenerating ? 'Generating Tasks...' : 'Convert to Tasks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Task Deletion */}
      <ConfirmDialog
        isOpen={!!taskToDelete}
        title="Delete Google Task"
        description={`Are you sure you want to delete the task "${taskToDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete Task"
        isDestructive={true}
        onConfirm={confirmDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};
