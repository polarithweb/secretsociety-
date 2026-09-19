import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Search,
  UserCheck,
  Lock,
  FileText,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Camera,
  Users,
  Key,
  Shield,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Clock,
  BookOpen,
  Bell,
  Send,
  Video,
  Youtube
} from 'lucide-react';
import {
  Question,
  SocietySettings,
  Answersheet,
  SubmissionStatus,
  CandidateAnswer,
  QuestionType,
  QuestionTarget,
  MemberAccount,
  MemberInfoEntry
} from '../types';
import {
  saveQuestion,
  deleteQuestionById,
  updateSubmissionStatus,
  deleteSubmissionById,
  updateSocietySettings,
  clearAllQuestions,
  getMemberAccounts,
  saveMemberAccount,
  deleteMemberAccountById,
  subscribeToMembers,
  getMemberInfoEntries,
  subscribeToMemberInfoEntries,
  deleteMemberInfoEntry
} from '../lib/firebase';
import { AdminTaskFormsManager } from './AdminTaskFormsManager';
import { AdminTaskSubmissionsViewer } from './AdminTaskSubmissionsViewer';
import { AdminKnowledgeManager } from './AdminKnowledgeManager';
import { AdminNotificationsManager } from './AdminNotificationsManager';
import { AdminVideosManager } from './AdminVideosManager';

interface AdminPortalProps {
  settings: SocietySettings;
  questions: Question[];
  submissions: Answersheet[];
  onNavigateToCandidate: () => void;
  onRefreshData: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  settings,
  questions,
  submissions,
  onNavigateToCandidate,
  onRefreshData
}) => {
  // Authentication gate with fixed council password: PolarithWeb8825
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('secretsociety_admin_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Active tab in admin portal
  const [activeTab, setActiveTab] = useState<
    'questions' | 'submissions' | 'task_forms' | 'task_submissions' | 'notifications' | 'videos' | 'knowledge' | 'member_intel' | 'members' | 'settings'
  >('questions');

  // Preselected member for written notification dispatch
  const [preselectedNoticeMemberAlias, setPreselectedNoticeMemberAlias] = useState<string | null>(null);

  // Member Intelligence Entries State
  const [memberInfoEntries, setMemberInfoEntries] = useState<MemberInfoEntry[]>([]);
  const [intelQuestionFilter, setIntelQuestionFilter] = useState<string>('all');
  const [intelMemberFilter, setIntelMemberFilter] = useState<string>('all');
  const [intelSearchQuery, setIntelSearchQuery] = useState<string>('');

  // Member Accounts State
  const [members, setMembers] = useState<MemberAccount[]>([]);
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberAccount>({
    id: '',
    alias: '',
    password: '',
    name: '',
    role: 'Council Member',
    isActive: true,
    createdAt: new Date().toISOString()
  });
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Question Audience filter in Questions tab
  const [questionTargetFilter, setQuestionTargetFilter] = useState<'all' | 'candidate' | 'member'>('all');

  // Selected submission dossier for modal inspection
  const [selectedSubmission, setSelectedSubmission] = useState<Answersheet | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [activeEnlargedImage, setActiveEnlargedImage] = useState<string | null>(null);

  // Search & filter submissions
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('all');
  const [submissionAudienceFilter, setSubmissionAudienceFilter] = useState<'all' | 'candidate' | 'member'>('all');

  // Question editing / creation modal state
  const [isEditingQuestion, setIsEditingQuestion] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question>({
    id: '',
    title: '',
    description: '',
    type: 'text',
    options: ['Option 1', 'Option 2'],
    order: questions.length + 1,
    required: true,
    category: 'General',
    target: 'both',
    allowMemberAddInfo: false
  });

  // Settings form
  const [societyHeading, setSocietyHeading] = useState(settings.heading || 'secretsociety_ind');
  const [societySubheading, setSocietySubheading] = useState(settings.subheading || '');
  const [oathIntro, setOathIntro] = useState(settings.oathIntro || '');
  const [closingMessage, setClosingMessage] = useState(settings.closingMessage || '');
  const [memberPortalNotice, setMemberPortalNotice] = useState(settings.memberPortalNotice || '');
  const [memberClosingMessage, setMemberClosingMessage] = useState(settings.memberClosingMessage || '');
  const [backgroundImage, setBackgroundImage] = useState(settings.backgroundImage || '');
  const [sigilImage, setSigilImage] = useState(settings.sigilImage || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // File upload refs
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const sigilFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingSigil, setIsUploadingSigil] = useState(false);

  // Synchronize local form states when settings change
  useEffect(() => {
    setSocietyHeading(settings.heading || 'secretsociety_ind');
    setSocietySubheading(settings.subheading || '');
    setOathIntro(settings.oathIntro || '');
    setClosingMessage(settings.closingMessage || '');
    setMemberPortalNotice(settings.memberPortalNotice || '');
    setMemberClosingMessage(settings.memberClosingMessage || '');
    setBackgroundImage(settings.backgroundImage || '');
    setSigilImage(settings.sigilImage || '');
  }, [settings]);

  // Load and subscribe to members
  useEffect(() => {
    getMemberAccounts().then(setMembers).catch(console.warn);
    const unsubscribe = subscribeToMembers((updated) => {
      setMembers(updated);
    });
    return () => unsubscribe();
  }, []);

  // Load and subscribe to member intelligence entries
  useEffect(() => {
    getMemberInfoEntries().then(setMemberInfoEntries).catch(console.warn);
    const unsubscribe = subscribeToMemberInfoEntries((updated) => {
      setMemberInfoEntries(updated);
    });
    return () => unsubscribe();
  }, []);

  // Handle password auth
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'PolarithWeb8825') {
      setIsAuthenticated(true);
      sessionStorage.setItem('secretsociety_admin_auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('secretsociety_admin_auth');
    setPasswordInput('');
  };

  // Question Management Handlers
  const handleOpenNewQuestion = () => {
    setEditingQuestion({
      id: `q_${Date.now()}`,
      title: '',
      description: '',
      type: 'text',
      options: ['Option 1', 'Option 2'],
      order: questions.length + 1,
      required: true,
      category: 'General',
      target: 'both',
      allowMemberAddInfo: false
    });
    setIsEditingQuestion(true);
  };

  const handleEditQuestion = (q: Question) => {
    setEditingQuestion({
      ...q,
      target: q.target || 'both',
      allowMemberAddInfo: q.allowMemberAddInfo ?? false,
      options: q.options ? [...q.options] : ['Option 1', 'Option 2']
    });
    setIsEditingQuestion(true);
  };

  const handleToggleAllowMemberAddInfo = async (q: Question) => {
    try {
      const updated: Question = {
        ...q,
        allowMemberAddInfo: !q.allowMemberAddInfo
      };
      await saveQuestion(updated);
      onRefreshData();
    } catch (err) {
      console.error('Failed to toggle member info privilege:', err);
    }
  };

  const handleDeleteMemberInfoEntry = async (id: string) => {
    if (confirm('Delete this member intelligence entry from council records?')) {
      try {
        await deleteMemberInfoEntry(id);
        setMemberInfoEntries((prev) => prev.filter((e) => e.id !== id));
      } catch (err) {
        console.error('Delete member intel error:', err);
      }
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion.title.trim()) return;

    try {
      await saveQuestion(editingQuestion);
      setIsEditingQuestion(false);
      onRefreshData();
    } catch (err) {
      console.error('Failed to save question:', err);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm('Delete this question from examination?')) {
      try {
        await deleteQuestionById(id);
        onRefreshData();
      } catch (err) {
        console.error('Delete question error:', err);
      }
    }
  };

  const handleClearAllQuestions = async () => {
    if (confirm('Are you sure you want to remove ALL questions?')) {
      try {
        await clearAllQuestions();
        onRefreshData();
      } catch (err) {
        console.error('Error clearing questions:', err);
      }
    }
  };

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const currentQ = { ...questions[index], order: targetIndex + 1 };
    const swapQ = { ...questions[targetIndex], order: index + 1 };

    try {
      await Promise.all([saveQuestion(currentQ), saveQuestion(swapQ)]);
      onRefreshData();
    } catch (e) {
      console.error('Reorder error:', e);
    }
  };

  // Member Management Handlers
  const handleOpenNewMember = () => {
    setEditingMember({
      id: `mem_${Date.now()}`,
      alias: '',
      password: '',
      name: '',
      role: 'Member',
      isActive: true,
      createdAt: new Date().toISOString()
    });
    setIsEditingMember(true);
  };

  const handleEditMember = (m: MemberAccount) => {
    setEditingMember({ ...m });
    setIsEditingMember(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember.alias.trim() || !editingMember.password.trim()) {
      alert('Alias and password are both mandatory.');
      return;
    }

    try {
      await saveMemberAccount({
        ...editingMember,
        alias: editingMember.alias.trim()
      });
      setIsEditingMember(false);
      const updated = await getMemberAccounts();
      setMembers(updated);
    } catch (err) {
      console.error('Failed to save member:', err);
      alert('Error saving member account.');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (confirm('Permanently revoke this member account?')) {
      try {
        await deleteMemberAccountById(id);
        setMembers((prev) => prev.filter((m) => m.id !== id));
      } catch (err) {
        console.error('Failed to delete member:', err);
      }
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // File Upload Handlers
  const handleBgFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBg(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result;
      if (typeof result === 'string') {
        setBackgroundImage(result);
      }
      setIsUploadingBg(false);
    };
    reader.onerror = () => {
      setIsUploadingBg(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSigilFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSigil(true);
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result;
      if (typeof result === 'string') {
        setSigilImage(result);
      }
      setIsUploadingSigil(false);
    };
    reader.onerror = () => {
      setIsUploadingSigil(false);
    };
    reader.readAsDataURL(file);
  };

  // Save System Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await updateSocietySettings({
        heading: societyHeading,
        subheading: societySubheading,
        adminPin: 'PolarithWeb8825',
        oathIntro,
        closingMessage,
        memberPortalNotice,
        memberClosingMessage,
        backgroundImage,
        sigilImage
      });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
      onRefreshData();
    } catch (err) {
      console.error('Settings save error:', err);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Submissions status determination
  const handleStatusChange = async (submissionId: string, status: SubmissionStatus) => {
    try {
      await updateSubmissionStatus(submissionId, status, adminNoteInput);
      if (selectedSubmission && selectedSubmission.id === submissionId) {
        setSelectedSubmission({
          ...selectedSubmission,
          status,
          adminNotes: adminNoteInput
        });
      }
      onRefreshData();
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    if (confirm('Permanently delete this dossier record?')) {
      try {
        await deleteSubmissionById(id);
        setSelectedSubmission(null);
        onRefreshData();
      } catch (err) {
        console.error('Delete submission error:', err);
      }
    }
  };

  // Filter questions based on audience target
  const filteredQuestions = questions.filter((q) => {
    if (questionTargetFilter === 'all') return true;
    if (questionTargetFilter === 'candidate') {
      return !q.target || q.target === 'candidate' || q.target === 'both';
    }
    if (questionTargetFilter === 'member') {
      return q.target === 'member' || q.target === 'both';
    }
    return true;
  });

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.candidateAlias.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;

    let matchesAudience = true;
    if (submissionAudienceFilter === 'candidate') {
      matchesAudience = !sub.isMemberSubmission;
    } else if (submissionAudienceFilter === 'member') {
      matchesAudience = !!sub.isMemberSubmission;
    }

    return matchesSearch && matchesStatus && matchesAudience;
  });

  // Security Gate Authentication Screen (Optimized for Mobile)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-white overflow-x-hidden">
        <div className="w-full max-w-sm bg-black border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
          {settings.sigilImage ? (
            <div className="flex justify-center">
              <div className="p-2.5 rounded-xl border border-white/20 bg-black shadow-lg max-w-[80px] max-h-[80px] flex items-center justify-center">
                <img
                  src={settings.sigilImage}
                  alt="Society Sigil"
                  className="max-h-14 max-w-14 object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="p-3 rounded-full border border-white/20 bg-black shadow-lg">
                <Lock className="w-7 h-7 text-white" />
              </div>
            </div>
          )}

          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-[0.16em] uppercase text-white">
              {settings.heading || 'secretsociety_ind'}
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-white/70 font-medium mt-1">
              Admin Portal
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-white/80 mb-2">
                Council Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError(false);
                }}
                placeholder="Enter password..."
                className="w-full font-mono text-center tracking-widest px-4 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-base sm:text-sm focus:outline-none focus:border-white transition-colors"
                autoFocus
              />
              {authError && (
                <p className="font-mono text-xs text-white/90 mt-2 border border-white/40 bg-black py-1 px-2 rounded">
                  Access denied. Incorrect council password.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-[0.2em] font-bold transition-colors shadow-sm"
            >
              Authenticate
            </button>
          </form>

          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onNavigateToCandidate}
              className="font-mono text-xs text-white/70 hover:text-white transition-colors"
            >
              ← Return to Candidate View
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard (Fully Mobile Responsive)
  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-8 text-white box-border overflow-x-hidden">
      {/* Top Header - Responsive flex wrap for phones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/20 gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          {settings.sigilImage ? (
            <div className="p-1 rounded-lg border border-white/20 bg-black shrink-0 max-w-[44px] max-h-[44px] flex items-center justify-center shadow">
              <img
                src={settings.sigilImage}
                alt="Society Sigil"
                className="max-h-8 max-w-8 object-contain"
              />
            </div>
          ) : (
            <div className="p-2 rounded-full border border-white/20 bg-black shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-lg sm:text-2xl font-bold tracking-[0.14em] uppercase text-white truncate">
                {settings.heading || 'secretsociety_ind'}
              </h1>
              <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-white font-medium shrink-0">
                Admin Portal
              </span>
            </div>
            <p className="font-mono text-[11px] sm:text-xs text-white/60 tracking-wider truncate">
              Council Review • Questions • Member Accounts
            </p>
          </div>
        </div>

        {/* Action buttons on header - full width on mobile */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onNavigateToCandidate}
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-white/20 hover:border-white/50 bg-black font-display text-[11px] sm:text-xs uppercase tracking-wider text-white transition-colors flex items-center justify-center gap-1.5 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Candidate View
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-white/20 hover:border-white/50 bg-black font-display text-[11px] sm:text-xs uppercase tracking-wider text-white/80 hover:text-white transition-colors font-semibold"
          >
            Lock Portal
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Horizontal Scroll Container for Mobile Screens */}
      <div className="flex items-center border-b border-white/20 mb-6 sm:mb-8 gap-1 sm:gap-2 overflow-x-auto scrollbar-none flex-nowrap pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`pb-3 px-3 sm:px-4 font-display text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'questions'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Candidate Exam</span>
          <span className="font-mono text-[10px] opacity-75">({questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-3 sm:px-4 font-display text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'submissions'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Candidate Answersheets</span>
          <span className="font-mono text-[10px] opacity-75">({submissions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('task_forms')}
          className={`pb-3 px-3 sm:px-4 font-display text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'task_forms'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Member Task Forms</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('task_submissions')}
          className={`pb-3 px-3 sm:px-4 font-display text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'task_submissions'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Member Task Filings & Logs</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPreselectedNoticeMemberAlias(null);
            setActiveTab('notifications');
          }}
          className={`pb-3 px-3 sm:px-4 font-display text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Member Notices</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('knowledge')}
          className={`pb-3 px-3 sm:px-4 font-display text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'knowledge'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Knowledge Articles (/#/knowledge)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('videos')}
          className={`pb-3 px-3 sm:px-4 font-display text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'videos'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <Youtube className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Videos (/#/videos)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`pb-3 px-3 sm:px-4 font-display text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'members'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Members & Passwords</span>
          <span className="font-mono text-[10px] opacity-75">({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-3 sm:px-4 font-display text-[11px] sm:text-xs uppercase tracking-[0.12em] sm:tracking-[0.15em] transition-colors border-b-2 flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          <span>Settings & Background</span>
        </button>
      </div>

      {/* TAB 1: QUESTIONS MANAGER */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold tracking-wide uppercase text-white">
                Candidate Examination Questions (/#/)
              </h2>
              <p className="font-editorial italic text-xs sm:text-sm text-white/75">
                Configure test questions for the public candidate application portal. Member task forms are managed independently in the Member Task Forms tab.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {questions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllQuestions}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-lg border border-white/20 hover:border-white/40 bg-black font-mono text-xs text-white transition-colors text-center"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenNewQuestion}
                className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-black" />
                Add Question
              </button>
            </div>
          </div>

          {/* Filter questions by target portal audience */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            <span className="font-mono text-xs text-white/60 uppercase tracking-wider shrink-0 mr-1">
              Portal View:
            </span>
            <button
              type="button"
              onClick={() => setQuestionTargetFilter('all')}
              className={`px-3 py-1 rounded-full font-mono text-xs transition-colors shrink-0 ${
                questionTargetFilter === 'all'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-black border border-white/20 text-white/70 hover:text-white'
              }`}
            >
              All Questions ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setQuestionTargetFilter('candidate')}
              className={`px-3 py-1 rounded-full font-mono text-xs transition-colors shrink-0 ${
                questionTargetFilter === 'candidate'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-black border border-white/20 text-white/70 hover:text-white'
              }`}
            >
              Candidate View (/#/)
            </button>
            <button
              type="button"
              onClick={() => setQuestionTargetFilter('member')}
              className={`px-3 py-1 rounded-full font-mono text-xs transition-colors shrink-0 ${
                questionTargetFilter === 'member'
                  ? 'bg-white text-black font-semibold'
                  : 'bg-black border border-white/20 text-white/70 hover:text-white'
              }`}
            >
              Member Info View (/#/info)
            </button>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-12 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-black border border-white/30 flex items-center justify-center text-white">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                  No Questions in Selected Filter
                </h3>
                <p className="font-editorial italic text-xs sm:text-sm text-white/70 max-w-sm mx-auto mt-1">
                  Create questions of any type: Agree/Disagree, Multiple Choice, 1-10 Rating Scale, Written Essay, or Photographic Upload.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewQuestion}
                className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-black" />
                Create Question
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="bg-black border border-white/20 hover:border-white/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 w-full min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-white/50 font-bold tracking-wider">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <h4 className="font-body text-sm font-medium text-white break-words">
                        {q.title}
                      </h4>
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white font-medium">
                        {q.type.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/30 text-white/80 bg-white/10">
                        {q.target === 'candidate'
                          ? 'Candidate View'
                          : q.target === 'member'
                          ? 'Member Info'
                          : 'Both Portals'}
                      </span>
                      {q.allowMemberAddInfo ? (
                        <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/40 bg-white/15 text-white font-medium flex items-center gap-1">
                          <Check className="w-3 h-3 text-white" />
                          Member Info Allowed
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/10 text-white/40">
                          Member Info: Off
                        </span>
                      )}
                      {q.required && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                          (Mandatory)
                        </span>
                      )}
                    </div>

                    {q.description && (
                      <p className="font-editorial italic text-xs text-white/75 sm:pl-6 leading-relaxed">
                        {q.description}
                      </p>
                    )}

                    {q.type === 'multiple_choice' && q.options && (
                      <div className="text-xs text-white/70 sm:pl-6 flex flex-wrap gap-2 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <span
                            key={oIdx}
                            className="font-mono px-2 py-0.5 rounded text-[11px] border border-white/20 bg-black text-white"
                          >
                            [{String.fromCharCode(65 + oIdx)}] {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions - mobile full width or clean flex wrap */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0 shrink-0">
                    <div className="flex items-center border border-white/20 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveQuestion(idx, 'up')}
                        className="p-2 hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4 text-white" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === questions.length - 1}
                        onClick={() => handleMoveQuestion(idx, 'down')}
                        className="p-2 hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAllowMemberAddInfo(q)}
                        title={q.allowMemberAddInfo ? 'Revoke privilege: members cannot add info' : 'Allow members to add new information anytime in /#/info'}
                        className={`px-2 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1 ${
                          q.allowMemberAddInfo
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-white/20 text-white/70 hover:text-white hover:border-white/40'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-mono">
                          {q.allowMemberAddInfo ? 'Info Allowed' : 'Allow Info'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditQuestion(q)}
                        className="p-2 rounded-lg border border-white/20 hover:border-white bg-black text-white transition-colors"
                        title="Edit Question"
                      >
                        <Edit3 className="w-4 h-4 text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-2 rounded-lg border border-white/20 hover:border-white bg-black text-white transition-colors"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMISSIONS & ANSWERSHEETS */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold tracking-wide uppercase text-white">
                Answersheets & Dossiers
              </h2>
              <p className="font-editorial italic text-xs sm:text-sm text-white/75">
                Incoming candidate and member examination dossiers for review and status determination.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search alias, name..."
                  className="w-full font-body pl-9 pr-3 py-2 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white"
                />
              </div>

              <select
                value={submissionAudienceFilter}
                onChange={(e) => setSubmissionAudienceFilter(e.target.value as any)}
                className="font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-white uppercase"
              >
                <option value="all">All Dossiers</option>
                <option value="candidate">Candidate Only</option>
                <option value="member">Member Inquests</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-white uppercase"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="scrutiny">Scrutiny</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-12 text-center text-white/70 font-mono text-xs">
              No answersheet dossiers match current search and status filters.
            </div>
          ) : (
            <>
              {/* Desktop Table View (md and above) */}
              <div className="hidden md:block border border-white/20 rounded-xl overflow-hidden bg-black">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-white/90 uppercase tracking-widest border-b border-white/20 font-mono text-[11px]">
                      <tr>
                        <th className="p-3.5">Candidate / Member</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Photos</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredSubmissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3.5">
                            <div className="font-display font-semibold tracking-wide text-white">
                              {sub.candidateName}
                            </div>
                            <div className="font-mono text-white/60 text-[11px]">
                              Alias: {sub.candidateAlias} • {sub.candidateEmail}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/5">
                              {sub.isMemberSubmission ? 'Member Report' : 'Candidate App'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`font-mono px-2 py-0.5 rounded text-[10px] uppercase font-semibold tracking-wider border ${
                                sub.status === 'accepted'
                                  ? 'bg-white text-black border-white font-bold'
                                  : sub.status === 'rejected'
                                  ? 'bg-black text-white/60 border-white/30 line-through'
                                  : 'bg-black text-white border-white/30'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono text-white/80">
                            {sub.photos?.length || 0}
                          </td>
                          <td className="p-3.5 font-mono text-white/60">
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubmission(sub);
                                setAdminNoteInput(sub.adminNotes || '');
                              }}
                              className="font-display px-3 py-1.5 rounded border border-white/20 hover:border-white bg-black text-white text-[11px] uppercase tracking-wider transition-colors font-semibold"
                            >
                              Review Dossier
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Dossier Card View (Optimized for phones < md) */}
              <div className="block md:hidden space-y-3">
                {filteredSubmissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-black border border-white/20 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/20 text-white/60 mb-1 inline-block">
                          {sub.isMemberSubmission ? 'Member Report' : 'Candidate App'}
                        </span>
                        <h4 className="font-display text-base font-bold text-white uppercase tracking-wide truncate">
                          {sub.candidateName}
                        </h4>
                        <p className="font-mono text-xs text-white/70 mt-0.5">
                          Alias: <span className="text-white font-semibold">{sub.candidateAlias}</span>
                        </p>
                      </div>

                      <span
                        className={`font-mono px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border shrink-0 ${
                          sub.status === 'accepted'
                            ? 'bg-white text-black border-white'
                            : sub.status === 'rejected'
                            ? 'bg-black text-white/60 border-white/30 line-through'
                            : 'bg-black text-white border-white/30'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-white/60 pt-2 border-t border-white/10">
                      <span>Photos: {sub.photos?.length || 0}</span>
                      <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubmission(sub);
                        setAdminNoteInput(sub.adminNotes || '');
                      }}
                      className="w-full py-2.5 rounded-lg border border-white/30 hover:border-white bg-white/5 font-display text-xs uppercase tracking-wider text-white font-bold transition-colors text-center"
                    >
                      Review Dossier
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: MEMBER INTEL LOGS */}
      {activeTab === 'member_intel' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold tracking-wide uppercase text-white">
                Member Intelligence & Information Logs
              </h2>
              <p className="font-editorial italic text-xs sm:text-sm text-white/75">
                Real-time records of text updates and information entered by verified members in the /#/info portal.
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs text-white/70">
              <span className="px-2.5 py-1 rounded border border-white/20 bg-white/5">
                {memberInfoEntries.length} Total Logs
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl border border-white/20 bg-black">
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/60 block">
                Total Logs Recorded
              </span>
              <p className="font-display text-2xl font-bold text-white mt-1">
                {memberInfoEntries.length}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/20 bg-black">
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/60 block">
                Active Question Streams
              </span>
              <p className="font-display text-2xl font-bold text-white mt-1">
                {new Set(memberInfoEntries.map((e) => e.questionId)).size}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/20 bg-black">
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/60 block">
                Contributing Members
              </span>
              <p className="font-display text-2xl font-bold text-white mt-1">
                {new Set(memberInfoEntries.map((e) => e.memberAlias)).size}
              </p>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={intelSearchQuery}
                onChange={(e) => setIntelSearchQuery(e.target.value)}
                placeholder="Search intel content, author alias, or question..."
                className="w-full font-body pl-9 pr-4 py-2 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
              />
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <div className="flex gap-2">
              <select
                value={intelQuestionFilter}
                onChange={(e) => setIntelQuestionFilter(e.target.value)}
                className="font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase"
              >
                <option value="all">All Questions</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title.slice(0, 30)}...
                  </option>
                ))}
              </select>

              <select
                value={intelMemberFilter}
                onChange={(e) => setIntelMemberFilter(e.target.value)}
                className="font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase"
              >
                <option value="all">All Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.alias}>
                    {m.alias}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Entries Feed */}
          {memberInfoEntries.length === 0 ? (
            <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-12 text-center space-y-4">
              <MessageSquare className="w-8 h-8 text-white/50 mx-auto" />
              <div>
                <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                  No Member Intelligence Logs Recorded
                </h3>
                <p className="font-editorial italic text-xs sm:text-sm text-white/70 max-w-sm mx-auto mt-1">
                  When members log in at /#/info, they can add text reports to any question marked "Allow Member Info". Entries will appear here in real time.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {memberInfoEntries
                .filter((entry) => {
                  if (intelQuestionFilter !== 'all' && entry.questionId !== intelQuestionFilter) return false;
                  if (intelMemberFilter !== 'all' && entry.memberAlias !== intelMemberFilter) return false;
                  if (intelSearchQuery.trim()) {
                    const q = intelSearchQuery.toLowerCase();
                    const matchesContent = entry.content.toLowerCase().includes(q);
                    const matchesAlias = entry.memberAlias.toLowerCase().includes(q);
                    const matchesName = (entry.memberName || '').toLowerCase().includes(q);
                    const matchesQuestion = entry.questionTitle.toLowerCase().includes(q);
                    return matchesContent || matchesAlias || matchesName || matchesQuestion;
                  }
                  return true;
                })
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-black border border-white/20 hover:border-white/40 rounded-xl p-4 sm:p-5 space-y-3 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-white/10 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-white uppercase tracking-wider px-2 py-0.5 rounded border border-white/30 bg-white/10">
                          {entry.memberAlias}
                        </span>
                        {entry.memberName && entry.memberName !== entry.memberAlias && (
                          <span className="font-mono text-[11px] text-white/60">
                            ({entry.memberName})
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-white/40">•</span>
                        <span className="font-mono text-xs text-white/80 font-medium">
                          Question: {entry.questionTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto font-mono text-[11px] text-white/60">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-white/40" />
                          <span>{new Date(entry.submittedAt).toLocaleString()}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemberInfoEntry(entry.id)}
                          className="p-1 rounded text-white/50 hover:text-white transition-colors"
                          title="Delete Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </div>

                    <p className="font-body text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                      {entry.content}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: MEMBER TASK FORMS (/#/info Task System) */}
      {activeTab === 'task_forms' && <AdminTaskFormsManager />}

      {/* TAB: MEMBER TASK FILINGS & LOGS (/#/info Filings by purpose & continuous updates) */}
      {activeTab === 'task_submissions' && <AdminTaskSubmissionsViewer />}

      {/* TAB: MEMBER WRITTEN NOTIFICATIONS & DIRECTIVES */}
      {activeTab === 'notifications' && (
        <AdminNotificationsManager
          members={members}
          preselectedMemberAlias={preselectedNoticeMemberAlias}
          onClearPreselectedMember={() => setPreselectedNoticeMemberAlias(null)}
        />
      )}

      {/* TAB: KNOWLEDGE BASE ARTICLES (/#/knowledge Full Text Editor & Media) */}
      {activeTab === 'knowledge' && <AdminKnowledgeManager />}

      {/* TAB: VIDEO COLLECTION (/#/videos YouTube Video Links & Descriptions) */}
      {activeTab === 'videos' && <AdminVideosManager />}

      {/* TAB 4: MEMBERS & PASSWORDS */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold tracking-wide uppercase text-white">
                Member Credentials & Passwords
              </h2>
              <p className="font-editorial italic text-xs sm:text-sm text-white/75">
                Set allowed member aliases and custom passwords for the member info portal (/#/info).
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenNewMember}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-black" />
              Add Member
            </button>
          </div>

          {members.length === 0 ? (
            <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-12 text-center space-y-4">
              <Key className="w-8 h-8 text-white/50 mx-auto" />
              <div>
                <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                  No Member Credentials Configured
                </h3>
                <p className="font-editorial italic text-xs sm:text-sm text-white/70 max-w-sm mx-auto mt-1">
                  Add member aliases and passcodes so authorized members can sign in at /#/info.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewMember}
                className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-black" />
                Add First Member
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((mem) => (
                <div
                  key={mem.id}
                  className="bg-black border border-white/20 hover:border-white/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                        {mem.alias}
                      </span>
                      {mem.role && (
                        <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white/80">
                          {mem.role}
                        </span>
                      )}
                      <span
                        className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                          mem.isActive
                            ? 'border-white text-white font-bold bg-white/10'
                            : 'border-white/20 text-white/50'
                        }`}
                      >
                        {mem.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </div>

                    {mem.name && (
                      <p className="font-body text-xs text-white/60">
                        Designation / Full Name: {mem.name}
                      </p>
                    )}

                    {/* Password display with show/hide toggle */}
                    <div className="flex items-center gap-2 pt-1 font-mono text-xs">
                      <span className="text-white/60">Password:</span>
                      <span className="text-white font-semibold tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/15">
                        {visiblePasswords[mem.id] ? mem.password : '••••••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(mem.id)}
                        className="text-white/60 hover:text-white p-1"
                        title={visiblePasswords[mem.id] ? 'Hide password' : 'Show password'}
                      >
                        {visiblePasswords[mem.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {mem.lastLoginAt && (
                      <p className="font-mono text-[10px] text-white/50 pt-0.5">
                        Last Active: {new Date(mem.lastLoginAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Member Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPreselectedNoticeMemberAlias(mem.alias);
                        setActiveTab('notifications');
                      }}
                      className="px-2.5 py-1.5 rounded-lg border border-white/20 hover:border-white bg-black text-white font-mono text-xs transition-colors flex items-center gap-1.5"
                      title={`Dispatch written notice to ${mem.alias}`}
                    >
                      <Bell className="w-3.5 h-3.5 text-white" />
                      <span>Notice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditMember(mem)}
                      className="px-3 py-1.5 rounded-lg border border-white/20 hover:border-white bg-black text-white font-mono text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-white" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(mem.id)}
                      className="p-1.5 rounded-lg border border-white/20 hover:border-white bg-black text-white transition-colors"
                      title="Delete Member"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS & BACKGROUND */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="font-display text-base sm:text-lg font-semibold tracking-wide uppercase text-white">
              System Settings & Background
            </h2>
            <p className="font-editorial italic text-xs sm:text-sm text-white/75">
              Configure portal titles, candidate notices, member portal notices, and upload custom backgrounds.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="bg-black border border-white/20 rounded-xl p-4 sm:p-6 space-y-5">
            <div>
              <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                Application Heading
              </label>
              <input
                type="text"
                value={societyHeading}
                onChange={(e) => setSocietyHeading(e.target.value)}
                placeholder="secretsociety_ind"
                className="w-full font-body px-3.5 py-2.5 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                Candidate Subheading / Protocol Title
              </label>
              <input
                type="text"
                value={societySubheading}
                onChange={(e) => setSocietySubheading(e.target.value)}
                placeholder="Candidate Application Portal"
                className="w-full font-body px-3.5 py-2.5 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                Candidate Introductory Notice
              </label>
              <textarea
                rows={3}
                value={oathIntro}
                onChange={(e) => setOathIntro(e.target.value)}
                placeholder="Instructions displayed at top of the candidate examination..."
                className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                Candidate Post-Submission Closing Notice
              </label>
              <textarea
                rows={2}
                value={closingMessage}
                onChange={(e) => setClosingMessage(e.target.value)}
                placeholder="Notice displayed after successful submission..."
                className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
              />
            </div>

            {/* Member Portal Notice Controls */}
            <div className="pt-2 border-t border-white/10 space-y-4">
              <div>
                <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                  Member Portal (/#/info) Directive / Notice
                </label>
                <textarea
                  rows={2}
                  value={memberPortalNotice}
                  onChange={(e) => setMemberPortalNotice(e.target.value)}
                  placeholder="Confidential Member Inquest notice..."
                  className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                  Member Portal Closing Message
                </label>
                <textarea
                  rows={2}
                  value={memberClosingMessage}
                  onChange={(e) => setMemberClosingMessage(e.target.value)}
                  placeholder="Notice displayed after member submits inquest..."
                  className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
                />
              </div>
            </div>

            {/* Society Sigil Image Upload */}
            <div className="p-4 rounded-lg bg-black border border-white/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase tracking-wider text-white font-semibold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-white" />
                  Society Sigil / Logo Image
                </label>
                {sigilImage && (
                  <button
                    type="button"
                    onClick={() => setSigilImage('')}
                    className="font-mono text-xs text-white/70 hover:text-white"
                  >
                    Remove Sigil
                  </button>
                )}
              </div>

              <input
                ref={sigilFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleSigilFileUpload}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => sigilFileInputRef.current?.click()}
                  disabled={isUploadingSigil}
                  className="px-4 py-2 rounded-lg border border-white/30 hover:border-white bg-black hover:bg-white/5 font-display text-xs uppercase tracking-wider text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4 text-white" />
                  {isUploadingSigil ? 'Loading...' : 'Upload Sigil Image'}
                </button>
                <input
                  type="text"
                  value={sigilImage}
                  onChange={(e) => setSigilImage(e.target.value)}
                  placeholder="Or enter image URL..."
                  className="flex-1 font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              {sigilImage ? (
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="w-12 h-12 rounded border border-white/20 bg-black flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={sigilImage}
                      alt="Sigil Preview"
                      className="max-h-10 max-w-10 object-contain"
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <span className="font-mono text-xs text-white font-medium block truncate">Active Sigil Image</span>
                    <p className="font-editorial italic text-xs text-white/70">
                      Displayed on candidate application, member portal, and council portal.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-white/10 bg-black text-center font-editorial italic text-xs text-white/60">
                  No sigil image uploaded. The header displays default typography and vector emblem.
                </div>
              )}
            </div>

            {/* Background Image Upload */}
            <div className="p-4 rounded-lg bg-black border border-white/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs uppercase tracking-wider text-white font-semibold flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-white" />
                  Website Background Image
                </label>
                {backgroundImage && (
                  <button
                    type="button"
                    onClick={() => setBackgroundImage('')}
                    className="font-mono text-xs text-white/70 hover:text-white"
                  >
                    Reset to Pure Black
                  </button>
                )}
              </div>

              <input
                ref={bgFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBgFileUpload}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  disabled={isUploadingBg}
                  className="px-4 py-2 rounded-lg border border-white/30 hover:border-white bg-black hover:bg-white/5 font-display text-xs uppercase tracking-wider text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4 text-white" />
                  {isUploadingBg ? 'Loading...' : 'Upload Background Image'}
                </button>
                <input
                  type="text"
                  value={backgroundImage}
                  onChange={(e) => setBackgroundImage(e.target.value)}
                  placeholder="Or enter image URL..."
                  className="flex-1 font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              {backgroundImage ? (
                <div className="relative h-20 w-full rounded-lg overflow-hidden border border-white/20">
                  <img
                    src={backgroundImage}
                    alt="Background Preview"
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="font-mono text-xs text-white font-medium bg-black/80 px-2 py-1 rounded border border-white/20">
                      Active Background Preview
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-white/10 bg-black text-center font-editorial italic text-xs text-white/60">
                  Currently set to pure pitch black (no background image).
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              {settingsSuccess && (
                <span className="font-mono text-xs text-white flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5 text-white" />
                  Settings saved successfully.
                </span>
              )}
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full sm:w-auto ml-auto px-6 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-black" />
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 1: QUESTION EDITOR (Mobile Optimized) */}
      {isEditingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-black border border-white/30 rounded-xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                {editingQuestion.id && !editingQuestion.id.startsWith('q_') ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingQuestion(false)}
                className="p-1 rounded text-white/70 hover:text-white"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
                  Question Title <span className="text-white">*</span>
                </label>
                <input
                  type="text"
                  value={editingQuestion.title}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, title: e.target.value })}
                  placeholder="e.g. Do you solemnly uphold the oath of silence?"
                  className="w-full font-body px-3.5 py-2 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
                  Description / Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.description || ''}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, description: e.target.value })}
                  placeholder="Instructions or context for applicant / member..."
                  className="w-full font-body p-2.5 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
                    Question Type
                  </label>
                  <select
                    value={editingQuestion.type}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        type: e.target.value as QuestionType,
                        options:
                          e.target.value === 'multiple_choice' && (!editingQuestion.options || editingQuestion.options.length === 0)
                            ? ['Option A', 'Option B']
                            : editingQuestion.options
                      })
                    }
                    className="w-full font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase"
                  >
                    <option value="agree_disagree">Agree / Disagree</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="scale">Rating Scale (1-10)</option>
                    <option value="text">Written Essay / Text</option>
                    <option value="photo">Photo Upload</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
                    Display In Portal
                  </label>
                  <select
                    value={editingQuestion.target || 'both'}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        target: e.target.value as QuestionTarget
                      })
                    }
                    className="w-full font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase"
                  >
                    <option value="both">Both Portals</option>
                    <option value="candidate">Candidate Portal (/#/)</option>
                    <option value="member">Member Info Portal (/#/info)</option>
                  </select>
                </div>
              </div>

              {editingQuestion.type === 'multiple_choice' && (
                <div className="p-4 rounded-lg bg-black border border-white/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-xs uppercase tracking-wider text-white font-semibold">
                      Answer Choices
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingQuestion({
                          ...editingQuestion,
                          options: [...(editingQuestion.options || []), `Option ${(editingQuestion.options?.length || 0) + 1}`]
                        })
                      }
                      className="font-mono text-xs text-white hover:text-white/80 flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      Add Option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {editingQuestion.options?.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <span className="font-mono text-xs text-white/60 w-5">#{oIdx + 1}</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...(editingQuestion.options || [])];
                            updated[oIdx] = e.target.value;
                            setEditingQuestion({ ...editingQuestion, options: updated });
                          }}
                          className="flex-1 font-body px-2.5 py-1.5 rounded bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                        />
                        {editingQuestion.options && editingQuestion.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editingQuestion.options!.filter((_, i) => i !== oIdx);
                              setEditingQuestion({ ...editingQuestion, options: updated });
                            }}
                            className="p-1 text-white/60 hover:text-white"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requiredCheckbox"
                    checked={editingQuestion.required}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                    className="accent-white rounded w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="requiredCheckbox" className="font-body text-xs text-white cursor-pointer">
                    Response is mandatory
                  </label>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg border border-white/20 bg-white/5">
                  <input
                    type="checkbox"
                    id="allowMemberAddInfoCheckbox"
                    checked={editingQuestion.allowMemberAddInfo ?? false}
                    onChange={(e) =>
                      setEditingQuestion({
                        ...editingQuestion,
                        allowMemberAddInfo: e.target.checked
                      })
                    }
                    className="accent-white rounded w-4 h-4 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <label
                      htmlFor="allowMemberAddInfoCheckbox"
                      className="font-mono text-xs font-semibold uppercase tracking-wider text-white cursor-pointer block"
                    >
                      Allow members to add new information anytime (/#/info portal)
                    </label>
                    <p className="font-body text-xs text-white/70 mt-0.5 leading-relaxed">
                      Permit authenticated members in the Member Info Portal to record continuous text intelligence, updates, and findings for this question anytime.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsEditingQuestion(false)}
                  className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 font-mono text-xs text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: MEMBER CREDENTIALS EDITOR (Mobile Optimized) */}
      {isEditingMember && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-black border border-white/30 rounded-xl p-5 sm:p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                {editingMember.id && !editingMember.id.startsWith('mem_') ? 'Edit Member Credentials' : 'Add Allowed Member'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingMember(false)}
                className="p-1 rounded text-white/70 hover:text-white"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
                  Member Alias <span className="text-white">*</span>
                </label>
                <input
                  type="text"
                  value={editingMember.alias}
                  onChange={(e) => setEditingMember({ ...editingMember, alias: e.target.value })}
                  placeholder="e.g. ARCHON_01 or ShadowWalker"
                  className="w-full font-mono uppercase tracking-wider px-3.5 py-2 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
                  required
                />
                <p className="font-editorial italic text-[11px] text-white/60 mt-1">
                  The unique moniker used by the member to login at /#/info.
                </p>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
                  Custom Password <span className="text-white">*</span>
                </label>
                <input
                  type="text"
                  value={editingMember.password}
                  onChange={(e) => setEditingMember({ ...editingMember, password: e.target.value })}
                  placeholder="Enter custom passcode..."
                  className="w-full font-mono px-3.5 py-2 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
                  required
                />
                <p className="font-editorial italic text-[11px] text-white/60 mt-1">
                  Custom secret password set by admin for this member.
                </p>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={editingMember.role || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, role: e.target.value })}
                  placeholder="e.g. Council Member, Elder, Initiate"
                  className="w-full font-body px-3.5 py-2 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
                  Name / Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={editingMember.name || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  placeholder="Optional internal name"
                  className="w-full font-body px-3.5 py-2 rounded-lg bg-black border border-white/20 text-white text-base sm:text-sm focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeMemberCheckbox"
                  checked={editingMember.isActive}
                  onChange={(e) => setEditingMember({ ...editingMember, isActive: e.target.checked })}
                  className="accent-white rounded w-4 h-4"
                />
                <label htmlFor="activeMemberCheckbox" className="font-body text-xs text-white cursor-pointer">
                  Account is active and authorized to log in
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setIsEditingMember(false)}
                  className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 font-mono text-xs text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CANDIDATE / MEMBER DOSSIER INSPECTOR (Mobile Optimized) */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl bg-black border border-white/30 rounded-xl p-4 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/20 pb-4">
              <div className="min-w-0 pr-2">
                <span className="font-mono text-[10px] uppercase text-white/70 font-medium tracking-wider">
                  {selectedSubmission.isMemberSubmission ? 'Member Report Dossier' : 'Candidate Examination Dossier'}
                </span>
                <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wide text-white mt-0.5 break-words">
                  {selectedSubmission.candidateName}
                </h3>
                <p className="font-mono text-xs text-white/70 mt-0.5 break-words">
                  Alias: {selectedSubmission.candidateAlias} • {selectedSubmission.candidateEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="p-1 text-white/60 hover:text-white shrink-0"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Candidate Metadata Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-black border border-white/20 p-2.5 sm:p-3 rounded-lg">
                <span className="font-mono text-[10px] uppercase text-white/60 tracking-wider block">Status</span>
                <span className="font-mono text-white uppercase font-bold tracking-wider">
                  {selectedSubmission.status}
                </span>
              </div>
              <div className="bg-black border border-white/20 p-2.5 sm:p-3 rounded-lg">
                <span className="font-mono text-[10px] uppercase text-white/60 tracking-wider block">Submission Date</span>
                <span className="font-mono text-white text-[11px]">
                  {new Date(selectedSubmission.submittedAt).toLocaleString()}
                </span>
              </div>
              <div className="bg-black border border-white/20 p-2.5 sm:p-3 rounded-lg col-span-2 sm:col-span-1">
                <span className="font-mono text-[10px] uppercase text-white/60 tracking-wider block">Reference ID</span>
                <span className="font-mono text-white/80 select-all truncate block">
                  {selectedSubmission.id}
                </span>
              </div>
            </div>

            {/* Status Determination Controls */}
            <div className="p-3.5 sm:p-4 rounded-lg bg-black border border-white/20 space-y-2">
              <span className="font-mono text-xs text-white/80 font-semibold block uppercase tracking-wider">
                Council Determination:
              </span>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedSubmission.id, 'accepted')}
                  className="px-4 py-2 rounded bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors text-center"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedSubmission.id, 'scrutiny')}
                  className="px-4 py-2 rounded border border-white/30 hover:border-white bg-black text-white font-display text-xs uppercase tracking-wider font-semibold transition-colors text-center"
                >
                  Scrutiny
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedSubmission.id, 'rejected')}
                  className="px-4 py-2 rounded border border-white/30 hover:border-white bg-black text-white font-display text-xs uppercase tracking-wider font-semibold transition-colors text-center"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedSubmission.id, 'pending')}
                  className="px-4 py-2 rounded border border-white/20 hover:border-white bg-black text-white/70 font-display text-xs uppercase tracking-wider font-semibold transition-colors text-center"
                >
                  Pending
                </button>
              </div>
            </div>

            {/* Candidate Answers Breakdown */}
            <div className="space-y-3">
              <h4 className="font-display text-xs uppercase tracking-wider text-white font-semibold">
                Recorded Responses ({Object.keys(selectedSubmission.answers || {}).length})
              </h4>

              <div className="space-y-2.5">
                {Object.values(selectedSubmission.answers || {}).map((ans: CandidateAnswer, idx) => (
                  <div
                    key={ans.questionId || idx}
                    className="p-3 sm:p-3.5 rounded-lg bg-black border border-white/20 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-body font-medium text-white break-words">
                        {ans.questionTitle || `Question ${idx + 1}`}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-white/60 tracking-wider shrink-0">
                        {ans.questionType?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="text-white/90 pt-1">
                      {typeof ans.answer === 'boolean' ? (
                        <span className="font-mono font-semibold text-white">
                          {ans.answer ? 'Agreed' : 'Disagreed'}
                        </span>
                      ) : typeof ans.answer === 'number' ? (
                        <span className="font-mono text-white font-semibold">
                          Selected Choice / Rating: {ans.answer}
                        </span>
                      ) : Array.isArray(ans.answer) ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {ans.answer.map((item, aIdx) => (
                            <div key={aIdx} className="p-1 rounded border border-white/20 bg-white/5 max-w-[120px]">
                              <img
                                src={item}
                                alt="Response Proof"
                                onClick={() => setActiveEnlargedImage(item)}
                                className="max-h-16 w-auto object-cover rounded cursor-pointer"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="font-body p-2.5 rounded bg-white/5 border border-white/10 text-white whitespace-pre-wrap leading-relaxed break-words">
                          {String(ans.answer || 'No response provided')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Photographs */}
            {selectedSubmission.photos && selectedSubmission.photos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-display text-xs uppercase tracking-wider text-white font-semibold">
                  Uploaded Verification Photographs ({selectedSubmission.photos.length})
                </h4>
                <div className="flex flex-wrap gap-3">
                  {selectedSubmission.photos.map((photo, pIdx) => (
                    <div
                      key={pIdx}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg border border-white/30 overflow-hidden bg-black cursor-pointer hover:border-white transition-colors"
                      onClick={() => setActiveEnlargedImage(photo)}
                    >
                      <img
                        src={photo}
                        alt={`Verification ${pIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Notes */}
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase tracking-wider text-white font-semibold block">
                Internal Council Notes
              </label>
              <textarea
                rows={2}
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="Record candidate observations or evaluation notes..."
                className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white text-base sm:text-xs focus:outline-none focus:border-white"
              />
              <button
                type="button"
                onClick={() => handleStatusChange(selectedSubmission.id, selectedSubmission.status)}
                className="w-full sm:w-auto px-4 py-2 rounded bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors text-center"
              >
                Save Council Notes
              </button>
            </div>

            <div className="pt-4 border-t border-white/20 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                className="px-3 py-2 rounded border border-white/30 hover:border-white bg-black text-white font-mono text-xs"
              >
                Delete Answersheet
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-5 py-2 rounded border border-white/20 text-white font-mono text-xs hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {activeEnlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setActiveEnlargedImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-black border border-white/40 rounded-xl overflow-hidden p-2">
            <img
              src={activeEnlargedImage}
              alt="Enlarged"
              className="max-h-[80vh] w-auto object-contain mx-auto"
            />
            <button
              type="button"
              onClick={() => setActiveEnlargedImage(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-black/80 border border-white/40 text-white"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
