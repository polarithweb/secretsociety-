import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Search,
  X,
  ExternalLink,
  User,
  LogOut,
  Lock,
  Clock,
  Share2,
  Check,
  Youtube,
  RefreshCw,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { CouncilVideo, MemberAccount, SocietySettings } from '../types';
import {
  getCouncilVideos,
  subscribeToCouncilVideos,
  authenticateMember,
  getYouTubeThumbnail,
  deleteCouncilVideo
} from '../lib/firebase';

interface CouncilVideosPortalProps {
  settings: SocietySettings;
  onNavigateToCandidate?: () => void;
  onNavigateToInfo?: () => void;
  onNavigateToKnowledge?: () => void;
}

const SESSION_KEY = 'secretsociety_member_session';

export const CouncilVideosPortal: React.FC<CouncilVideosPortalProps> = ({
  settings,
  onNavigateToCandidate,
  onNavigateToInfo,
  onNavigateToKnowledge
}) => {
  // Authentication State
  const [activeMember, setActiveMember] = useState<MemberAccount | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [aliasInput, setAliasInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Videos & UI State
  const [videos, setVideos] = useState<CouncilVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<CouncilVideo | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState<CouncilVideo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Permanently delete video from portal
  const handleConfirmDelete = async () => {
    if (!deletingVideo) return;
    setIsDeleting(true);
    try {
      await deleteCouncilVideo(deletingVideo.id);
      setVideos((prev) => prev.filter((v) => v.id !== deletingVideo.id));
      if (selectedVideo?.id === deletingVideo.id) {
        setSelectedVideo(null);
      }
      setDeletingVideo(null);
    } catch (err) {
      console.error('Failed to delete video:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Load and subscribe to council videos
  useEffect(() => {
    let isMounted = true;
    setIsLoadingVideos(true);

    getCouncilVideos()
      .then((data) => {
        if (isMounted) {
          setVideos(data);
          setIsLoadingVideos(false);
        }
      })
      .catch((err) => {
        console.warn('Council videos initial fetch warning:', err);
        if (isMounted) setIsLoadingVideos(false);
      });

    const unsubscribe = subscribeToCouncilVideos((data) => {
      if (isMounted) {
        setVideos(data);
        setIsLoadingVideos(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Listen for Escape key to close player modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedVideo) {
        setSelectedVideo(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVideo]);

  // Handle Login
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
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(member));
          localStorage.setItem(SESSION_KEY, JSON.stringify(member));
        } catch (e) {
          // ignore
        }
        setAliasInput('');
        setPasswordInput('');
      } else {
        setAuthError('Invalid credentials or member account deactivated. Please verify with Council Administrator.');
      }
    } catch (err: any) {
      console.error('Member authentication error:', err);
      setAuthError('Authentication failed. Please verify your alias and password.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setActiveMember(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      // ignore
    }
  };

  // Copy video link
  const handleCopyLink = (url: string) => {
    try {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  // Derived categories
  const categories = ['all', ...Array.from(new Set(videos.map((v) => v.category || 'General')))];

  // Filtered video list
  const filteredVideos = videos.filter((v) => {
    const matchesCategory = selectedCategory === 'all' || (v.category || 'General') === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.category && v.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // =========================================================================
  // VIEW 1: MEMBER LOGIN GATE (When not authenticated)
  // =========================================================================
  if (!activeMember) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 sm:py-20 animate-in fade-in duration-300">
        <div className="bg-black border border-white/20 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center mx-auto mb-3">
              <Youtube className="w-6 h-6 text-red-500" />
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
              Restricted Video Archive (/#/videos)
            </div>
            <h1 className="font-chancery text-2xl sm:text-3xl font-bold tracking-wide text-white">
              Member Video Access
            </h1>
            <p className="font-editorial italic text-xs text-white/70">
              Enter your assigned member alias and password to access the Council video collection and briefings.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-mono">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-white/70 mb-1.5">
                Member Alias
              </label>
              <input
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="e.g. ARCHON_01"
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/20 rounded-xl font-mono text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>

            <div>
              <label className="block font-mono text-xs uppercase tracking-wider text-white/70 mb-1.5">
                Member Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-neutral-900 border border-white/20 rounded-xl font-mono text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-[0.99] font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-black" />
                  <span>Authenticate & Enter Video Collection</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED MEMBER VIDEO COLLECTION DASHBOARD
  // =========================================================================
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="bg-black border border-white/20 rounded-2xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white font-medium flex items-center gap-1.5">
              <Youtube className="w-3 h-3 text-red-500" />
              Video Archive
            </span>
            <h1 className="font-chancery text-xl sm:text-2xl font-bold tracking-wide text-white">
              {settings.memberPortalHeading || settings.heading || 'secretsociety_ind'} Video Collection
            </h1>
          </div>
          <p className="font-editorial italic text-xs text-white/70 max-w-xl">
            Official Council YouTube video dispatches, visual intelligence briefings, and operative recordings.
          </p>
        </div>

        {/* Member Profile and Navigation Shortcuts */}
        <div className="flex flex-wrap items-center gap-3">
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

          <div className="h-6 w-px bg-white/20 hidden sm:block" />

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Log Out of Video Collection"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-black border border-white/20 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search videos by title, description or category..."
            className="w-full pl-9 pr-3.5 py-2 bg-neutral-900 border border-white/20 rounded-lg font-mono text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white transition-colors"
          />
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-white text-black border-white font-bold'
                  : 'bg-black text-white/70 border-white/20 hover:border-white/40 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All Videos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Video Collection Count & Indicator */}
      <div className="flex items-center justify-between text-xs font-mono text-white/50 px-1">
        <span>Showing {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}</span>
        <span>Secure Stream Active</span>
      </div>

      {/* Video Collection Grid */}
      {isLoadingVideos ? (
        <div className="p-16 text-center bg-black border border-white/20 rounded-2xl">
          <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-mono text-xs text-white/70 uppercase tracking-widest">
            Synchronizing Video Collection...
          </p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-16 text-center bg-black border border-white/20 rounded-2xl space-y-3">
          <Video className="w-10 h-10 text-white/30 mx-auto" />
          <h3 className="font-chancery text-lg sm:text-xl font-bold tracking-wide text-white">
            {searchQuery ? 'No Matching Videos' : 'Video Collection Empty'}
          </h3>
          <p className="font-editorial italic text-xs text-white/60 max-w-md mx-auto">
            {searchQuery
              ? 'No videos matched your query. Try different keywords or clear the category filter.'
              : 'The Council has not yet uploaded YouTube video links to the archive. Please check back later.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-black border border-white/20 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-white/50 transition-all duration-200 group shadow-lg"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video bg-neutral-900 overflow-hidden cursor-pointer" onClick={() => setSelectedVideo(video)}>
                <img
                  src={getYouTubeThumbnail(video.youtubeVideoId, 'hq')}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtubeVideoId}/0.jpg`;
                  }}
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 group-hover:bg-white text-black flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-black text-black" />
                  </div>
                </div>

                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                  <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/30 bg-black/80 backdrop-blur-md text-white font-medium">
                    {video.category || 'Briefing'}
                  </span>
                </div>
              </div>

              {/* Video Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <h3
                    onClick={() => setSelectedVideo(video)}
                    className="font-chancery text-base sm:text-lg font-bold text-white tracking-wide leading-snug cursor-pointer hover:text-white/80 transition-colors line-clamp-2"
                  >
                    {video.title}
                  </h3>
                  <p className="font-mono text-xs text-white/75 line-clamp-3 leading-relaxed">
                    {video.description}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/50">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white/40" />
                      <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>
                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors inline-flex items-center gap-1 text-[10px]"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(video)}
                      className="flex-1 py-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 active:scale-95 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <Play className="w-3.5 h-3.5 fill-black text-black" />
                      <span>Watch Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingVideo(video)}
                      className="p-2.5 rounded-xl border border-white/20 hover:border-red-500/50 hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors"
                      title="Delete video permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Theater Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-black border border-white/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto">
            {/* Modal Top Bar */}
            <div className="p-4 sm:p-5 border-b border-white/20 flex items-center justify-between gap-3 bg-neutral-950">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white shrink-0">
                  {selectedVideo.category || 'Briefing'}
                </span>
                <h2 className="font-chancery text-base sm:text-lg font-bold tracking-wide text-white truncate">
                  {selectedVideo.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Responsive Embedded 16:9 YouTube Player */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.youtubeVideoId}?autoplay=1&rel=0&modestbranding=1`}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Video Meta and Description */}
            <div className="p-5 sm:p-7 space-y-4 bg-black">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-chancery text-xl sm:text-2xl font-bold tracking-wide text-white">
                    {selectedVideo.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-mono text-white/50 mt-1">
                    <span>Uploaded: {new Date(selectedVideo.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Category: {selectedVideo.category || 'General'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeletingVideo(selectedVideo)}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 text-red-400 font-mono text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                    title="Delete this video permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyLink(selectedVideo.youtubeUrl)}
                    className="px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-white" />
                        <span>Share Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={selectedVideo.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Open YouTube</span>
                    <ExternalLink className="w-3 h-3 text-black" />
                  </a>
                </div>
              </div>

              {/* Written Description */}
              <div className="space-y-1.5">
                <div className="font-mono text-[11px] uppercase tracking-wider text-white/50">
                  Video Briefing Description
                </div>
                <div className="font-mono text-xs sm:text-sm text-white/90 whitespace-pre-wrap leading-relaxed bg-white/5 border border-white/15 rounded-xl p-4 sm:p-5">
                  {selectedVideo.description}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedVideo(null)}
                  className="px-6 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  Close Theater View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVideo && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-neutral-950 border border-white/25 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-chancery text-lg font-bold text-white">Delete Video</h3>
                <p className="font-mono text-[11px] text-white/60">Permanent Purge Confirmation</p>
              </div>
            </div>

            <p className="font-mono text-xs text-white/80 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">"{deletingVideo.title}"</strong>? This will remove the video immediately from the collection and cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingVideo(null)}
                className="px-4 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
