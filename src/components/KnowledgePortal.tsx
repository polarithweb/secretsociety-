import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Lock,
  Eye,
  EyeOff,
  User,
  LogOut,
  Clock,
  ArrowLeft,
  Share2,
  Bookmark,
  Calendar,
  Layers,
  FileText,
  Check,
  ChevronRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { KnowledgeArticle, MemberAccount, SocietySettings } from '../types';
import {
  getKnowledgeArticles,
  subscribeToKnowledgeArticles,
  authenticateMember
} from '../lib/firebase';

interface KnowledgePortalProps {
  settings: SocietySettings;
  onNavigateToCandidate?: () => void;
  onNavigateToInfo?: () => void;
}

export const KnowledgePortal: React.FC<KnowledgePortalProps> = ({
  settings,
  onNavigateToCandidate,
  onNavigateToInfo
}) => {
  // Member authentication state - shared session with /#/info
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

  // Articles state
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState(false);

  // Load and subscribe to published articles
  useEffect(() => {
    getKnowledgeArticles(true).then(setArticles).catch(console.warn);
    const unsubscribe = subscribeToKnowledgeArticles((arts) => {
      setArticles(arts);
    }, true);
    return () => unsubscribe();
  }, []);

  // Handle member login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aliasInput.trim() || !passwordInput.trim()) {
      setAuthError('Please enter both Member Alias and Password.');
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
        setAuthError('Access Denied. Credentials invalid or member account not authorized.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify council credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle member logout
  const handleLogout = () => {
    sessionStorage.removeItem('secretsociety_member_session');
    setActiveMember(null);
    setSelectedArticleId(null);
  };

  // Currently opened article for reading
  const activeArticle = useMemo(() => {
    if (!selectedArticleId) return null;
    return articles.find((a) => a.id === selectedArticleId) || null;
  }, [selectedArticleId, articles]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [articles]);

  // Filtered articles list
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      if (selectedCategory !== 'all' && art.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        art.title.toLowerCase().includes(q) ||
        (art.summary && art.summary.toLowerCase().includes(q)) ||
        (art.category && art.category.toLowerCase().includes(q)) ||
        (art.tags && art.tags.some((t) => t.toLowerCase().includes(q))) ||
        art.content.toLowerCase().includes(q)
      );
    });
  }, [articles, selectedCategory, searchQuery]);

  // Estimate reading time in minutes
  const getReadingTime = (content: string) => {
    const textOnly = content.replace(/<[^>]*>/g, '');
    const wordCount = textOnly.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 180));
  };

  // Handle copy share link
  const handleCopyShare = () => {
    if (activeArticle) {
      const url = `${window.location.origin}${window.location.pathname}#/knowledge?article=${activeArticle.id}`;
      navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  // =========================================================================
  // MEMBER AUTHENTICATION GATE (Restricted Access)
  // =========================================================================
  if (!activeMember) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative selection:bg-white selection:text-black">
        {/* Subtle background ambient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06)_0%,transparent_60%)] pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full relative z-10">
          <div className="flex items-center gap-3">
            {settings.sigilImage ? (
              <img
                src={settings.sigilImage}
                alt="Council Sigil"
                className="w-7 h-7 object-contain opacity-80"
              />
            ) : (
              <div className="w-7 h-7 rounded border border-white/30 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
            )}
            <span className="font-chancery text-base tracking-wide font-bold text-white">
              {settings.heading || 'secretsociety_ind'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToInfo) onNavigateToInfo();
                else window.location.hash = '#/info';
              }}
              className="font-mono text-xs text-white/60 hover:text-white px-2.5 py-1 rounded border border-white/20 transition-colors"
            >
              Info Portal (/#/info)
            </button>
            <button
              type="button"
              onClick={() => {
                if (onNavigateToCandidate) onNavigateToCandidate();
                else window.location.hash = '#/';
              }}
              className="font-mono text-xs text-white/60 hover:text-white px-2.5 py-1 rounded border border-white/20 transition-colors"
            >
              Candidate View
            </button>
          </div>
        </div>

        {/* Login Box */}
        <div className="max-w-md w-full mx-auto my-auto relative z-10 py-10">
          <div className="bg-black border border-white/25 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full border border-white/30 bg-white/5 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/60 block">
                Restricted Clearance
              </span>
              <h1 className="font-chancery text-2xl sm:text-3xl font-bold tracking-wide text-white">
                Knowledge Repository
              </h1>
              <p className="font-editorial italic text-xs sm:text-sm text-white/70">
                Access is strictly restricted to members permitted to the Info Portal. Authenticate using your verified alias and passcode.
              </p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-lg border border-white/40 bg-white/5 text-white font-body text-xs leading-relaxed">
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block font-mono text-xs uppercase tracking-wider text-white/80">
                  Member Alias
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    placeholder="e.g. ARCHON_01"
                    className="w-full font-body px-3.5 py-2.5 rounded-lg bg-black border border-white/25 text-white placeholder-white/25 text-xs focus:outline-none focus:border-white transition-colors"
                  />
                  <User className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-xs uppercase tracking-wider text-white/80">
                  Passcode
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter security passcode..."
                    className="w-full font-body px-3.5 py-2.5 rounded-lg bg-black border border-white/25 text-white placeholder-white/25 text-xs focus:outline-none focus:border-white transition-colors pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center justify-center gap-2 mt-2"
              >
                {isAuthenticating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-black" />
                    Access Knowledge Portal
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-white/10 text-center font-mono text-[10px] text-white/40 space-y-1">
              <p>Same credentials as Member Info Portal.</p>
              <p>Session persists across council modules.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center font-mono text-[10px] text-white/30 relative z-10 py-2">
          Council Archives • High Level Compartmentalization
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED MEMBER VIEW
  // =========================================================================
  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col justify-between selection:bg-white selection:text-black">
      {/* Top Council Navigation Bar */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-md border-b border-white/15 px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Brand & Portal Title */}
          <div className="flex items-center gap-3">
            {settings.sigilImage ? (
              <img
                src={settings.sigilImage}
                alt="Sigil"
                className="w-7 h-7 object-contain opacity-90"
              />
            ) : (
              <div className="w-7 h-7 rounded border border-white/30 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-chancery text-base tracking-wide font-bold text-white">
                  {settings.heading || 'secretsociety_ind'}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white">
                  Knowledge Archives
                </span>
              </div>
              <p className="font-mono text-[10px] text-white/50">
                Council Knowledge Repository & Articles
              </p>
            </div>
          </div>

          {/* Module Links & Member Profile */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToInfo) onNavigateToInfo();
                  else window.location.hash = '#/info';
                }}
                className="px-2.5 py-1 rounded-lg border border-white/20 hover:border-white text-white/70 hover:text-white font-mono text-xs transition-colors"
                title="Switch to Member Info & Task Portal"
              >
                Tasks & Forms (/#/info)
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToCandidate) onNavigateToCandidate();
                  else window.location.hash = '#/';
                }}
                className="px-2.5 py-1 rounded-lg border border-white/20 hover:border-white text-white/70 hover:text-white font-mono text-xs transition-colors"
                title="Switch to Candidate Entrance"
              >
                Candidate View
              </button>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-white/20">
              <div className="text-right hidden sm:block">
                <div className="font-mono text-xs text-white font-bold">
                  {activeMember.alias}
                </div>
                <div className="font-mono text-[9px] text-white/50">
                  {activeMember.role || 'Member'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg border border-white/20 text-white/50 hover:text-white hover:border-white transition-colors"
                title="Sign out of member session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1">
        {activeArticle ? (
          /* =================================================================
             ARTICLE READER VIEW
             ================================================================= */
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
            {/* Back Navigation Bar */}
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/15">
              <button
                type="button"
                onClick={() => setSelectedArticleId(null)}
                className="px-3 py-1.5 rounded-lg border border-white/20 hover:border-white text-white font-mono text-xs inline-flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to Archives
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyShare}
                  className="px-3 py-1.5 rounded-lg border border-white/20 hover:border-white text-white font-mono text-xs inline-flex items-center gap-1.5 transition-colors"
                  title="Copy link to this article"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      Link Copied
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-white/70" />
                      Share
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Optional Cover Banner */}
            {activeArticle.coverImage && (
              <div className="w-full h-64 sm:h-96 rounded-2xl overflow-hidden border border-white/20 bg-white/5 shadow-2xl">
                <img
                  src={activeArticle.coverImage}
                  alt={activeArticle.title}
                  className="w-full h-full object-cover grayscale contrast-125"
                />
              </div>
            )}

            {/* Article Heading & Metadata */}
            <div className="space-y-3 sm:space-y-4 pb-6 border-b border-white/15">
              <div className="flex items-center gap-2 flex-wrap font-mono text-xs text-white/60">
                <span className="uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white font-medium">
                  {activeArticle.category || 'General'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  {getReadingTime(activeArticle.content)} min read
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-white/40" />
                  {new Date(activeArticle.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-white/40" />
                  Scribe: {activeArticle.authorAlias || 'Council'}
                </span>
              </div>

              <h1 className="font-chancery text-2xl sm:text-3xl lg:text-4xl font-bold tracking-wide text-white leading-tight">
                {activeArticle.title}
              </h1>

              {activeArticle.summary && (
                <p className="font-editorial italic text-base sm:text-lg text-white/80 leading-relaxed max-w-3xl">
                  {activeArticle.summary}
                </p>
              )}

              {/* Tags */}
              {activeArticle.tags && activeArticle.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {activeArticle.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[10px] text-white/60 px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.02]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Rendered HTML Article Content with embedded images anywhere in the middle */}
            <article
              className="font-body text-sm sm:text-base text-white/90 leading-relaxed space-y-4 prose prose-invert max-w-none [&_h1]:font-chancery [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-wide [&_h1]:text-white [&_h1]:mt-8 [&_h1]:mb-3 [&_h2]:font-chancery [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-wide [&_h2]:text-white [&_h2]:mt-7 [&_h2]:mb-3 [&_h3]:font-chancery [&_h3]:text-base [&_h3]:font-bold [&_h3]:tracking-wide [&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:font-body [&_p]:text-sm [&_p]:sm:text-base [&_p]:text-white/85 [&_p]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-white [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:font-editorial [&_blockquote]:text-white/90 [&_blockquote]:my-5 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-2 [&_ul]:my-4 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-2 [&_ol]:my-4 [&_b]:text-white [&_b]:font-bold [&_strong]:text-white [&_strong]:font-bold [&_i]:italic [&_i]:font-editorial [&_u]:underline [&_u]:underline-offset-4 [&_code]:font-mono [&_code]:text-xs [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-white [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-white/20 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_hr]:border-white/15 [&_hr]:my-8 [&_img]:rounded-lg [&_img]:border [&_img]:border-white/20 [&_img]:max-w-full [&_img]:h-auto [&_img]:my-5 [&_figure]:my-6 [&_figcaption]:font-editorial [&_figcaption]:italic [&_figcaption]:text-xs [&_figcaption]:text-white/60 [&_figcaption]:text-center [&_figcaption]:mt-2"
              dangerouslySetInnerHTML={{ __html: activeArticle.content }}
            />

            {/* Article Footer & Return link */}
            <div className="pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedArticleId(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2 rounded-lg border border-white/20 hover:border-white text-white font-mono text-xs inline-flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to All Articles
              </button>

              <span className="font-mono text-[10px] text-white/40">
                Council Knowledge Archives • Verified Clearance
              </span>
            </div>
          </div>
        ) : (
          /* =================================================================
             ARTICLE CATALOG / DISCOVERY VIEW
             ================================================================= */
          <div className="space-y-6 sm:space-y-8">
            {/* Portal Headline */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/15">
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/60 block">
                  Classified Council Repository
                </span>
                <h1 className="font-chancery text-2xl sm:text-3xl font-bold tracking-wide text-white">
                  Knowledge & Operational Directives
                </h1>
                <p className="font-editorial italic text-xs sm:text-sm text-white/70 max-w-2xl">
                  Consult the official codex, operational doctrine, and intelligence lore maintained by the high council scribes.
                </p>
              </div>

              <div className="font-mono text-xs text-white/50 shrink-0">
                {filteredArticles.length} {filteredArticles.length === 1 ? 'Article' : 'Articles'} Available
              </div>
            </div>

            {/* Search and Category Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repository by title, keywords, or topics..."
                  className="w-full font-body pl-9 pr-4 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
                />
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              {categories.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-2 rounded-lg font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-colors border ${
                      selectedCategory === 'all'
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/20 text-white/60 hover:text-white'
                    }`}
                  >
                    All Categories
                  </button>

                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-2 rounded-lg font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-colors border ${
                        selectedCategory === cat
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/20 text-white/60 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Articles Grid */}
            {filteredArticles.length === 0 ? (
              <div className="bg-black border border-white/20 rounded-2xl p-10 sm:p-14 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-white/40 mx-auto" />
                <h3 className="font-chancery text-lg font-semibold tracking-wide text-white">
                  No Knowledge Articles Found
                </h3>
                <p className="font-editorial italic text-xs sm:text-sm text-white/60 max-w-sm mx-auto">
                  {searchQuery
                    ? 'No articles match your search criteria. Try modifying your keywords.'
                    : 'The council archives have not published articles in this category yet.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="font-mono text-xs text-white underline underline-offset-4"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredArticles.map((article) => {
                  const readTime = getReadingTime(article.content);
                  return (
                    <div
                      key={article.id}
                      onClick={() => {
                        setSelectedArticleId(article.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="group bg-black border border-white/20 hover:border-white/50 rounded-2xl overflow-hidden flex flex-col justify-between cursor-pointer transition-all hover:translate-y-[-2px] shadow-lg"
                    >
                      {/* Cover Image if available */}
                      {article.coverImage ? (
                        <div className="w-full h-44 relative overflow-hidden bg-white/5 border-b border-white/10">
                          <img
                            src={article.coverImage}
                            alt={article.title}
                            className="w-full h-full object-cover grayscale contrast-125 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                          />
                          <div className="absolute top-2.5 right-2.5">
                            <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/30 bg-black/80 text-white backdrop-blur-sm">
                              {readTime} min read
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 pb-0 flex items-center justify-between">
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/70 bg-white/5">
                            {article.category || 'Doctrine'}
                          </span>
                          <span className="font-mono text-[9px] text-white/50">
                            {readTime} min read
                          </span>
                        </div>
                      )}

                      {/* Card Content */}
                      <div className="p-5 space-y-2.5 flex-1">
                        {article.coverImage && (
                          <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/70 bg-white/5 inline-block">
                            {article.category || 'Doctrine'}
                          </span>
                        )}

                        <h3 className="font-chancery text-lg sm:text-xl font-bold tracking-wide text-white group-hover:text-neutral-200 transition-colors line-clamp-2">
                          {article.title}
                        </h3>

                        {article.summary && (
                          <p className="font-editorial italic text-xs text-white/70 line-clamp-3 leading-relaxed">
                            {article.summary}
                          </p>
                        )}
                      </div>

                      {/* Card Footer */}
                      <div className="p-5 pt-3 border-t border-white/10 flex items-center justify-between font-mono text-[10px] text-white/50 bg-white/[0.01]">
                        <span>Scribe: {article.authorAlias || 'Council'}</span>
                        <span className="text-white group-hover:underline inline-flex items-center gap-1 font-semibold uppercase tracking-wider">
                          Read Document
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/15 py-6 px-4 text-center font-mono text-[10px] text-white/40 space-y-1">
        <div>
          {settings.heading || 'secretsociety_ind'} • Internal Knowledge Repository (/#/knowledge)
        </div>
        <div>
          All documents and imagery subject to compartmentalized council oversight.
        </div>
      </footer>
    </div>
  );
};
