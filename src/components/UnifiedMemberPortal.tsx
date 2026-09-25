import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  FileText,
  BookOpen,
  Video,
  ArrowRight,
  Shield,
  Lock,
  Key,
  User,
  LogOut,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  ChevronRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { SocietySettings, MemberAccount } from '../types';
import { authenticateMember } from '../lib/firebase';
import { AppRoute } from '../App';

interface UnifiedMemberPortalProps {
  settings: SocietySettings;
  onNavigateToRoute: (route: AppRoute) => void;
  onNavigateToCandidate: () => void;
}

const SESSION_KEY = 'secretsociety_member_session';
const CHAT_SESSION_KEY = 'secretsociety_chat_member';

export const UnifiedMemberPortal: React.FC<UnifiedMemberPortalProps> = ({
  settings,
  onNavigateToRoute,
  onNavigateToCandidate
}) => {
  // Check active session
  const [activeMember, setActiveMember] = useState<MemberAccount | null>(() => {
    try {
      const saved =
        sessionStorage.getItem(SESSION_KEY) ||
        sessionStorage.getItem(CHAT_SESSION_KEY) ||
        localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login form state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [aliasInput, setAliasInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync session state if another tab or window updates
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved =
          sessionStorage.getItem(SESSION_KEY) ||
          sessionStorage.getItem(CHAT_SESSION_KEY) ||
          localStorage.getItem(SESSION_KEY);
        setActiveMember(saved ? JSON.parse(saved) : null);
      } catch {
        setActiveMember(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAlias = aliasInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanAlias || !cleanPass) {
      setAuthError('Please enter both Member Alias and Password.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const member = await authenticateMember(cleanAlias, cleanPass);
      if (member) {
        // Save to all session storage keys for universal member authorization
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(member));
        sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify(member));
        try {
          localStorage.setItem(SESSION_KEY, JSON.stringify(member));
        } catch {}
        setActiveMember(member);
        setAliasInput('');
        setPasswordInput('');
        setShowAuthModal(false);
      } else {
        setAuthError('Invalid credentials. Please verify your alias and passcode.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error. Please retry.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(CHAT_SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    setActiveMember(null);
  };

  const portalCards = [
    {
      id: 'chat' as AppRoute,
      title: 'Chats',
      route: '#/chat',
      tag: 'Direct Comms Console',
      icon: MessageSquare,
      headline: 'Encrypted Council Communications',
      description:
        'Point-to-point real-time encrypted channel with the Council Administration. Receive direct instructions, transmit field updates, and coordinate with command.',
      features: [
        'Secure 1-on-1 dialogue with Council Admin',
        'Real-time delivery with instant read confirmation',
        'Direct dispatch transmission & urgent notices'
      ],
      badge: 'Direct Comms',
      buttonText: 'Enter Chats'
    },
    {
      id: 'info' as AppRoute,
      title: 'Info Logs',
      route: '#/info',
      tag: 'Task Directives & Intel',
      icon: FileText,
      headline: 'Operational Task System',
      description:
        'Complete assigned operational directives, submit formal intelligence filings by purpose, and continuously append field findings to authorized reporting dossiers.',
      features: [
        'Purpose-driven operational task submissions',
        'Continuous intelligence appending to allowed boxes',
        'Active directive tracking & submission history'
      ],
      badge: 'Task System',
      buttonText: 'Enter Info Logs'
    },
    {
      id: 'knowledge' as AppRoute,
      title: 'Knowledge',
      route: '#/knowledge',
      tag: 'Doctrine & Repository',
      icon: BookOpen,
      headline: 'Classified Council Archives',
      description:
        'Comprehensive repository of society doctrine, foundational mandates, standard operating procedures, and classified council articles.',
      features: [
        'Curated doctrinal articles and operational lore',
        'Classified protocols and verified society rules',
        'Full-text search across categories and dispatches'
      ],
      badge: 'Doctrinal Vault',
      buttonText: 'Enter Knowledge'
    },
    {
      id: 'videos' as AppRoute,
      title: 'Videos',
      route: '#/videos',
      tag: 'Video Screenings & Media',
      icon: Video,
      headline: 'Council Video Archive',
      description:
        'Official council video broadcasts, visual intelligence briefings, recorded ceremonies, and classified media dispatches.',
      features: [
        'Official visual dispatches and recorded briefings',
        'Cinema-grade player with high-definition streaming',
        'Categorized archive with instant keyword filtering'
      ],
      badge: 'Media Archive',
      buttonText: 'Enter Videos'
    }
  ];

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/15">
        <button
          type="button"
          onClick={onNavigateToCandidate}
          className="inline-flex items-center gap-2 font-mono text-xs text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-white/70" />
          <span>Candidate Examination (/#/)</span>
        </button>

        {/* Member Status Bar */}
        <div className="flex items-center gap-3">
          {activeMember ? (
            <div className="flex items-center gap-3 bg-white/[0.04] border border-white/20 rounded-xl px-3.5 py-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="font-mono text-xs text-white flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-white/70" />
                <span className="uppercase tracking-wider">{activeMember.alias}</span>
                {activeMember.role && (
                  <span className="text-white/50 text-[11px] font-normal">
                    ({activeMember.role})
                  </span>
                )}
              </div>
              <div className="h-4 w-px bg-white/20" />
              <button
                type="button"
                onClick={handleLogout}
                className="font-mono text-[11px] text-white/60 hover:text-white flex items-center gap-1 transition-colors"
                title="Sign out of Member Hub"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(!showAuthModal)}
              className="inline-flex items-center gap-1.5 font-mono text-xs px-3.5 py-1.5 rounded-xl border border-white/25 bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-white/70" />
              <span>{showAuthModal ? 'Close Sign-In' : 'Universal Member Sign-In'}</span>
            </button>
          )}

          <a
            href="#/admin"
            className="font-mono text-[11px] text-white/40 hover:text-white/80 transition-colors"
          >
            Admin (/#/admin)
          </a>
        </div>
      </div>

      {/* Collapsible Quick Authentication Panel (if not logged in) */}
      {!activeMember && showAuthModal && (
        <div className="bg-black border border-white/25 rounded-2xl p-6 sm:p-7 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-white" />
              <span className="font-mono text-xs uppercase tracking-wider text-white font-semibold">
                Universal Member Authentication
              </span>
            </div>
            <span className="font-mono text-[10px] text-white/50">
              Signs into Chats, Info Logs, Knowledge & Videos
            </span>
          </div>

          <p className="font-editorial italic text-xs sm:text-sm text-white/70">
            Enter your council alias and password below. Authenticating here automatically establishes your clearance across all four member portals.
          </p>

          {authError && (
            <div className="p-3 rounded-lg border border-white/40 bg-white/5 flex items-center gap-2 text-white text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70 mb-1">
                Member Alias
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="e.g. ARCHON_01"
                  required
                  autoCapitalize="characters"
                  className="w-full font-mono pl-9 pr-3 py-2 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white uppercase tracking-wider"
                />
                <User className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70 mb-1">
                Custom Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full font-mono pl-9 pr-10 py-2 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white"
                />
                <Key className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="px-4 py-2 rounded-lg border border-white/20 font-mono text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAuthenticating}
                className="px-6 py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 active:scale-[0.99] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isAuthenticating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-black" />
                    <span>Authenticate Member</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Header / Banner */}
      <div className="text-center space-y-4 pt-2 pb-4">
        {settings.sigilImage && (
          <div className="flex justify-center mb-2">
            <div className="p-2.5 rounded-xl border border-white/20 bg-black max-w-[100px] max-h-[100px] flex items-center justify-center shadow-lg">
              <img
                src={settings.sigilImage}
                alt="Society Sigil"
                className="max-h-20 max-w-20 object-contain"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/[0.04]">
            <Shield className="w-3 h-3 text-white/80" />
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-white/80 font-semibold">
              Unified Member Area
            </span>
          </div>

          <h1 className="font-chancery text-3xl sm:text-4xl lg:text-5xl font-bold tracking-wide text-white">
            {settings.memberPortalHeading || settings.heading || 'secretsociety_ind'}
          </h1>

          <p className="font-editorial italic text-base sm:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Centralized operative hub providing verified access to direct council communications, operational task logs, doctrinal archives, and visual dispatches.
          </p>
        </div>
      </div>

      {/* 4 Cards Grid - Exactly 2 Cards in a Row (2x2 on md+ screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {portalCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.id}
              className="group relative bg-black border border-white/20 hover:border-white/50 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 hover:shadow-2xl hover:shadow-white/5 bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden"
            >
              {/* Top Accent Pill and Header */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl border border-white/25 bg-black flex items-center justify-center shadow-md group-hover:border-white/60 transition-colors shrink-0">
                    <IconComponent className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded border border-white/20 bg-white/5 text-white/80">
                      {card.badge}
                    </span>
                    <span className="font-mono text-[10px] text-white/40 tracking-wider">
                      {card.route}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[11px] uppercase tracking-widest text-white/50 font-medium mb-1">
                    {card.tag}
                  </div>
                  <h2 className="font-chancery text-2xl sm:text-3xl font-bold tracking-wide text-white group-hover:text-white transition-colors">
                    {card.title}
                  </h2>
                  <div className="font-body text-xs font-medium text-white/80 mt-1">
                    {card.headline}
                  </div>
                </div>

                <p className="font-editorial italic text-sm text-white/70 leading-relaxed">
                  {card.description}
                </p>

                {/* Feature Bullets */}
                <div className="pt-2 space-y-1.5 border-t border-white/10">
                  {card.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 font-mono text-[11px] text-white/60"
                    >
                      <div className="w-1 h-1 rounded-full bg-white/60" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6 mt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => onNavigateToRoute(card.id)}
                  className="w-full py-3 px-4 rounded-xl border border-white/30 bg-white/5 hover:bg-white hover:text-black group-hover:border-white text-white font-mono text-xs font-semibold uppercase tracking-wider flex items-center justify-between transition-all active:scale-[0.99] shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4 text-inherit" />
                    <span>{card.buttonText}</span>
                  </span>
                  <div className="flex items-center gap-1 text-inherit">
                    <span className="text-[10px] opacity-80">{card.route}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Info */}
      <div className="pt-8 border-t border-white/15 text-center space-y-2">
        <div className="font-mono text-xs text-white/50 tracking-wider">
          {settings.heading || 'secretsociety_ind'} • Unified Member Portal Area (/#/member)
        </div>
        <div className="font-editorial italic text-xs text-white/40">
          Authorized personnel only. All access, transmission, and operational entries are logged and archived.
        </div>
      </div>
    </div>
  );
};
