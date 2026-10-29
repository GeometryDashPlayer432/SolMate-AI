import React, { useState, useEffect } from 'react';
import {
  Presentation,
  Sparkles,
  Plus,
  ExternalLink,
  Download,
  RefreshCw,
  Copy,
  Check,
  Layers,
  FileText,
} from 'lucide-react';
import { gateway } from '../../services/workspaceGateway';
import { runGeminiAnalysis } from '../../services/aiService';
import type { DriveFileItem } from '../../types/workspace';

interface SlidePlan {
  presentationTitle: string;
  themeRecommendation: string;
  slides: {
    slideNumber: number;
    slideTitle: string;
    bulletPoints: string[];
    speakerNotes: string;
  }[];
}

export const SlidesModule: React.FC = () => {
  const [presentations, setPresentations] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Generator Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<SlidePlan | null>(null);
  const [copiedPlan, setCopiedPlan] = useState(false);

  // Create presentation in Slides API
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const fetchPresentations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await gateway.drive.listFiles({
        q: "mimeType = 'application/vnd.google-apps.presentation' and trashed = false",
        pageSize: 30,
        orderBy: 'modifiedTime desc',
      });
      setPresentations(res.files || []);
    } catch (err: any) {
      setError(err.message || 'Failed to pull Google Slides decks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPresentations();
  }, []);

  const handleGenerateOutline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setAiGenerating(true);
    try {
      const res = await runGeminiAnalysis('slide_generator', {
        topic: topic.trim(),
        audience: audience.trim() || 'General Team / Executive Leadership',
      });

      let plan: SlidePlan | null = null;
      try {
        const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
        plan = JSON.parse(cleaned);
      } catch {
        // Fallback structure
        plan = {
          presentationTitle: topic.trim(),
          themeRecommendation: 'Modern Professional Minimalist',
          slides: [
            {
              slideNumber: 1,
              slideTitle: topic.trim(),
              bulletPoints: ['Executive Overview', 'Key Objectives', 'Market Context'],
              speakerNotes: 'Welcome attendees and introduce the topic.',
            },
          ],
        };
      }

      setGeneratedPlan(plan);
    } catch (err: any) {
      alert(`AI Outline generation failed: ${err.message}`);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateEmptyDeck = async () => {
    const title = prompt('Enter a title for the new Google Slides presentation:');
    if (!title?.trim()) return;

    setIsCreatingNew(true);
    try {
      const created = await gateway.slides.createPresentation(title.trim());
      await fetchPresentations();
      if (created.presentationId) {
        window.open(`https://docs.google.com/presentation/d/${created.presentationId}/edit`, '_blank');
      }
    } catch (err: any) {
      alert(`Could not create presentation: ${err.message}`);
    } finally {
      setIsCreatingNew(false);
    }
  };

  const copyOutlineText = () => {
    if (!generatedPlan) return;
    const formatted = `PRESENTATION: ${generatedPlan.presentationTitle}\nTHEME: ${generatedPlan.themeRecommendation}\n\n` +
      generatedPlan.slides
        .map(
          (s) =>
            `Slide ${s.slideNumber}: ${s.slideTitle}\n` +
            s.bulletPoints.map((b) => `  * ${b}`).join('\n') +
            `\nSpeaker Notes: ${s.speakerNotes}\n`
        )
        .join('\n---\n');

    navigator.clipboard.writeText(formatted);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Presentation className="w-6 h-6 text-amber-500" />
              Google Slides Integration &amp; AI Deck Creator
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Integrate Google Slides presentations, generate complete multi-slide outlines with Gemini 3.8, and export decks directly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Generate AI Slide Deck
            </button>

            <button
              onClick={handleCreateEmptyDeck}
              disabled={isCreatingNew}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Deck
            </button>

            <button
              onClick={fetchPresentations}
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

      {/* Presentation Cards Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Your Google Slides Decks ({presentations.length})
        </h3>

        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
            Loading presentation decks...
          </div>
        ) : presentations.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            No Google Slides presentations found. Click &ldquo;Generate AI Slide Deck&rdquo; to draft a new presentation.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presentations.map((deck) => (
              <div
                key={deck.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                      <Presentation className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {deck.modifiedTime ? new Date(deck.modifiedTime).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm line-clamp-2">
                    {deck.name}
                  </h4>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  {deck.webViewLink && (
                    <a
                      href={deck.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Presentation
                    </a>
                  )}

                  <a
                    href={`https://docs.google.com/presentation/d/${deck.id}/export/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Export as PDF"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Slide Deck Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Gemini AI Slide Deck Architect
              </h3>
              <button
                onClick={() => {
                  setIsAiModalOpen(false);
                  setGeneratedPlan(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {!generatedPlan ? (
              <form onSubmit={handleGenerateOutline} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Presentation Topic / Objective *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI-Powered Workflow Transformation for Enterprises"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Executive Board, Product Managers, Engineering Leads"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={aiGenerating || !topic.trim()}
                    className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
                  >
                    {aiGenerating ? 'Architecting Presentation...' : 'Generate Deck Plan'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <h4 className="font-bold text-base text-amber-900 dark:text-amber-200">
                    {generatedPlan.presentationTitle}
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Theme Recommendation: {generatedPlan.themeRecommendation}
                  </p>
                </div>

                <div className="space-y-3">
                  {generatedPlan.slides.map((s) => (
                    <div
                      key={s.slideNumber}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          Slide {s.slideNumber}
                        </span>
                        <h5 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {s.slideTitle}
                        </h5>
                      </div>

                      <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                        {s.bulletPoints.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>

                      {s.speakerNotes && (
                        <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100 dark:border-slate-800">
                          Notes: {s.speakerNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setGeneratedPlan(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700"
                  >
                    ← Design Another
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyOutlineText}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      {copiedPlan ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedPlan ? 'Copied to Clipboard' : 'Copy Outline'}
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          const created = await gateway.slides.createPresentation(generatedPlan.presentationTitle);
                          if (created.presentationId) {
                            window.open(`https://docs.google.com/presentation/d/${created.presentationId}/edit`, '_blank');
                            setIsAiModalOpen(false);
                            fetchPresentations();
                          }
                        } catch (e: any) {
                          alert(`Could not create deck: ${e.message}`);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create in Google Slides
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
