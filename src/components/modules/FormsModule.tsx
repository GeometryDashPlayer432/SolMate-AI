import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Search,
  ExternalLink,
  Plus,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { gateway } from '../../services/workspaceGateway';
import { runGeminiAnalysis } from '../../services/aiService';
import type { DriveFileItem } from '../../types/workspace';

export const FormsModule: React.FC = () => {
  const [forms, setForms] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Form Question Generator State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [surveyTopic, setSurveyTopic] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchForms = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gateway.drive.listFiles({
        q: "mimeType = 'application/vnd.google-apps.form' and trashed = false",
        pageSize: 30,
      });
      setForms(res.files || []);
    } catch (err: any) {
      setError(err.message || 'Failed to list Google Forms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const handleGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyTopic.trim()) return;

    setGenerating(true);
    try {
      const res = await runGeminiAnalysis('workspace_assistant', {
        prompt: `Generate a structured set of 6-8 effective survey or questionnaire questions for Google Forms on this topic:
Topic: "${surveyTopic.trim()}"

Include question types (e.g. Multiple Choice with 4 options, 1-5 Rating Scale, Short Text, Checkbox list). Formatted clearly so users can copy-paste straight into Google Forms.`,
      });
      setGeneratedQuestions(res.text);
    } catch (err: any) {
      alert(`Could not generate questions: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-violet-600" />
              Google Forms Hub &amp; AI Question Architect
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Pull, inspect, and open all your Google Forms in one unified dashboard, and generate survey questions with Gemini.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAiOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              AI Survey Generator
            </button>

            <a
              href="https://forms.new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Form in Google
            </a>

            <button
              onClick={fetchForms}
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

      {/* Forms Grid */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-2" />
          Querying your Google Forms...
        </div>
      ) : forms.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400 space-y-3">
          <FileCheck2 className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
          <p className="text-sm">No Google Forms found in Drive.</p>
          <a
            href="https://forms.new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:underline font-semibold"
          >
            Create your first Google Form
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form) => (
            <div
              key={form.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-violet-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                    <FileCheck2 className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {form.modifiedTime ? new Date(form.modifiedTime).toLocaleDateString() : ''}
                  </span>
                </div>

                <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {form.name}
                </h4>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                {form.webViewLink && (
                  <a
                    href={form.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-violet-600 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Google Forms
                  </a>
                )}

                <a
                  href={`https://docs.google.com/forms/d/${form.id}/edit#responses`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-[11px]"
                >
                  View Responses
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Survey Generator Modal */}
      {isAiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                Gemini Survey &amp; Form Generator
              </h3>
              <button
                onClick={() => {
                  setIsAiOpen(false);
                  setGeneratedQuestions(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {!generatedQuestions ? (
              <form onSubmit={handleGenerateQuestions} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Form / Survey Topic *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Employee Remote Work Satisfaction Survey, Event Feedback, Client Onboarding"
                    value={surveyTopic}
                    onChange={(e) => setSurveyTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAiOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generating || !surveyTopic.trim()}
                    className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
                  >
                    {generating ? 'Drafting Questions...' : 'Generate Questions'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-80 overflow-y-auto">
                  {generatedQuestions}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setGeneratedQuestions(null)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    ← Change Topic
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedQuestions);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied to Clipboard' : 'Copy All Questions'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
