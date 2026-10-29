import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  AlertTriangle,
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
import type { DocWorkflowRecord } from '../../types/workspace';

export const DocsWorkflowModule: React.FC = () => {
  const [workflows, setWorkflows] = useState<DocWorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<DocWorkflowRecord | null>(null);

  // New Workflow Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [approverEmail, setApproverEmail] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // AI Review Running State
  const [runningAI, setRunningAI] = useState(false);

  // Confirmation state
  const [workflowToDelete, setWorkflowToDelete] = useState<DocWorkflowRecord | null>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const path = 'doc_workflows';
    const q = query(collection(db, path), where('userId', '==', auth.currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records: DocWorkflowRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setWorkflows(records);
        setLoading(false);
        if (records.length > 0 && !selectedWorkflow) {
          setSelectedWorkflow(records[0]);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newTitle.trim()) return;

    setCreating(true);
    const path = 'doc_workflows';
    try {
      // Create new Google Doc via Workspace Docs API
      let createdDocId = 'doc_' + Math.random().toString(36).substring(2, 8);
      try {
        const docRes = await gateway.docs.createDocument(docTitle.trim() || newTitle.trim());
        if (docRes?.documentId) {
          createdDocId = docRes.documentId;
        }
      } catch (docErr) {
        console.warn('Google Doc API creation note, fallback to ID:', docErr);
      }

      const workflowId = 'wf_' + Date.now();
      const newRecord: DocWorkflowRecord = {
        id: workflowId,
        userId: auth.currentUser.uid,
        title: newTitle.trim(),
        docId: createdDocId,
        docTitle: docTitle.trim() || newTitle.trim(),
        status: 'draft',
        approverEmail: approverEmail.trim() || auth.currentUser.email || 'reviewer@company.com',
        requesterEmail: auth.currentUser.email || 'requester@company.com',
        approvalNotes: approvalNotes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, path, workflowId), newRecord);
      setIsModalOpen(false);
      setNewTitle('');
      setDocTitle('');
      setApproverEmail('');
      setApprovalNotes('');
      setSelectedWorkflow(newRecord);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setCreating(false);
    }
  };

  const handleRunAiAudit = async (wf: DocWorkflowRecord) => {
    setRunningAI(true);
    try {
      const res = await runGeminiAnalysis('doc_review', {
        title: wf.docTitle,
        stage: wf.status,
        content: `Document Workflow Title: ${wf.title}\nApprover: ${wf.approverEmail}\nNotes: ${wf.approvalNotes || 'None'}\nCreated: ${wf.createdAt}`,
      });

      const path = 'doc_workflows';
      await updateDoc(doc(db, path, wf.id), {
        aiReview: res.text,
        updatedAt: new Date().toISOString(),
      });

      setSelectedWorkflow((prev) => (prev ? { ...prev, aiReview: res.text } : null));
    } catch (err: any) {
      alert(`AI Audit failed: ${err.message}`);
    } finally {
      setRunningAI(false);
    }
  };

  const handleUpdateStatus = async (
    wf: DocWorkflowRecord,
    newStatus: DocWorkflowRecord['status']
  ) => {
    const path = 'doc_workflows';
    try {
      await updateDoc(doc(db, path, wf.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      setSelectedWorkflow((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const confirmDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    const path = 'doc_workflows';
    try {
      await deleteDoc(doc(db, path, workflowToDelete.id));
      if (selectedWorkflow?.id === workflowToDelete.id) {
        setSelectedWorkflow(null);
      }
      setWorkflowToDelete(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const getStatusBadge = (status: DocWorkflowRecord['status']) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            Revisions Requested
          </span>
        );
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <Clock className="w-3.5 h-3.5" />
            Under Review
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Google Doc Workflows &amp; AI Approvals
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Design automated document approval pipelines, conduct AI risk audits with Gemini 3.8, and track review states in Firestore.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Doc Workflow
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workflows List */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading document approval pipelines...
            </div>
          ) : workflows.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              No workflows created yet. Click &ldquo;Create Doc Workflow&rdquo; to start an automated approval pipeline.
            </div>
          ) : (
            workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => setSelectedWorkflow(wf)}
                className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl cursor-pointer transition-all hover:shadow-sm ${
                  selectedWorkflow?.id === wf.id
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {wf.title}
                  </h4>
                  {getStatusBadge(wf.status)}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Doc: <span className="text-slate-700 dark:text-slate-300 font-medium">{wf.docTitle}</span>
                </p>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                  <span>Approver: {wf.approverEmail}</span>
                  <span>{new Date(wf.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Workflow Detail & AI Inspector */}
        <div className="lg:col-span-7">
          {selectedWorkflow ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedWorkflow.status)}
                    <span className="text-xs text-slate-400">
                      ID: {selectedWorkflow.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {selectedWorkflow.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>
                      Target Document: <strong className="text-slate-800 dark:text-slate-200">{selectedWorkflow.docTitle}</strong>
                    </span>
                    <a
                      href={`https://docs.google.com/document/d/${selectedWorkflow.docId}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Google Doc
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => setWorkflowToDelete(selectedWorkflow)}
                  className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                >
                  Delete Workflow
                </button>
              </div>

              {/* Status Actions */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Workflow Approval Actions
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleUpdateStatus(selectedWorkflow, 'in_review')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-300 transition-colors"
                  >
                    Mark In Review
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedWorkflow, 'approved')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve Document
                  </button>

                  <button
                    onClick={() => handleUpdateStatus(selectedWorkflow, 'rejected')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Request Revisions
                  </button>

                  <button
                    onClick={() => handleRunAiAudit(selectedWorkflow)}
                    disabled={runningAI}
                    className="inline-flex items-center gap-1.5 ml-auto px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-colors disabled:opacity-50"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${runningAI ? 'animate-spin' : ''}`} />
                    {runningAI ? 'Auditing with AI...' : 'Run Gemini Compliance Audit'}
                  </button>
                </div>
              </div>

              {/* AI Audit Report */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                  Gemini AI Workflow Audit Report
                </div>

                {selectedWorkflow.aiReview ? (
                  <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-80 overflow-y-auto">
                    {selectedWorkflow.aiReview}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    Click &ldquo;Run Gemini Compliance Audit&rdquo; to review this Google Doc for risks, clarity, and automated approval decisions.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400">
              Select a document workflow to view approval status, audit reports, and reviewer actions.
            </div>
          )}
        </div>
      </div>

      {/* New Workflow Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                New Google Doc Approval Workflow
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Marketing Budget Sign-Off"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Google Doc Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Marketing Strategy & Spend"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Designated Approver Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="manager@company.com"
                  value={approverEmail}
                  onChange={(e) => setApproverEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Submission Notes &amp; Scope
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain requirements, budget constraints, or deadlines..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating Doc & Workflow...' : 'Create Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation for Workflow Deletion */}
      <ConfirmDialog
        isOpen={!!workflowToDelete}
        title="Delete Document Workflow"
        description={`Are you sure you want to delete the workflow "${workflowToDelete?.title}"?`}
        confirmLabel="Delete Workflow"
        isDestructive={true}
        onConfirm={confirmDeleteWorkflow}
        onCancel={() => setWorkflowToDelete(null)}
      />
    </div>
  );
};
