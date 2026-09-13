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
  Camera
} from 'lucide-react';
import {
  Question,
  SocietySettings,
  Answersheet,
  SubmissionStatus,
  CandidateAnswer,
  QuestionType
} from '../types';
import {
  saveQuestion,
  deleteQuestionById,
  updateSubmissionStatus,
  deleteSubmissionById,
  updateSocietySettings,
  clearAllQuestions
} from '../lib/firebase';

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
  const [activeTab, setActiveTab] = useState<'questions' | 'submissions' | 'settings'>('questions');

  // Selected submission dossier for modal inspection
  const [selectedSubmission, setSelectedSubmission] = useState<Answersheet | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [activeEnlargedImage, setActiveEnlargedImage] = useState<string | null>(null);

  // Search & filter submissions
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('all');

  // Question editing / creation modal state (no automated scoring or answer checking)
  const [isEditingQuestion, setIsEditingQuestion] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question>({
    id: '',
    title: '',
    description: '',
    type: 'multiple_choice',
    options: ['Option A', 'Option B'],
    order: questions.length + 1,
    required: true,
    category: 'General'
  });

  // Settings form
  const [societyHeading, setSocietyHeading] = useState(settings.heading || 'secretsociety_ind');
  const [societySubheading, setSocietySubheading] = useState(settings.subheading || '');
  const [oathIntro, setOathIntro] = useState(settings.oathIntro || '');
  const [closingMessage, setClosingMessage] = useState(settings.closingMessage || '');
  const [backgroundImage, setBackgroundImage] = useState(settings.backgroundImage || '');
  const [sigilImage, setSigilImage] = useState(settings.sigilImage || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Background image file input ref
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  // Sigil image file input ref
  const sigilFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingSigil, setIsUploadingSigil] = useState(false);

  // Synchronize local form states when settings change
  useEffect(() => {
    setSocietyHeading(settings.heading || 'secretsociety_ind');
    setSocietySubheading(settings.subheading || '');
    setOathIntro(settings.oathIntro || '');
    setClosingMessage(settings.closingMessage || '');
    setBackgroundImage(settings.backgroundImage || '');
    setSigilImage(settings.sigilImage || '');
  }, [settings]);

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

  // Open Question Editor
  const handleOpenNewQuestion = () => {
    setEditingQuestion({
      id: `q_${Date.now()}`,
      title: '',
      description: '',
      type: 'multiple_choice',
      options: ['Option 1', 'Option 2'],
      order: questions.length + 1,
      required: true,
      category: 'General'
    });
    setIsEditingQuestion(true);
  };

  const handleEditQuestion = (q: Question) => {
    setEditingQuestion({
      ...q,
      options: q.options ? [...q.options] : ['Option 1', 'Option 2']
    });
    setIsEditingQuestion(true);
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
    if (confirm('Delete this question from candidate examination?')) {
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

  // Handle local background image file upload
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

  // Handle local sigil / logo image file upload
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

  // Update candidate status - manual council decision
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
    if (confirm('Permanently delete this candidate submission?')) {
      try {
        await deleteSubmissionById(id);
        setSelectedSubmission(null);
        onRefreshData();
      } catch (err) {
        console.error('Delete submission error:', err);
      }
    }
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.candidateAlias.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Security Gate Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 text-white overflow-x-hidden">
        <div className="w-full max-w-sm bg-black border border-white/20 rounded-xl p-8 shadow-2xl text-center space-y-6">
          {settings.sigilImage ? (
            <div className="flex justify-center">
              <div className="p-2.5 rounded-xl border border-white/20 bg-black shadow-lg max-w-[100px] max-h-[100px] flex items-center justify-center">
                <img
                  src={settings.sigilImage}
                  alt="Society Sigil"
                  className="max-h-20 max-w-20 object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="p-3.5 rounded-full border border-white/20 bg-black shadow-lg">
                <Lock className="w-8 h-8 text-white" />
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
                className="w-full font-mono text-center tracking-widest px-4 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:border-white transition-colors"
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
              className="w-full py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-[0.2em] font-bold transition-colors"
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

  // Authenticated Admin Dashboard
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 text-white box-border overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/20 gap-4 mb-8">
        <div className="flex items-center gap-3.5">
          {settings.sigilImage ? (
            <div className="p-1.5 rounded-lg border border-white/20 bg-black shrink-0 max-w-[48px] max-h-[48px] flex items-center justify-center shadow">
              <img
                src={settings.sigilImage}
                alt="Society Sigil"
                className="max-h-9 max-w-9 object-contain"
              />
            </div>
          ) : (
            <div className="p-2.5 rounded-full border border-white/20 bg-black shrink-0">
              <Lock className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-[0.14em] uppercase text-white">
                {settings.heading || 'secretsociety_ind'}
              </h1>
              <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white font-medium">
                Admin Portal
              </span>
            </div>
            <p className="font-mono text-xs text-white/60 tracking-wider mt-1">
              Council Review & Question Management
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNavigateToCandidate}
            className="px-3.5 py-1.5 rounded-lg border border-white/20 hover:border-white/50 bg-black font-display text-xs uppercase tracking-wider text-white transition-colors flex items-center gap-1.5 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Candidate View
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-lg border border-white/20 hover:border-white/50 bg-black font-display text-xs uppercase tracking-wider text-white/80 hover:text-white transition-colors font-semibold"
          >
            Lock Portal
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/20 mb-8 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('questions')}
          className={`pb-3 px-4 font-display text-xs uppercase tracking-[0.15em] transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'questions'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4 text-white" />
          <span>Questions</span>
          <span className="font-mono text-[11px] opacity-75">({questions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-4 font-display text-xs uppercase tracking-[0.15em] transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'submissions'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4 text-white" />
          <span>Answersheets</span>
          <span className="font-mono text-[11px] opacity-75">({submissions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 font-display text-xs uppercase tracking-[0.15em] transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-white/60 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4 text-white" />
          <span>Settings & Background</span>
        </button>
      </div>

      {/* TAB 1: QUESTIONS MANAGER */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold tracking-wide uppercase text-white">Application Questions</h2>
              <p className="font-editorial italic text-xs sm:text-sm text-white/75">
                All questions appear on the candidate application in the order listed below.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {questions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllQuestions}
                  className="px-3 py-2 rounded-lg border border-white/20 hover:border-white/40 bg-black font-mono text-xs text-white transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenNewQuestion}
                className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-black" />
                Add Question
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="bg-black border border-white/20 rounded-xl p-12 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-black border border-white/30 flex items-center justify-center text-white">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">No Questions Configured</h3>
                <p className="font-editorial italic text-xs sm:text-sm text-white/70 max-w-sm mx-auto mt-1">
                  Create questions of any type: Agree/Disagree, Multiple Choice, 1-10 Rating Scale,
                  Written Essay, or Photographic Upload.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewQuestion}
                className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4 text-black" />
                Create First Question
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="bg-black border border-white/20 hover:border-white/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs text-white/50 font-bold tracking-wider">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <h4 className="font-body text-sm font-medium text-white">{q.title}</h4>
                      <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white font-medium">
                        {q.type.replace('_', ' ')}
                      </span>
                      {q.required && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/70">
                          (Required)
                        </span>
                      )}
                    </div>

                    {q.description && (
                      <p className="font-editorial italic text-xs text-white/75 pl-6 leading-relaxed">
                        {q.description}
                      </p>
                    )}

                    {q.type === 'multiple_choice' && q.options && (
                      <div className="text-xs text-white/70 pl-6 flex flex-wrap gap-2 pt-1">
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

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <div className="flex items-center border border-white/20 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveQuestion(idx, 'up')}
                        className="p-1.5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
                        title="Move Up"
                      >
                        <ChevronUp className="w-4 h-4 text-white" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === questions.length - 1}
                        onClick={() => handleMoveQuestion(idx, 'down')}
                        className="p-1.5 hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
                        title="Move Down"
                      >
                        <ChevronDown className="w-4 h-4 text-white" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEditQuestion(q)}
                      className="p-2 rounded-lg border border-white/20 hover:border-white/50 bg-black text-white transition-colors"
                      title="Edit Question"
                    >
                      <Edit3 className="w-4 h-4 text-white" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="p-2 rounded-lg border border-white/20 hover:border-white/50 bg-black text-white/80 hover:text-white transition-colors"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUBMISSIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold tracking-wide uppercase text-white">Candidate Answersheets</h2>
              <p className="font-editorial italic text-xs sm:text-sm text-white/75">
                Incoming candidate dossiers for manual review and determination.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, alias, email..."
                  className="w-full font-body pl-9 pr-3 py-1.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="font-mono px-3 py-1.5 rounded-lg bg-black border border-white/20 text-xs text-white focus:outline-none focus:border-white uppercase"
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
            <div className="bg-black border border-white/20 rounded-xl p-12 text-center text-white/70 font-mono text-xs">
              No candidate dossiers match the current filters.
            </div>
          ) : (
            <div className="border border-white/20 rounded-xl overflow-hidden bg-black">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-white/90 uppercase tracking-widest border-b border-white/20 font-mono text-[10px] sm:text-[11px]">
                    <tr>
                      <th className="p-3.5">Candidate</th>
                      <th className="p-3.5">Alias</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Photos</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredSubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-display font-semibold tracking-wide text-white">{sub.candidateName}</td>
                        <td className="p-3.5 font-mono text-white/80">{sub.candidateAlias}</td>
                        <td className="p-3.5 font-mono text-white/60">{sub.candidateEmail}</td>
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
                            className="font-display px-3 py-1 rounded border border-white/20 hover:border-white bg-black text-white text-[11px] uppercase tracking-wider transition-colors font-semibold"
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
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS & BACKGROUND */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="font-display text-base sm:text-lg font-semibold tracking-wide uppercase text-white">System Settings & Background</h2>
            <p className="font-editorial italic text-xs sm:text-sm text-white/75">
              Configure portal titles, candidate messages, and upload custom background image.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="bg-black border border-white/20 rounded-xl p-6 space-y-5">
            <div>
              <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                Application Heading
              </label>
              <input
                type="text"
                value={societyHeading}
                onChange={(e) => setSocietyHeading(e.target.value)}
                placeholder="secretsociety_ind"
                className="w-full font-body px-3.5 py-2 rounded-lg bg-black border border-white/20 text-white text-sm focus:outline-none focus:border-white"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                Subheading / Protocol Title
              </label>
              <input
                type="text"
                value={societySubheading}
                onChange={(e) => setSocietySubheading(e.target.value)}
                placeholder="Candidate Application Portal"
                className="w-full font-body px-3.5 py-2 rounded-lg bg-black border border-white/20 text-white text-sm focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                Candidate Introductory Notice
              </label>
              <textarea
                rows={2}
                value={oathIntro}
                onChange={(e) => setOathIntro(e.target.value)}
                placeholder="Instructions displayed at the top of the candidate examination..."
                className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white text-sm focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1.5">
                Post-Submission Closing Notice
              </label>
              <textarea
                rows={2}
                value={closingMessage}
                onChange={(e) => setClosingMessage(e.target.value)}
                placeholder="Notice displayed after successful submission..."
                className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white text-sm focus:outline-none focus:border-white"
              />
            </div>

            {/* Society Sigil Image Upload & Config */}
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

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    ref={sigilFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSigilFileUpload}
                    className="hidden"
                  />
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
                  <div className="p-4 rounded-lg border border-white/20 bg-black flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg border border-white/20 bg-black flex items-center justify-center p-2 shrink-0">
                      <img
                        src={sigilImage}
                        alt="Sigil Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-xs text-white font-medium block">Active Sigil Image</span>
                      <p className="font-editorial italic text-xs text-white/70">
                        Displayed at the top of the candidate application form and council portal.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-white/10 bg-black text-center font-editorial italic text-xs text-white/60">
                    No sigil image uploaded. The header cleanly displays the society heading and protocol title.
                  </div>
                )}
              </div>
            </div>

            {/* Background Image Upload & Config */}
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

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    ref={bgFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBgFileUpload}
                    className="hidden"
                  />
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
                  <div className="relative aspect-video max-h-40 rounded-lg overflow-hidden border border-white/20 bg-black">
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
            </div>

            <div className="pt-2 flex items-center justify-between">
              {settingsSuccess && (
                <span className="font-mono text-xs text-white flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5 text-white" />
                  Settings saved successfully.
                </span>
              )}
              <button
                type="submit"
                disabled={isSavingSettings}
                className="ml-auto px-6 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-black" />
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD / EDIT QUESTION (NO SCORING) */}
      {isEditingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-black border border-white/30 rounded-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
                {editingQuestion.id && !editingQuestion.id.startsWith('q_') ? 'Edit Question' : 'Add New Question'}
              </h3>
              <button
                onClick={() => setIsEditingQuestion(false)}
                className="text-white/70 hover:text-white"
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
                  className="w-full font-body px-3.5 py-2 rounded-lg bg-black border border-white/20 text-white text-sm focus:outline-none focus:border-white"
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
                  placeholder="Instructions or context for candidate..."
                  className="w-full font-body p-2.5 rounded-lg bg-black border border-white/20 text-white text-sm focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          e.target.value === 'multiple_choice' && !editingQuestion.options?.length
                            ? ['Option 1', 'Option 2']
                            : editingQuestion.options
                      })
                    }
                    className="w-full font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase"
                  >
                    <option value="agree_disagree">Agree / Disagree</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="scale">Rating Scale (1 - 10)</option>
                    <option value="text">Written Essay / Text</option>
                    <option value="photo">Candidate Photo Upload</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-xs font-semibold text-white/85 uppercase tracking-wider mb-1">
                    Category Tag
                  </label>
                  <input
                    type="text"
                    value={editingQuestion.category || ''}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                    placeholder="e.g. Oath, Logic, General"
                    className="w-full font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase"
                  />
                </div>
              </div>

              {/* Multiple Choice Options Builder */}
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
                              const updated = editingQuestion.options?.filter((_, i) => i !== oIdx);
                              setEditingQuestion({
                                ...editingQuestion,
                                options: updated
                              });
                            }}
                            className="text-white/60 hover:text-white p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-white" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="requiredCheckbox"
                  checked={editingQuestion.required}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                  className="accent-white rounded"
                />
                <label htmlFor="requiredCheckbox" className="font-body text-xs text-white">
                  Candidate response is mandatory
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/20">
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

      {/* MODAL: SUBMISSION DOSSIER INSPECTION (NO ANSWER CHECKING, PURE COUNCIL REVIEW) */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-black border border-white/30 rounded-xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/20 pb-4">
              <div>
                <span className="font-mono text-xs uppercase text-white/70 font-medium tracking-wider">
                  Candidate Dossier
                </span>
                <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white mt-0.5">
                  {selectedSubmission.candidateName}
                </h3>
                <p className="font-mono text-xs text-white/70 mt-0.5">
                  Alias: {selectedSubmission.candidateAlias} • {selectedSubmission.candidateEmail}
                </p>
              </div>

              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Candidate Metadata Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-black border border-white/20 p-3 rounded-lg">
                <span className="font-mono text-[10px] uppercase text-white/60 tracking-wider block">Council Status</span>
                <span className="font-mono text-white uppercase font-bold tracking-wider">
                  {selectedSubmission.status}
                </span>
              </div>
              <div className="bg-black border border-white/20 p-3 rounded-lg">
                <span className="font-mono text-[10px] uppercase text-white/60 tracking-wider block">Submission Date</span>
                <span className="font-mono text-white">
                  {new Date(selectedSubmission.submittedAt).toLocaleString()}
                </span>
              </div>
              <div className="bg-black border border-white/20 p-3 rounded-lg">
                <span className="font-mono text-[10px] uppercase text-white/60 tracking-wider block">Reference ID</span>
                <span className="font-mono text-white/80 select-all truncate block">
                  {selectedSubmission.id}
                </span>
              </div>
            </div>

            {/* Status Determination Controls */}
            <div className="p-4 rounded-lg bg-black border border-white/20 space-y-2">
              <span className="font-mono text-xs text-white/80 font-semibold block uppercase tracking-wider">
                Council Determination:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedSubmission.id, 'accepted')}
                  className="px-4 py-1.5 rounded bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors"
                >
                  Accept Candidate
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedSubmission.id, 'scrutiny')}
                  className="px-4 py-1.5 rounded border border-white/30 hover:border-white bg-black text-white font-display text-xs uppercase tracking-wider font-semibold transition-colors"
                >
                  Under Scrutiny
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedSubmission.id, 'rejected')}
                  className="px-4 py-1.5 rounded border border-white/30 hover:border-white bg-black text-white font-display text-xs uppercase tracking-wider font-semibold transition-colors"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedSubmission.id, 'pending')}
                  className="px-4 py-1.5 rounded border border-white/20 hover:border-white bg-black text-white/70 font-display text-xs uppercase tracking-wider font-semibold transition-colors"
                >
                  Set Pending
                </button>
              </div>
            </div>

            {/* Candidate Answers Breakdown */}
            <div className="space-y-3">
              <h4 className="font-display text-xs uppercase tracking-wider text-white font-semibold">
                Candidate Responses ({Object.keys(selectedSubmission.answers || {}).length})
              </h4>

              <div className="space-y-2.5">
                {(Object.values(selectedSubmission.answers || {}) as CandidateAnswer[]).map((ans, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-black border border-white/20 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-body font-medium text-white">
                        {ans.questionTitle || `Question ${idx + 1}`}
                      </span>
                      <span className="font-mono text-[10px] uppercase text-white/60 tracking-wider">
                        {ans.questionType.replace('_', ' ')}
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
                        <div className="flex gap-2 mt-1">
                          {ans.answer.map((imgUrl, i) => (
                            <img
                              key={i}
                              src={imgUrl}
                              alt="Response proof"
                              onClick={() => setActiveEnlargedImage(imgUrl)}
                              className="w-16 h-16 rounded object-cover border border-white/20 cursor-pointer hover:border-white"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="font-body p-2.5 rounded bg-white/5 border border-white/10 text-white whitespace-pre-wrap leading-relaxed">
                          {String(ans.answer || 'No response provided')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidate Photos */}
            {selectedSubmission.photos && selectedSubmission.photos.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-display text-xs uppercase tracking-wider text-white font-semibold">
                  Uploaded Verification Photographs ({selectedSubmission.photos.length})
                </h4>
                <div className="flex flex-wrap gap-3">
                  {selectedSubmission.photos.map((photo, pIdx) => (
                    <img
                      key={pIdx}
                      src={photo}
                      alt={`Candidate photo ${pIdx + 1}`}
                      onClick={() => setActiveEnlargedImage(photo)}
                      className="w-24 h-24 rounded-lg object-cover border border-white/20 cursor-pointer hover:border-white transition-all"
                    />
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
                className="w-full font-body p-3 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
              />
              <button
                type="button"
                onClick={() => handleStatusChange(selectedSubmission.id, selectedSubmission.status)}
                className="px-4 py-1.5 rounded bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors"
              >
                Save Council Notes
              </button>
            </div>

            <div className="pt-4 border-t border-white/20 flex justify-between items-center">
              <button
                type="button"
                onClick={() => handleDeleteSubmission(selectedSubmission.id)}
                className="px-3 py-1.5 rounded border border-white/30 hover:border-white bg-black text-white font-mono text-xs"
              >
                Delete Answersheet
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-1.5 rounded border border-white/20 text-white font-mono text-xs hover:bg-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Image Modal */}
      {activeEnlargedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveEnlargedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-black border border-white/30 rounded-xl p-2 shadow-2xl">
            <button
              onClick={() => setActiveEnlargedImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black border border-white/40 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <img src={activeEnlargedImage} alt="Enlarged verification" className="max-h-[80vh] rounded object-contain" />
          </div>
        </div>
      )}
    </div>
  );
};
