import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Key,
  Shield,
  Send,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  LogOut,
  ArrowLeft,
  Eye,
  EyeOff,
  Plus,
  Clock,
  Trash2,
  MessageSquare,
  Search,
  FolderPlus,
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  BookOpen,
  Bell,
  AlertTriangle,
  Youtube
} from 'lucide-react';
import {
  SocietySettings,
  MemberAccount,
  TaskForm,
  TaskSubmission,
  TaskQuestion,
  TaskInfoUpdate,
  MemberNotification
} from '../types';
import {
  authenticateMember,
  getTaskForms,
  subscribeToTaskForms,
  getTaskSubmissions,
  subscribeToTaskSubmissions,
  saveTaskSubmission,
  addTaskInfoUpdate,
  deleteTaskSubmission,
  getMemberNotifications,
  subscribeToMemberNotifications,
  filterPendingNotificationsForMember,
  acknowledgeNotification
} from '../lib/firebase';
import { PhotoUploader } from './PhotoUploader';

interface MemberInfoPortalProps {
  settings: SocietySettings;
  onNavigateToCandidate?: () => void;
}

export const MemberInfoPortal: React.FC<MemberInfoPortalProps> = ({
  settings,
  onNavigateToCandidate
}) => {
  // Member authentication state
  const [aliasInput, setAliasInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeMember, setActiveMember] = useState<MemberAccount | null>(() => {
    try {
      const cached = sessionStorage.getItem('secretsociety_member_session');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  // Active view tab: 'forms' (Browse & Fill Forms) vs 'submissions' (My Filings & Continuous Info)
  const [activeTab, setActiveTab] = useState<'forms' | 'submissions'>('forms');

  // Task Forms & Submissions state
  const [taskForms, setTaskForms] = useState<TaskForm[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Active form filling modal state
  const [activeFillingForm, setActiveFillingForm] = useState<TaskForm | null>(null);
  const [filingPurpose, setFilingPurpose] = useState('');
  const [filingAnswers, setFilingAnswers] = useState<Record<string, any>>({});
  const [filingPhotos, setFilingPhotos] = useState<Record<string, string[]>>({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [filingError, setFilingError] = useState<string | null>(null);
  const [filingSuccess, setFilingSuccess] = useState<string | null>(null);

  // Expanded submission cards in the submissions view
  const [expandedSubmissions, setExpandedSubmissions] = useState<Record<string, boolean>>({});

  // Append new information to allowed box state: submissionId_questionId -> content
  const [appendInfoTexts, setAppendInfoTexts] = useState<Record<string, string>>({});
  const [isAppendingInfo, setIsAppendingInfo] = useState<Record<string, boolean>>({});
  const [appendSuccess, setAppendSuccess] = useState<Record<string, string | null>>({});

  // Filter submissions by form
  const [submissionFormFilter, setSubmissionFormFilter] = useState<string>('all');

  // Load and subscribe to task forms
  useEffect(() => {
    getTaskForms().then(setTaskForms).catch(console.warn);
    const unsubscribeForms = subscribeToTaskForms((forms) => {
      setTaskForms(forms);
    });
    return () => unsubscribeForms();
  }, []);

  // Load and subscribe to task submissions for active member
  useEffect(() => {
    if (!activeMember) return;
    getTaskSubmissions(activeMember.alias).then(setSubmissions).catch(console.warn);
    const unsubscribeSubmissions = subscribeToTaskSubmissions((subs) => {
      setSubmissions(subs);
    }, activeMember.alias);
    return () => unsubscribeSubmissions();
  }, [activeMember]);

  // Member Written Notifications State (Appears on screen upon login)
  const [pendingNotifications, setPendingNotifications] = useState<MemberNotification[]>([]);
  const [isAcknowledgingNotice, setIsAcknowledgingNotice] = useState(false);

  // Subscribe to pending notifications targeted to this member
  useEffect(() => {
    if (!activeMember) {
      setPendingNotifications([]);
      return;
    }

    const checkAndSet = (notices: MemberNotification[]) => {
      const pending = filterPendingNotificationsForMember(notices, activeMember.alias);
      setPendingNotifications(pending);
    };

    getMemberNotifications().then(checkAndSet).catch(console.warn);
    const unsubscribe = subscribeToMemberNotifications(checkAndSet);
    return () => unsubscribe();
  }, [activeMember]);

  // Acknowledge notification: member clicks "OK" under notification box
  const handleAcknowledgeNotification = async (noticeId: string) => {
    if (!activeMember) return;
    setIsAcknowledgingNotice(true);
    try {
      // Optimistically remove immediately from screen
      setPendingNotifications((prev) => prev.filter((n) => n.id !== noticeId));
      // Persist acknowledgment so it never shows again
      await acknowledgeNotification(noticeId, activeMember.alias);
    } catch (err) {
      console.error('Failed to acknowledge notification:', err);
    } finally {
      setIsAcknowledgingNotice(false);
    }
  };

  // Handle member login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasInput.trim() || !passwordInput.trim()) {
      setAuthError('Please enter both Member Alias and Password');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const member = await authenticateMember(aliasInput.trim(), passwordInput.trim());
      if (member) {
        setActiveMember(member);
        sessionStorage.setItem('secretsociety_member_session', JSON.stringify(member));
        setAliasInput('');
        setPasswordInput('');
      } else {
        setAuthError('Invalid credentials. Access restricted to verified council members.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle member logout
  const handleLogout = () => {
    setActiveMember(null);
    sessionStorage.removeItem('secretsociety_member_session');
    setActiveFillingForm(null);
    setFilingPurpose('');
    setFilingAnswers({});
  };

  // Categories list derived from forms
  const categories = useMemo(() => {
    const set = new Set<string>();
    taskForms.forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [taskForms]);

  // Filtered task forms based on search and category
  const filteredForms = useMemo(() => {
    return taskForms.filter((f) => {
      if (selectedCategory !== 'all' && f.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = f.title.toLowerCase().includes(q);
        const matchesDesc = (f.description || '').toLowerCase().includes(q);
        const matchesCategory = (f.category || '').toLowerCase().includes(q);
        const matchesQuestion = f.questions.some(
          (qu) =>
            qu.label.toLowerCase().includes(q) ||
            (qu.description && qu.description.toLowerCase().includes(q))
        );
        return matchesTitle || matchesDesc || matchesCategory || matchesQuestion;
      }
      return true;
    });
  }, [taskForms, searchQuery, selectedCategory]);

  // Filtered submissions based on search and form filter
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (submissionFormFilter !== 'all' && sub.formId !== submissionFormFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPurpose = sub.purpose.toLowerCase().includes(q);
        const matchesFormTitle = sub.formTitle.toLowerCase().includes(q);
        const matchesUpdates = sub.infoUpdates?.some((up) =>
          up.content.toLowerCase().includes(q)
        );
        return matchesPurpose || matchesFormTitle || matchesUpdates;
      }
      return true;
    });
  }, [submissions, searchQuery, submissionFormFilter]);

  // Open form to fill out for a new purpose
  const handleOpenFillForm = (form: TaskForm) => {
    setActiveFillingForm(form);
    setFilingPurpose('');
    setFilingAnswers({});
    setFilingPhotos({});
    setFilingError(null);
    setFilingSuccess(null);
  };

  // Submit task form for a specific purpose
  const handleSubmitTaskFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember || !activeFillingForm) return;

    if (!filingPurpose.trim()) {
      setFilingError('Please specify the purpose for this filing.');
      return;
    }

    // Validate required questions
    for (const q of activeFillingForm.questions) {
      if (q.required) {
        const val = filingAnswers[q.id];
        if (val === undefined || val === null || val === '') {
          setFilingError(`Required field missing: "${q.label}"`);
          return;
        }
      }
    }

    setIsSubmittingForm(true);
    setFilingError(null);

    try {
      const newSubmission: TaskSubmission = {
        id: `tsub_${Date.now()}`,
        formId: activeFillingForm.id,
        formTitle: activeFillingForm.title,
        memberAlias: activeMember.alias,
        memberName: activeMember.name || activeMember.alias,
        purpose: filingPurpose.trim(),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        answers: { ...filingAnswers },
        infoUpdates: []
      };

      const savedId = await saveTaskSubmission(newSubmission);
      setFilingSuccess('Task submission recorded successfully.');

      setTimeout(() => {
        setActiveFillingForm(null);
        setActiveTab('submissions');
        setExpandedSubmissions((prev) => ({ ...prev, [savedId]: true }));
        setFilingSuccess(null);
      }, 900);
    } catch (err: any) {
      setFilingError(err.message || 'Failed to record task submission.');
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Append new information into an allowed box in a submission
  const handleAppendInfo = async (
    submission: TaskSubmission,
    question: TaskQuestion
  ) => {
    const key = `${submission.id}_${question.id}`;
    const text = (appendInfoTexts[key] || '').trim();
    if (!text || !activeMember) return;

    setIsAppendingInfo((prev) => ({ ...prev, [key]: true }));

    const update: TaskInfoUpdate = {
      id: `up_${Date.now()}`,
      questionId: question.id,
      questionLabel: question.label,
      content: text,
      addedAt: new Date().toISOString(),
      memberAlias: activeMember.alias,
      memberName: activeMember.name || activeMember.alias
    };

    try {
      await addTaskInfoUpdate(submission.id, update);
      setAppendInfoTexts((prev) => ({ ...prev, [key]: '' }));
      setAppendSuccess((prev) => ({ ...prev, [key]: 'Information updated successfully.' }));
      setTimeout(() => {
        setAppendSuccess((prev) => ({ ...prev, [key]: null }));
      }, 3000);
    } catch (err) {
      console.error('Failed to append info:', err);
    } finally {
      setIsAppendingInfo((prev) => ({ ...prev, [key]: false }));
    }
  };

  // Delete a submission
  const handleDeleteSubmission = async (id: string) => {
    if (confirm('Delete this task submission and all its associated info records?')) {
      try {
        await deleteTaskSubmission(id);
      } catch (err) {
        console.error('Failed to delete submission:', err);
      }
    }
  };

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedSubmissions((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // =========================================================================
  // VIEW 1: AUTHENTICATION SCREEN (IF NOT LOGGED IN)
  // =========================================================================
  if (!activeMember) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-black border border-white/20 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full border border-white/30 bg-black flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-chancery text-2xl sm:text-3xl font-bold tracking-wide text-white">
              {settings.memberPortalHeading || settings.heading || 'secretsociety_ind'}
            </h1>
            <p className="font-mono text-xs uppercase tracking-wider text-white/70">
              Member Task & Information System
            </p>
            <p className="font-editorial italic text-xs sm:text-sm text-white/60 max-w-xs mx-auto pt-1">
              Authorized credentials required. Log in with your council alias and password to access task directives and log operational intelligence.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-lg border border-white/40 bg-white/5 flex items-start gap-2.5 text-white text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
              <span className="font-body leading-relaxed">{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="memberAliasInput"
                className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80 mb-1"
              >
                Member Alias
              </label>
              <div className="relative">
                <input
                  id="memberAliasInput"
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="e.g. ARCHON_01"
                  required
                  autoCapitalize="characters"
                  className="w-full font-mono pl-9 pr-3 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors uppercase tracking-wider"
                />
                <User className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label
                htmlFor="memberPasswordInput"
                className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80 mb-1"
              >
                Custom Password
              </label>
              <div className="relative">
                <input
                  id="memberPasswordInput"
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full font-mono pl-9 pr-10 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
                />
                <Key className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="memberLoginBtn"
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-display text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-black" />
                  Authenticate Member Access
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED MEMBER TASK SYSTEM DASHBOARD
  // =========================================================================
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* =========================================================================
          PRIORITY WRITTEN NOTIFICATION OVERLAY (Appears on screen at first upon login)
          ========================================================================= */}
      {pendingNotifications.length > 0 && (() => {
        const currentNotice = pendingNotifications[0];
        const isUrgent = currentNotice.urgency === 'urgent';
        const remainingCount = pendingNotifications.length;

        return (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Glass Light Background Notification Box */}
            <div className="w-full max-w-xl bg-white/90 backdrop-blur-2xl border border-white/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(255,255,255,0.25)] overflow-hidden flex flex-col my-auto">
              
              {/* Top Header of Notification Box */}
              <div
                className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 ${
                  isUrgent ? 'bg-red-500/10 border-red-500/30' : 'bg-white/60 border-black/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl border shadow-sm ${
                      isUrgent
                        ? 'bg-red-600 border-red-700 text-white'
                        : 'bg-black text-white border-black'
                    }`}
                  >
                    {isUrgent ? (
                      <AlertTriangle className="w-5 h-5 text-white" />
                    ) : (
                      <Bell className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border font-bold ${
                          isUrgent
                            ? 'bg-red-600 border-red-700 text-white'
                            : 'bg-black border-black text-white'
                        }`}
                      >
                        {isUrgent ? 'URGENT COUNCIL DIRECTIVE' : 'OFFICIAL COUNCIL NOTICE'}
                      </span>
                      {remainingCount > 1 && (
                        <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-black/10 border border-black/15 text-neutral-800 font-semibold">
                          Directive 1 of {remainingCount}
                        </span>
                      )}
                    </div>
                    <h2 className="font-chancery text-lg sm:text-xl font-bold tracking-wide text-neutral-900 mt-1">
                      {currentNotice.title}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Meta information */}
              <div className="px-5 py-2.5 bg-black/[0.04] border-b border-black/10 flex items-center justify-between text-xs font-mono text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  <span>
                    Directed to: <strong className="text-neutral-900">{activeMember.alias}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-500" />
                  <span>
                    {new Date(currentNotice.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              {/* Written Notification Content Body */}
              <div className="p-5 sm:p-7 space-y-4 max-h-[50vh] overflow-y-auto">
                <div className="font-mono text-xs sm:text-sm text-neutral-900 whitespace-pre-wrap leading-relaxed bg-white/70 backdrop-blur-md border border-black/10 rounded-xl p-4 sm:p-5 shadow-sm">
                  {currentNotice.message}
                </div>
              </div>

              {/* Notification Box Footer with "OK" Button DIRECTLY UNDER */}
              <div className="p-4 sm:p-5 border-t border-black/10 bg-black/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="font-editorial italic text-xs text-neutral-600 text-center sm:text-left">
                  Click OK to acknowledge. This notice will not show again once acknowledged.
                </p>

                <button
                  type="button"
                  disabled={isAcknowledgingNotice}
                  onClick={() => handleAcknowledgeNotification(currentNotice.id)}
                  className="w-full sm:w-auto min-w-[140px] px-8 py-3 rounded-xl bg-black text-white hover:bg-neutral-800 active:scale-95 font-display text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                >
                  {isAcknowledgingNotice ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>OK</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Header Bar */}
      <div className="bg-black border border-white/20 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white font-medium">
              Task System
            </span>
            <h1 className="font-chancery text-lg sm:text-2xl font-bold tracking-wide text-white">
              {settings.memberPortalHeading || settings.heading || 'secretsociety_ind'}
            </h1>
          </div>
          <p className="font-editorial italic text-xs text-white/70 max-w-xl">
            {settings.memberPortalNotice ||
              'Member Task & Information Operations. Select or search a task directive, fill out the form for your specific purpose, and log ongoing updates in authorized boxes.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <div className="text-right">
            <div className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 justify-end">
              <User className="w-3.5 h-3.5 text-white" />
              {activeMember.alias}
            </div>
            {activeMember.role && (
              <div className="font-mono text-[10px] text-white/60">
                {activeMember.role}
              </div>
            )}
          </div>

          <button
            id="memberLogoutBtn"
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-lg border border-white/20 hover:border-white text-white/70 hover:text-white bg-black transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-white/20 gap-2 overflow-x-auto scrollbar-none pb-px">
        <button
          id="tabFormsBtn"
          type="button"
          onClick={() => setActiveTab('forms')}
          className={`pb-3 px-4 font-display text-xs uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'forms'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-white" />
          <span>Task Forms</span>
          <span className="font-mono text-[10px] opacity-75">({taskForms.length})</span>
        </button>

        <button
          id="tabSubmissionsBtn"
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-4 font-display text-xs uppercase tracking-wider transition-colors border-b-2 flex items-center gap-2 shrink-0 ${
            activeTab === 'submissions'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-white" />
          <span>My Filings & Submissions</span>
          <span className="font-mono text-[10px] opacity-75">({submissions.length})</span>
        </button>
      </div>

      {/* Global Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            id="taskSearchInput"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'forms'
                ? 'Search task forms by title, topic, or field labels...'
                : 'Search your filings by purpose, form, or information notes...'
            }
            className="w-full font-body pl-9 pr-4 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
          />
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {activeTab === 'forms' && categories.length > 0 && (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase shrink-0"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}

        {activeTab === 'submissions' && taskForms.length > 0 && (
          <select
            value={submissionFormFilter}
            onChange={(e) => setSubmissionFormFilter(e.target.value)}
            className="font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase shrink-0"
          >
            <option value="all">All Task Forms</option>
            {taskForms.map((tf) => (
              <option key={tf.id} value={tf.id}>
                {tf.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* =====================================================================
          TAB 1: TASK FORMS BROWSER
          ===================================================================== */}
      {activeTab === 'forms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-chancery text-base sm:text-lg tracking-wide text-white/90 font-semibold">
              Available Task Forms ({filteredForms.length})
            </h2>
            <span className="font-mono text-[11px] text-white/50">
              You can fill any form multiple times for distinct purposes.
            </span>
          </div>

          {filteredForms.length === 0 ? (
            <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-12 text-center space-y-3">
              <FileText className="w-8 h-8 text-white/40 mx-auto" />
              <h3 className="font-chancery text-lg font-semibold tracking-wide text-white">
                No Matching Task Forms Found
              </h3>
              <p className="font-editorial italic text-xs sm:text-sm text-white/60 max-w-sm mx-auto">
                No task forms match your current search query. Forms configured in the Admin Portal will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredForms.map((form) => {
                const countAllowedBoxes = form.questions.filter((q) => q.allowAddInfo).length;
                const myFilingsForThisForm = submissions.filter((s) => s.formId === form.id);

                return (
                  <div
                    key={form.id}
                    className="bg-black border border-white/20 hover:border-white/40 rounded-xl p-5 flex flex-col justify-between space-y-4 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {form.category && (
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/70 bg-white/5 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-white/60" />
                            {form.category}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-white/50">
                          {form.questions.length} Question{form.questions.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <h3 className="font-chancery text-lg sm:text-xl font-bold tracking-wide text-white">
                        {form.title}
                      </h3>

                      {form.description && (
                        <p className="font-editorial italic text-xs text-white/75 leading-relaxed">
                          {form.description}
                        </p>
                      )}

                      {/* Badges */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {countAllowedBoxes > 0 ? (
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/40 bg-white/10 text-white font-medium flex items-center gap-1">
                            <Check className="w-3 h-3 text-white" />
                            {countAllowedBoxes} Box{countAllowedBoxes === 1 ? '' : 'es'} Allow Continuous Info
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 text-white/40">
                            Fixed Submission Only
                          </span>
                        )}

                        {myFilingsForThisForm.length > 0 && (
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/80 bg-white/5">
                            Filed {myFilingsForThisForm.length} time{myFilingsForThisForm.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      {myFilingsForThisForm.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSubmissionFormFilter(form.id);
                            setActiveTab('submissions');
                          }}
                          className="font-mono text-xs text-white/70 hover:text-white transition-colors underline underline-offset-2"
                        >
                          View Past Filings ({myFilingsForThisForm.length})
                        </button>
                      ) : (
                        <span className="font-mono text-[11px] text-white/40">
                          No filings yet
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenFillForm(form)}
                        className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 text-black" />
                        Fill Form (New Purpose)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: MY SUBMISSIONS & CONTINUOUS INFO
          ===================================================================== */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-chancery text-base sm:text-lg tracking-wide text-white/90 font-semibold">
              My Task Filings ({filteredSubmissions.length})
            </h2>
            <span className="font-mono text-[11px] text-white/50">
              Expand any filing to view responses and add new information to allowed boxes.
            </span>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-12 text-center space-y-3">
              <MessageSquare className="w-8 h-8 text-white/40 mx-auto" />
              <h3 className="font-chancery text-lg font-semibold tracking-wide text-white">
                No Filings Recorded
              </h3>
              <p className="font-editorial italic text-xs sm:text-sm text-white/60 max-w-sm mx-auto">
                You have not filed any task reports under this filter. Browse "Task Forms" to initiate a report for any operational purpose.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('forms')}
                className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2 mt-2"
              >
                <Plus className="w-3.5 h-3.5 text-black" />
                Browse Task Forms
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((sub) => {
                const isExpanded = expandedSubmissions[sub.id] ?? true;
                const formDef = taskForms.find((f) => f.id === sub.formId);
                const allowedQuestions = formDef?.questions.filter((q) => q.allowAddInfo) || [];

                return (
                  <div
                    key={sub.id}
                    className="bg-black border border-white/20 hover:border-white/40 rounded-xl overflow-hidden transition-colors"
                  >
                    {/* Header Bar of Submission */}
                    <div
                      onClick={() => toggleExpand(sub.id)}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/70">
                            {sub.formTitle}
                          </span>
                          <span className="font-mono text-[10px] text-white/40">•</span>
                          <span className="font-mono text-[11px] text-white/60 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-white/40" />
                            {new Date(sub.updatedAt || sub.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <h3 className="font-chancery text-lg sm:text-xl font-bold tracking-wide text-white flex items-center gap-2">
                          <span className="text-white/60 font-normal">Purpose:</span>
                          <span className="text-white underline decoration-white/30 decoration-1 underline-offset-4">
                            {sub.purpose}
                          </span>
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {sub.infoUpdates && sub.infoUpdates.length > 0 && (
                          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/30 bg-white/10 text-white font-medium">
                            {sub.infoUpdates.length} info update{sub.infoUpdates.length === 1 ? '' : 's'}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubmission(sub.id);
                          }}
                          className="p-1.5 rounded-lg border border-white/15 text-white/40 hover:text-white hover:border-white/40 transition-colors"
                          title="Delete filing"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-white/60 hover:text-white transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-white/10 space-y-6">
                        {/* Initial Answers Summary */}
                        <div className="space-y-3">
                          <h4 className="font-mono text-xs uppercase tracking-wider text-white/60 font-semibold">
                            Initial Form Responses
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {formDef ? (
                              formDef.questions.map((q) => (
                                <div
                                  key={q.id}
                                  className="p-3 rounded-lg border border-white/15 bg-black space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                                      {q.label}
                                    </span>
                                    {q.allowAddInfo && (
                                      <span className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.2 rounded border border-white/30 text-white/80 bg-white/10">
                                        Continuous Info Box
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-body text-xs text-white/90 whitespace-pre-wrap">
                                    {sub.answers[q.id] !== undefined && sub.answers[q.id] !== ''
                                      ? String(sub.answers[q.id])
                                      : '(No response entered)'}
                                  </p>
                                </div>
                              ))
                            ) : (
                              Object.entries(sub.answers || {}).map(([k, v]) => (
                                <div
                                  key={k}
                                  className="p-3 rounded-lg border border-white/15 bg-black space-y-1"
                                >
                                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                                    {k}
                                  </span>
                                  <p className="font-body text-xs text-white/90">{String(v)}</p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* ALLOWED BOXES: Continuous Information Updates & Append Area */}
                        <div className="space-y-4 pt-2 border-t border-white/10">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-mono text-xs uppercase tracking-wider text-white font-semibold flex items-center gap-1.5">
                                <Plus className="w-3.5 h-3.5 text-white" />
                                Continuous Information Updates (Allowed Boxes)
                              </h4>
                              <p className="font-editorial italic text-xs text-white/65 mt-0.5">
                                Enter new information, observations, or updates into any box permitted by the council.
                              </p>
                            </div>
                          </div>

                          {allowedQuestions.length === 0 ? (
                            <div className="p-4 rounded-lg border border-white/10 text-center font-mono text-xs text-white/50">
                              This form has no continuous info boxes enabled by the council.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {allowedQuestions.map((q) => {
                                const key = `${sub.id}_${q.id}`;
                                const updatesForThisQuestion = (sub.infoUpdates || []).filter(
                                  (u) => u.questionId === q.id
                                );

                                return (
                                  <div
                                    key={q.id}
                                    className="p-4 rounded-xl border border-white/20 bg-white/[0.02] space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                                          Box: {q.label}
                                        </span>
                                        <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/30 text-white/80 bg-white/10">
                                          Allowed Box
                                        </span>
                                      </div>
                                      <span className="font-mono text-[10px] text-white/50">
                                        {updatesForThisQuestion.length} update{updatesForThisQuestion.length === 1 ? '' : 's'} logged
                                      </span>
                                    </div>

                                    {/* History of updates in this box */}
                                    {updatesForThisQuestion.length > 0 && (
                                      <div className="space-y-2 pl-2 border-l-2 border-white/20">
                                        {updatesForThisQuestion.map((up) => (
                                          <div
                                            key={up.id}
                                            className="p-2.5 rounded-lg bg-black border border-white/10 space-y-1"
                                          >
                                            <div className="flex items-center justify-between font-mono text-[10px] text-white/50">
                                              <span>{up.memberAlias}</span>
                                              <span>{new Date(up.addedAt).toLocaleString()}</span>
                                            </div>
                                            <p className="font-body text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
                                              {up.content}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Append new info input */}
                                    <div className="space-y-2 pt-1">
                                      <textarea
                                        rows={2}
                                        value={appendInfoTexts[key] || ''}
                                        onChange={(e) =>
                                          setAppendInfoTexts((prev) => ({
                                            ...prev,
                                            [key]: e.target.value
                                          }))
                                        }
                                        placeholder={`Add new information to "${q.label}" anytime...`}
                                        className="w-full font-body p-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
                                      />

                                      {appendSuccess[key] && (
                                        <div className="text-[11px] font-mono text-white flex items-center gap-1">
                                          <Check className="w-3.5 h-3.5 text-white" />
                                          {appendSuccess[key]}
                                        </div>
                                      )}

                                      <div className="flex justify-end">
                                        <button
                                          type="button"
                                          disabled={
                                            !appendInfoTexts[key]?.trim() || isAppendingInfo[key]
                                          }
                                          onClick={() => handleAppendInfo(sub, q)}
                                          className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-40 font-display text-[11px] uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-1.5"
                                        >
                                          <Send className="w-3 h-3 text-black" />
                                          {isAppendingInfo[key] ? 'Appending...' : 'Append Information'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          FILL TASK FORM MODAL (NEW PURPOSE)
          ===================================================================== */}
      {activeFillingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-black border border-white/25 rounded-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/15">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/60 mb-1 inline-block">
                  Task Form Filing
                </span>
                <h2 className="font-chancery text-xl sm:text-2xl font-bold tracking-wide text-white">
                  {activeFillingForm.title}
                </h2>
                {activeFillingForm.description && (
                  <p className="font-editorial italic text-xs text-white/70 mt-1 leading-relaxed">
                    {activeFillingForm.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveFillingForm(null)}
                className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white transition-colors shrink-0"
              >
                ✕
              </button>
            </div>

            {filingError && (
              <div className="p-3.5 rounded-lg border border-white/40 bg-white/5 text-white text-xs font-body flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                <span>{filingError}</span>
              </div>
            )}

            {filingSuccess && (
              <div className="p-3.5 rounded-lg border border-white bg-white/10 text-white text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 text-white" />
                <span>{filingSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTaskFiling} className="space-y-5">
              {/* Mandatory Purpose Field */}
              <div className="p-4 rounded-xl border border-white/30 bg-white/[0.03] space-y-2">
                <label
                  htmlFor="filingPurposeInput"
                  className="block font-mono text-xs font-bold uppercase tracking-wider text-white"
                >
                  Purpose / Operation Objective <span className="text-white/60">(Required)</span>
                </label>
                <p className="font-editorial italic text-xs text-white/70">
                  State the specific purpose for this filing. You can fill up this same form as many times as you want for different purposes.
                </p>
                <input
                  id="filingPurposeInput"
                  type="text"
                  required
                  value={filingPurpose}
                  onChange={(e) => setFilingPurpose(e.target.value)}
                  placeholder="e.g. Sector 4 Surveillance, Debrief on Node B, Case 104 Investigation"
                  className="w-full font-body px-3.5 py-2.5 rounded-lg bg-black border border-white/25 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
                />
              </div>

              {/* Form Questions */}
              <div className="space-y-4">
                <h3 className="font-mono text-xs uppercase tracking-wider text-white/70 font-semibold">
                  Form Directives ({activeFillingForm.questions.length})
                </h3>

                {activeFillingForm.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-white/15 bg-black space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-mono text-xs font-semibold text-white uppercase tracking-wider">
                        #{idx + 1}. {q.label}{' '}
                        {q.required && <span className="text-white/60">*</span>}
                      </label>
                      {q.allowAddInfo && (
                        <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/40 bg-white/10 text-white">
                          Continuous Info Allowed
                        </span>
                      )}
                    </div>

                    {q.description && (
                      <p className="font-editorial italic text-xs text-white/65">
                        {q.description}
                      </p>
                    )}

                    {/* Field input based on type */}
                    {q.type === 'text' && (
                      <input
                        type="text"
                        required={q.required}
                        value={filingAnswers[q.id] || ''}
                        onChange={(e) =>
                          setFilingAnswers({ ...filingAnswers, [q.id]: e.target.value })
                        }
                        placeholder={q.placeholder || 'Enter response...'}
                        className="w-full font-body px-3 py-2 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
                      />
                    )}

                    {q.type === 'textarea' && (
                      <textarea
                        rows={3}
                        required={q.required}
                        value={filingAnswers[q.id] || ''}
                        onChange={(e) =>
                          setFilingAnswers({ ...filingAnswers, [q.id]: e.target.value })
                        }
                        placeholder={q.placeholder || 'Enter detailed response...'}
                        className="w-full font-body px-3 py-2 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
                      />
                    )}

                    {q.type === 'multiple_choice' && q.options && (
                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <label
                            key={oIdx}
                            className="flex items-center gap-2 p-2 rounded-lg border border-white/15 bg-black hover:border-white/30 cursor-pointer text-xs font-body text-white/90"
                          >
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              required={q.required}
                              checked={filingAnswers[q.id] === opt}
                              onChange={() =>
                                setFilingAnswers({ ...filingAnswers, [q.id]: opt })
                              }
                              className="accent-white"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'scale' && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() =>
                                setFilingAnswers({ ...filingAnswers, [q.id]: num })
                              }
                              className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-colors ${
                                filingAnswers[q.id] === num
                                  ? 'bg-white text-black'
                                  : 'bg-black border border-white/20 text-white/70 hover:text-white'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {q.type === 'photo' && (
                      <div className="pt-1">
                        <PhotoUploader
                          photos={filingPhotos[q.id] || []}
                          onChange={(newPhotos) =>
                            setFilingPhotos({ ...filingPhotos, [q.id]: newPhotos })
                          }
                          maxPhotos={3}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveFillingForm(null)}
                  className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 font-mono text-xs text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2"
                >
                  {isSubmittingForm ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Saving Filing...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-black" />
                      Record Task Submission
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
