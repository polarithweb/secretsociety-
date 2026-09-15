import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  Sparkles
} from 'lucide-react';
import { Question, SocietySettings, MemberAccount, Answersheet, CandidateAnswer, MemberInfoEntry } from '../types';
import {
  authenticateMember,
  submitAnswersheet,
  addMemberInfoEntry,
  getMemberInfoEntries,
  subscribeToMemberInfoEntries,
  deleteMemberInfoEntry
} from '../lib/firebase';
import { PhotoUploader } from './PhotoUploader';

interface MemberInfoPortalProps {
  settings: SocietySettings;
  questions: Question[];
  onNavigateToCandidate: () => void;
}

export const MemberInfoPortal: React.FC<MemberInfoPortalProps> = ({
  settings,
  questions,
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

  // Portal Tab Mode: 'add_info' (Add new information anytime) vs 'questionnaire' (Full questionnaire)
  const [portalMode, setPortalMode] = useState<'add_info' | 'questionnaire'>('add_info');

  // Real-time member information entries
  const [infoEntries, setInfoEntries] = useState<MemberInfoEntry[]>([]);

  // Quick Add Information Form State
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [newInfoContent, setNewInfoContent] = useState<string>('');
  const [isSubmittingInfo, setIsSubmittingInfo] = useState<boolean>(false);
  const [infoSuccessMessage, setInfoSuccessMessage] = useState<string | null>(null);
  const [infoErrorMessage, setInfoErrorMessage] = useState<string | null>(null);

  // Per-question inline add info state: mapping questionId -> text
  const [inlineInfoText, setInlineInfoText] = useState<Record<string, string>>({});
  const [inlineSubmitting, setInlineSubmitting] = useState<Record<string, boolean>>({});
  const [inlineSuccess, setInlineSuccess] = useState<Record<string, boolean>>({});

  // Member response form state (for full dossier submission)
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmittingDossier, setIsSubmittingDossier] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submittedDossier, setSubmittedDossier] = useState<Answersheet | null>(null);

  const startTimeRef = useRef<number>(Date.now());

  // Filter questions designated for member view (target is 'member', 'both', or default)
  const memberQuestions = questions.filter(
    (q) => !q.target || q.target === 'member' || q.target === 'both'
  );

  // Questions explicitly allowed by council to receive new information anytime
  const questionsAllowedForInfo = memberQuestions.filter((q) => q.allowMemberAddInfo);

  // Default the selected question for the add-info form if empty
  useEffect(() => {
    if (questionsAllowedForInfo.length > 0 && !selectedQuestionId) {
      setSelectedQuestionId(questionsAllowedForInfo[0].id);
    }
  }, [questionsAllowedForInfo, selectedQuestionId]);

  // Subscribe to real-time member information entries when member is logged in
  useEffect(() => {
    if (!activeMember) return;
    getMemberInfoEntries().then(setInfoEntries).catch(console.warn);
    const unsubscribe = subscribeToMemberInfoEntries((updated) => {
      setInfoEntries(updated);
    });
    return () => unsubscribe();
  }, [activeMember]);

  // Handle member login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasInput.trim() || !passwordInput.trim()) {
      setAuthError('Both alias and passcode are required for council inquest.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const member = await authenticateMember(aliasInput.trim(), passwordInput.trim());
      if (member) {
        setActiveMember(member);
        try {
          sessionStorage.setItem('secretsociety_member_session', JSON.stringify(member));
        } catch (e) {}
        setAuthError(null);
      } else {
        setAuthError('Access denied. Unrecognized member alias or incorrect passcode.');
      }
    } catch (err) {
      setAuthError('Authentication service unreachable. Please retry momentarily.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle member logout
  const handleLogout = () => {
    setActiveMember(null);
    try {
      sessionStorage.removeItem('secretsociety_member_session');
    } catch (e) {}
    setAliasInput('');
    setPasswordInput('');
    setAnswers({});
    setPhotos([]);
    setSubmittedDossier(null);
  };

  // Add new information from the primary Quick Form
  const handleQuickAddInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    if (!selectedQuestionId) {
      setInfoErrorMessage('Please select an active question to attach your information to.');
      return;
    }
    if (!newInfoContent.trim()) {
      setInfoErrorMessage('Please enter the information or report you wish to record.');
      return;
    }

    const targetQuestion = questions.find((q) => q.id === selectedQuestionId);
    if (!targetQuestion) {
      setInfoErrorMessage('Question not found or removed.');
      return;
    }

    setIsSubmittingInfo(true);
    setInfoErrorMessage(null);
    setInfoSuccessMessage(null);

    try {
      await addMemberInfoEntry({
        questionId: targetQuestion.id,
        questionTitle: targetQuestion.title,
        memberAlias: activeMember.alias,
        memberName: activeMember.name || activeMember.alias,
        content: newInfoContent.trim(),
        submittedAt: new Date().toISOString()
      });

      setNewInfoContent('');
      setInfoSuccessMessage(`Information successfully registered under "${targetQuestion.title}"`);
      setTimeout(() => setInfoSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Error recording member info:', err);
      setInfoErrorMessage('Failed to save information entry. Please check connection and retry.');
    } finally {
      setIsSubmittingInfo(false);
    }
  };

  // Add new information directly on a question card
  const handleInlineAddInfo = async (q: Question) => {
    if (!activeMember) return;
    const text = inlineInfoText[q.id]?.trim();
    if (!text) return;

    setInlineSubmitting((prev) => ({ ...prev, [q.id]: true }));

    try {
      await addMemberInfoEntry({
        questionId: q.id,
        questionTitle: q.title,
        memberAlias: activeMember.alias,
        memberName: activeMember.name || activeMember.alias,
        content: text,
        submittedAt: new Date().toISOString()
      });

      setInlineInfoText((prev) => ({ ...prev, [q.id]: '' }));
      setInlineSuccess((prev) => ({ ...prev, [q.id]: true }));
      setTimeout(() => {
        setInlineSuccess((prev) => ({ ...prev, [q.id]: false }));
      }, 4000);
    } catch (err) {
      console.error('Error submitting inline info:', err);
      alert('Could not record information. Please retry.');
    } finally {
      setInlineSubmitting((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  // Remove member's own entry
  const handleDeleteEntry = async (entryId: string) => {
    if (confirm('Delete this information entry?')) {
      try {
        await deleteMemberInfoEntry(entryId);
        setInfoEntries((prev) => prev.filter((e) => e.id !== entryId));
      } catch (err) {
        console.error('Failed to delete entry:', err);
      }
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
    setValidationError(null);
  };

  // Validate full questionnaire requirements
  const validateForm = () => {
    for (const q of memberQuestions) {
      if (q.required) {
        if (q.type === 'agree_disagree') {
          if (answers[q.id] === undefined || answers[q.id] === null) {
            return `Question "${q.title}" requires agreement or dissent.`;
          }
        } else if (q.type === 'multiple_choice') {
          if (answers[q.id] === undefined || answers[q.id] === null) {
            return `Question "${q.title}" requires a selection.`;
          }
        } else if (q.type === 'text') {
          if (!answers[q.id] || String(answers[q.id]).trim().length < 1) {
            return `Question "${q.title}" requires an answer.`;
          }
        } else if (q.type === 'scale') {
          if (answers[q.id] === undefined) {
            return `Question "${q.title}" requires a rating.`;
          }
        } else if (q.type === 'photo') {
          if (!answers[q.id] || answers[q.id].length === 0) {
            return `Question "${q.title}" requires an uploaded image.`;
          }
        }
      }
    }
    return null;
  };

  // Submit full member questionnaire answersheet
  const handleSubmitDossier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;

    const err = validateForm();
    if (err) {
      setValidationError(err);
      window.scrollTo({ top: 150, behavior: 'smooth' });
      return;
    }

    setIsSubmittingDossier(true);
    setValidationError(null);

    try {
      const evaluatedAnswers: Record<string, CandidateAnswer> = {};
      memberQuestions.forEach((q) => {
        const val = answers[q.id];
        evaluatedAnswers[q.id] = {
          questionId: q.id,
          questionTitle: q.title,
          questionType: q.type,
          answer: val !== undefined ? val : null
        };
      });

      const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

      const payload: Omit<Answersheet, 'id'> = {
        candidateName: activeMember.name || activeMember.alias,
        candidateAlias: activeMember.alias,
        candidateEmail: `member_${activeMember.alias.toLowerCase()}@society.internal`,
        submittedAt: new Date().toISOString(),
        timeSpentSeconds,
        score: 0,
        maxScore: 0,
        percentage: 100,
        passed: true,
        answers: evaluatedAnswers,
        photos,
        status: 'pending',
        isMemberSubmission: true
      };

      const docId = await submitAnswersheet(payload);
      setSubmittedDossier({ ...payload, id: docId });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Member submission error:', err);
      setValidationError('Failed to record member dossier in archives. Please retry.');
    } finally {
      setIsSubmittingDossier(false);
    }
  };

  // View: Member Login Gate
  if (!activeMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 box-border">
        <div className="w-full max-w-md bg-black border border-white/20 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-3">
            {settings.sigilImage ? (
              <div className="mx-auto p-2 rounded-xl border border-white/20 bg-black inline-flex items-center justify-center max-w-[64px] max-h-[64px]">
                <img
                  src={settings.sigilImage}
                  alt="Sigil"
                  className="max-h-12 max-w-12 object-contain"
                />
              </div>
            ) : (
              <div className="mx-auto w-12 h-12 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            )}

            <div>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-[0.16em] uppercase text-white">
                {settings.heading || 'secretsociety_ind'}
              </h1>
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/70 font-medium mt-1">
                Member Information Portal
              </p>
            </div>
            <p className="font-editorial italic text-xs sm:text-sm text-white/70 max-w-xs mx-auto leading-relaxed">
              Confidential inner-circle verification. Authenticate with your alias and passcode to review questions and add information anytime.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-white/80 mb-1.5 font-semibold">
                Member Alias
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => {
                    setAliasInput(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="e.g. ARCHON_01"
                  className="w-full font-mono uppercase tracking-widest px-4 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                  autoFocus
                  required
                />
                <User className="w-4 h-4 text-white/40 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-white/80 mb-1.5 font-semibold">
                Custom Passcode
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="Enter passcode..."
                  className="w-full font-mono tracking-widest px-4 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="font-mono text-xs text-white/90 border border-white/40 bg-white/5 p-2.5 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-white shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-[0.2em] font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Key className="w-3.5 h-3.5 text-black" />
                  <span>Authenticate Member</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-white/10">
            <button
              type="button"
              onClick={onNavigateToCandidate}
              className="font-mono text-xs text-white/60 hover:text-white transition-colors"
            >
              ← Return to Candidate View
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View: Success after full questionnaire submission
  if (submittedDossier) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-12 sm:py-16 space-y-8 box-border">
        <div className="bg-black border border-white/30 rounded-2xl p-6 sm:p-10 text-center space-y-6 shadow-2xl">
          <div className="mx-auto w-16 h-16 rounded-full border border-white/40 bg-white/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>

          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">
              Protocol Concluded
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Member Report Registered
            </h2>
            <p className="font-editorial italic text-base sm:text-lg text-white/85 max-w-md mx-auto leading-relaxed">
              {settings.memberClosingMessage ||
                'Your member submission has been cryptographically recorded in the inner society archives.'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/15 text-left font-mono text-xs space-y-2 max-w-sm mx-auto">
            <div className="flex justify-between border-b border-white/10 pb-1.5">
              <span className="text-white/60">Member Moniker:</span>
              <span className="text-white font-bold">{submittedDossier.candidateAlias}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-1.5">
              <span className="text-white/60">Archive Reference:</span>
              <span className="text-white truncate max-w-[160px]">{submittedDossier.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Timestamp:</span>
              <span className="text-white">{new Date(submittedDossier.submittedAt).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSubmittedDossier(null);
                setAnswers({});
                setPhotos([]);
                setPortalMode('add_info');
              }}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-white/30 hover:border-white bg-black font-display text-xs uppercase tracking-wider text-white transition-colors"
            >
              Add New Information / Intel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Lock Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // View: Authenticated Member Portal
  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8 box-border overflow-x-hidden">
      {/* Top Header & Member Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-white/20 gap-4">
        <div className="flex items-center gap-3.5">
          {settings.sigilImage ? (
            <div className="p-1.5 rounded-xl border border-white/20 bg-black shrink-0 max-w-[48px] max-h-[48px] flex items-center justify-center shadow">
              <img
                src={settings.sigilImage}
                alt="Sigil"
                className="max-h-9 max-w-9 object-contain"
              />
            </div>
          ) : (
            <div className="p-2.5 rounded-full border border-white/20 bg-white/5 shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-lg sm:text-2xl font-bold tracking-[0.14em] uppercase text-white">
                {settings.heading || 'secretsociety_ind'}
              </h1>
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white font-semibold">
                Member Info Portal
              </span>
            </div>
            <p className="font-mono text-[11px] sm:text-xs text-white/60 tracking-wider mt-0.5">
              Inner Circle • Authenticated as <span className="text-white font-bold">{activeMember.alias}</span>
              {activeMember.role ? ` (${activeMember.role})` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onNavigateToCandidate}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/50 bg-black font-display text-[11px] sm:text-xs uppercase tracking-wider text-white/80 hover:text-white transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Candidate View
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-white/20 hover:border-white/50 bg-black font-display text-[11px] sm:text-xs uppercase tracking-wider text-white transition-colors flex items-center justify-center gap-1.5 font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Council Directive Notice */}
      <div className="bg-black border border-white/20 rounded-xl p-4 sm:p-5 space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/60 block font-semibold">
          Council Directive
        </span>
        <p className="font-editorial italic text-xs sm:text-sm text-white/90 leading-relaxed">
          {settings.memberPortalNotice ||
            'Confidential Member Inquest & Intelligence Log. Add new information or updates to allowed questions anytime, or complete the active society questionnaire.'}
        </p>
      </div>

      {/* Navigation Sub-Tabs: Add Information Anytime vs Full Questionnaire */}
      <div className="flex items-center border-b border-white/20 gap-2 overflow-x-auto scrollbar-none pb-px">
        <button
          type="button"
          onClick={() => setPortalMode('add_info')}
          className={`pb-3 px-4 font-display text-xs uppercase tracking-[0.14em] transition-colors border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            portalMode === 'add_info'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-white" />
          <span>Add Information Anytime</span>
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded border border-white/20 bg-white/5">
            {questionsAllowedForInfo.length} Allowed
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPortalMode('questionnaire')}
          className={`pb-3 px-4 font-display text-xs uppercase tracking-[0.14em] transition-colors border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap ${
            portalMode === 'questionnaire'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-white" />
          <span>Complete Questionnaire</span>
          <span className="font-mono text-[10px] opacity-75">
            ({memberQuestions.length})
          </span>
        </button>
      </div>

      {/* MODE 1: ADD INFORMATION ANYTIME */}
      {portalMode === 'add_info' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Quick Submit Information Card */}
          <div className="bg-black border border-white/30 rounded-xl p-5 sm:p-7 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/15 gap-2">
              <div>
                <h2 className="font-display text-base sm:text-lg font-semibold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-white" />
                  Add New Information
                </h2>
                <p className="font-editorial italic text-xs sm:text-sm text-white/75 mt-0.5">
                  Input fresh intelligence, reports, or text updates into any council-approved question anytime.
                </p>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/70 self-start sm:self-auto px-2 py-0.5 rounded border border-white/20 bg-white/5">
                Author: {activeMember.alias}
              </span>
            </div>

            {questionsAllowedForInfo.length === 0 ? (
              <div className="p-6 rounded-lg border border-white/15 bg-white/5 text-center space-y-2">
                <FileText className="w-6 h-6 text-white/40 mx-auto" />
                <h4 className="font-display text-sm uppercase tracking-wider text-white">
                  No Questions Currently Open For Information Addition
                </h4>
                <p className="font-editorial italic text-xs text-white/70 max-w-md mx-auto">
                  The council administrator can enable "Allow members to add new information anytime" on any question in the Admin Portal (/#/admin). Once allowed, you can append information to it right here anytime.
                </p>
              </div>
            ) : (
              <form onSubmit={handleQuickAddInfo} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white mb-1.5">
                    Select Question to Add Information To:
                  </label>
                  <select
                    value={selectedQuestionId}
                    onChange={(e) => {
                      setSelectedQuestionId(e.target.value);
                      setInfoErrorMessage(null);
                    }}
                    className="w-full font-body px-3.5 py-2.5 rounded-lg bg-black border border-white/30 text-white text-sm focus:outline-none focus:border-white transition-colors"
                    required
                  >
                    {questionsAllowedForInfo.map((q, idx) => (
                      <option key={q.id} value={q.id}>
                        #{idx + 1}: {q.title} ({q.type.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white mb-1.5">
                    New Information / Text Intel:
                  </label>
                  <textarea
                    rows={4}
                    value={newInfoContent}
                    onChange={(e) => {
                      setNewInfoContent(e.target.value);
                      setInfoErrorMessage(null);
                    }}
                    placeholder="Type new findings, updates, notes, or statement to attach to this question..."
                    className="w-full font-body p-3.5 rounded-lg bg-black border border-white/25 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                    required
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/60 mt-1">
                    <span>Markdown/plain text supported</span>
                    <span>{newInfoContent.length} characters</span>
                  </div>
                </div>

                {infoErrorMessage && (
                  <div className="p-3 rounded-lg border border-white/40 bg-white/5 font-mono text-xs text-white flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-white shrink-0" />
                    <span>{infoErrorMessage}</span>
                  </div>
                )}

                {infoSuccessMessage && (
                  <div className="p-3 rounded-lg border border-white/40 bg-white/10 font-mono text-xs text-white flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>{infoSuccessMessage}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <span className="font-mono text-[11px] text-white/60">
                    Entries are cryptographically stamped with your alias & time.
                  </span>
                  <button
                    type="submit"
                    disabled={isSubmittingInfo || !newInfoContent.trim()}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-display text-xs uppercase tracking-[0.16em] font-bold transition-all flex items-center justify-center gap-2 shadow"
                  >
                    {isSubmittingInfo ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-black" />
                        <span>Submit New Information</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* List of Allowed Questions with their Information Stream */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-display text-sm sm:text-base font-semibold uppercase tracking-wider text-white">
                Active Questions & Information Streams
              </h3>
              <span className="font-mono text-xs text-white/60">
                {infoEntries.length} Total Entries Logged
              </span>
            </div>

            {questionsAllowedForInfo.length === 0 ? (
              <div className="p-8 rounded-xl border border-white/15 bg-black text-center space-y-2">
                <p className="font-mono text-xs text-white/60">
                  No active questions allowed for member updates yet.
                </p>
              </div>
            ) : (
              questionsAllowedForInfo.map((q, idx) => {
                const entriesForQ = infoEntries.filter((e) => e.questionId === q.id);

                return (
                  <div
                    key={q.id}
                    className="bg-black border border-white/20 rounded-xl p-5 sm:p-6 space-y-4 hover:border-white/35 transition-colors"
                  >
                    {/* Question Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-white/50 font-bold">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <h4 className="font-body text-base font-semibold text-white">
                            {q.title}
                          </h4>
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/30 bg-white/10 text-white">
                            Member Info Allowed Anytime
                          </span>
                        </div>
                        {q.description && (
                          <p className="font-editorial italic text-xs sm:text-sm text-white/75 pl-6 leading-relaxed">
                            {q.description}
                          </p>
                        )}
                      </div>
                      <span className="font-mono text-xs text-white/60 shrink-0">
                        {entriesForQ.length} {entriesForQ.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>

                    {/* Previously logged information entries for this question */}
                    {entriesForQ.length > 0 && (
                      <div className="space-y-2.5 sm:pl-6">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-white/60 block">
                          Recorded Information Stream:
                        </span>
                        <div className="space-y-2">
                          {entriesForQ.map((entry) => (
                            <div
                              key={entry.id}
                              className="p-3.5 rounded-lg border border-white/15 bg-white/5 space-y-1.5 text-xs font-body"
                            >
                              <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-bold uppercase tracking-wider">
                                    {entry.memberAlias}
                                  </span>
                                  {entry.memberAlias === activeMember.alias && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded border border-white/30 text-white/90 bg-white/10">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-white/60">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(entry.submittedAt).toLocaleString()}</span>
                                  {entry.memberAlias === activeMember.alias && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      title="Delete my entry"
                                      className="p-1 hover:text-white transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3 text-white/60 hover:text-white" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed pt-0.5">
                                {entry.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline Quick Add Form for this specific question */}
                    <div className="sm:pl-6 pt-2 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-mono text-xs uppercase tracking-wider text-white/80 font-semibold flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" />
                          Add Information to this Question Anytime
                        </label>
                        {inlineSuccess[q.id] && (
                          <span className="font-mono text-xs text-white flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Recorded!
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <textarea
                          rows={2}
                          value={inlineInfoText[q.id] || ''}
                          onChange={(e) =>
                            setInlineInfoText((prev) => ({
                              ...prev,
                              [q.id]: e.target.value
                            }))
                          }
                          placeholder={`Enter additional findings or report for "${q.title}"...`}
                          className="flex-1 font-body p-2.5 rounded-lg bg-black border border-white/20 text-white text-xs placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                        />
                        <button
                          type="button"
                          disabled={inlineSubmitting[q.id] || !inlineInfoText[q.id]?.trim()}
                          onClick={() => handleInlineAddInfo(q)}
                          className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-display text-[11px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 self-end sm:self-auto"
                        >
                          {inlineSubmitting[q.id] ? (
                            <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>Submit Info</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODE 2: COMPLETE FULL QUESTIONNAIRE */}
      {portalMode === 'questionnaire' && (
        <form onSubmit={handleSubmitDossier} className="space-y-6">
          {validationError && (
            <div className="p-3.5 rounded-xl border border-white/40 bg-white/5 font-mono text-xs text-white/90 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-white shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h2 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                Member Inquest Questionnaire
              </h2>
              <span className="font-mono text-xs text-white/60">
                {memberQuestions.length} Questions
              </span>
            </div>

            {memberQuestions.length === 0 ? (
              <div className="bg-black border border-white/20 rounded-xl p-10 text-center space-y-2">
                <FileText className="w-6 h-6 text-white/50 mx-auto" />
                <p className="font-display text-sm uppercase tracking-wider text-white">
                  No Member Questions Currently Configured
                </p>
                <p className="font-editorial italic text-xs text-white/70 max-w-sm mx-auto">
                  The council has not published active questions for this portal. Questions can be created and marked for Member Info in the Admin Portal.
                </p>
              </div>
            ) : (
              memberQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-black border border-white/20 rounded-xl p-5 sm:p-6 space-y-4 hover:border-white/35 transition-colors"
                >
                  {/* Question Header */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs text-white/50 font-bold">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-body text-sm sm:text-base font-medium text-white">
                        {q.title}
                      </h3>
                      {q.required && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/70">
                          Mandatory
                        </span>
                      )}
                      {q.allowMemberAddInfo && (
                        <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/30 bg-white/10 text-white font-medium">
                          Add Info Allowed
                        </span>
                      )}
                    </div>
                    {q.description && (
                      <p className="font-editorial italic text-xs sm:text-sm text-white/75 pl-7 leading-relaxed">
                        {q.description}
                      </p>
                    )}
                  </div>

                  {/* Question Controls */}
                  <div className="pl-0 sm:pl-7 pt-1">
                    {/* Agree / Disagree */}
                    {q.type === 'agree_disagree' && (
                      <div className="grid grid-cols-2 gap-3 max-w-md">
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q.id, true)}
                          className={`py-2.5 px-4 rounded-lg border text-xs font-mono uppercase tracking-wider transition-all ${
                            answers[q.id] === true
                              ? 'bg-white text-black border-white font-bold'
                              : 'bg-black text-white border-white/20 hover:border-white/50'
                          }`}
                        >
                          Agree
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(q.id, false)}
                          className={`py-2.5 px-4 rounded-lg border text-xs font-mono uppercase tracking-wider transition-all ${
                            answers[q.id] === false
                              ? 'bg-white text-black border-white font-bold'
                              : 'bg-black text-white border-white/20 hover:border-white/50'
                          }`}
                        >
                          Disagree
                        </button>
                      </div>
                    )}

                    {/* Multiple Choice */}
                    {q.type === 'multiple_choice' && q.options && (
                      <div className="space-y-2 max-w-xl">
                        {q.options.map((opt, oIdx) => (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleAnswerChange(q.id, oIdx)}
                            className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center gap-3 ${
                              answers[q.id] === oIdx
                                ? 'bg-white text-black border-white font-semibold'
                                : 'bg-black text-white border-white/20 hover:border-white/50'
                            }`}
                          >
                            <span className="font-mono font-bold shrink-0">
                              [{String.fromCharCode(65 + oIdx)}]
                            </span>
                            <span className="font-body">{opt}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* 1-10 Scale */}
                    {q.type === 'scale' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 max-w-xl">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleAnswerChange(q.id, val)}
                              className={`py-2.5 rounded border text-xs font-mono transition-all ${
                                answers[q.id] === val
                                  ? 'bg-white text-black border-white font-bold'
                                  : 'bg-black text-white border-white/20 hover:border-white/50'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between font-mono text-[10px] text-white/60 max-w-xl px-1">
                          <span>1 = Low / Disagree</span>
                          <span>10 = High / Affirmative</span>
                        </div>
                      </div>
                    )}

                    {/* Text Essay */}
                    {q.type === 'text' && (
                      <textarea
                        rows={3}
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Enter confidential response..."
                        className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
                      />
                    )}

                    {/* Question Photo */}
                    {q.type === 'photo' && (
                      <PhotoUploader
                        photos={answers[q.id] || []}
                        onChange={(newPhotos) => handleAnswerChange(q.id, newPhotos)}
                        maxPhotos={2}
                        label="Attach Verification Image"
                        description="Upload photographic documentation required for this question."
                        required={q.required}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* General Verification Photographs */}
          <div className="bg-black border border-white/20 rounded-xl p-5 sm:p-6 space-y-3">
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              maxPhotos={2}
              label="Optional Visual Record / Verification"
              description="Attach supplementary photographic proofs or documents."
              required={false}
            />
          </div>

          {/* Submit Action Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="font-mono text-xs text-white/60">
              Submitting as <span className="text-white font-bold">{activeMember.alias}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmittingDossier || memberQuestions.length === 0}
              className="w-full sm:w-auto px-8 py-3 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-display text-xs uppercase tracking-[0.2em] font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmittingDossier ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Recording in Archives...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Member Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
