import React, { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Play,
  Check,
  AlertTriangle,
  Search,
  RefreshCw,
  X,
  Youtube,
  Layers,
  Clock,
  Eye
} from 'lucide-react';
import { CouncilVideo } from '../types';
import {
  getCouncilVideos,
  saveCouncilVideo,
  deleteCouncilVideo,
  subscribeToCouncilVideos,
  extractYouTubeVideoId,
  getYouTubeThumbnail
} from '../lib/firebase';

interface AdminVideosManagerProps {
  onRefreshData?: () => void;
}

export const AdminVideosManager: React.FC<AdminVideosManagerProps> = ({ onRefreshData }) => {
  const [videos, setVideos] = useState<CouncilVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Briefings');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Preview & Delete State
  const [previewVideo, setPreviewVideo] = useState<CouncilVideo | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<CouncilVideo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Derived YouTube preview ID
  const previewId = extractYouTubeVideoId(youtubeUrl);

  // Load and subscribe to videos
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getCouncilVideos()
      .then((data) => {
        if (isMounted) {
          setVideos(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Initial videos load warning:', err);
        if (isMounted) setIsLoading(false);
      });

    const unsubscribe = subscribeToCouncilVideos((data) => {
      if (isMounted) {
        setVideos(data);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Handle open create form
  const handleOpenCreate = () => {
    setEditingVideoId(null);
    setTitle('');
    setYoutubeUrl('');
    setDescription('');
    setCategory('Briefings');
    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  // Handle open edit form
  const handleOpenEdit = (video: CouncilVideo) => {
    setEditingVideoId(video.id);
    setTitle(video.title);
    setYoutubeUrl(video.youtubeUrl);
    setDescription(video.description);
    setCategory(video.category || 'Briefings');
    setFormError(null);
    setFormSuccess(null);
    setIsFormOpen(true);
  };

  // Handle save / submit
  const handleSaveVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!youtubeUrl.trim()) {
      setFormError('Please enter a valid YouTube video URL or ID.');
      return;
    }

    const videoId = extractYouTubeVideoId(youtubeUrl.trim());
    if (!videoId) {
      setFormError('Could not recognize YouTube video ID from the provided link. Please ensure it is a valid YouTube URL (e.g., https://www.youtube.com/watch?v=... or https://youtu.be/...).');
      return;
    }

    if (!title.trim()) {
      setFormError('Please provide a title for the video.');
      return;
    }

    if (!description.trim()) {
      setFormError('Please provide a small description text for the video.');
      return;
    }

    setIsSaving(true);
    try {
      await saveCouncilVideo({
        id: editingVideoId || undefined,
        title: title.trim(),
        youtubeUrl: youtubeUrl.trim(),
        description: description.trim(),
        category: category.trim() || 'General',
        isPublished: true,
        uploadedByAlias: 'ADMIN_COUNCIL'
      });

      setFormSuccess(editingVideoId ? 'Video updated successfully.' : 'YouTube video uploaded to collection.');
      setTimeout(() => {
        setIsFormOpen(false);
        setFormSuccess(null);
        setEditingVideoId(null);
      }, 1000);

      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error saving council video:', err);
      setFormError(err.message || 'Failed to save video. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete video
  const handleConfirmDelete = async () => {
    if (!deletingVideo) return;
    setIsDeleting(true);
    try {
      await deleteCouncilVideo(deletingVideo.id);
      setDeletingVideo(null);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Failed to delete video:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered categories
  const allCategories = ['all', ...Array.from(new Set(videos.map((v) => v.category || 'General')))];

  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.category && v.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = activeCategory === 'all' || v.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-black border border-white/20 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white font-medium flex items-center gap-1.5">
              <Youtube className="w-3 h-3 text-red-500" />
              /#/videos Archive
            </span>
            <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-white">
              Member Video Collection Manager
            </h2>
          </div>
          <p className="font-editorial italic text-xs text-white/70 max-w-2xl">
            Upload YouTube video links with a small description text. Active members log into the dedicated{' '}
            <code className="bg-white/10 px-1 py-0.5 rounded font-mono text-[11px] text-white">/#/videos</code> portal using their
            alias & password to review this video collection.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 active:scale-95 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md"
          >
            <Plus className="w-4 h-4 text-black" />
            Upload Video Link
          </button>
        </div>
      </div>

      {/* Modal / Inline Upload & Edit Form */}
      {isFormOpen && (
        <div className="bg-neutral-950 border-2 border-white/30 rounded-xl p-5 sm:p-7 shadow-2xl relative animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/10 border border-white/20 text-white">
                <Video className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                  {editingVideoId ? 'Edit YouTube Video' : 'Upload YouTube Video Link'}
                </h3>
                <p className="font-mono text-[11px] text-white/60">
                  Target destination: Member Video Collection at <span className="text-white">/#/videos</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setEditingVideoId(null);
              }}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveVideo} className="space-y-5">
            {formError && (
              <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-mono flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-3.5 rounded-lg bg-white/10 border border-white/30 text-white text-xs font-mono flex items-center gap-2.5">
                <Check className="w-4 h-4 text-white shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Controls (Left Column) */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70 mb-1.5">
                    YouTube Video Link or ID *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg font-mono text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors"
                      required
                    />
                    <div className="absolute right-3 top-2.5 text-white/40 pointer-events-none">
                      <Youtube className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-white/50 mt-1">
                    Accepts standard watch links, youtu.be short links, embed links, shorts, or raw 11-character video IDs.
                  </p>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70 mb-1.5">
                    Video Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Council Briefing: Cosmic Observation Nodes"
                    className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg font-mono text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70 mb-1.5">
                      Category
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Briefings, Directives, Recon, Lore"
                      list="category-suggestions"
                      className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg font-mono text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors"
                    />
                    <datalist id="category-suggestions">
                      <option value="Briefings" />
                      <option value="Directives" />
                      <option value="Field Recon" />
                      <option value="Protocols" />
                      <option value="Archives" />
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70 mb-1.5">
                    Small Description Text *
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the YouTube video content for members to read..."
                    className="w-full px-3.5 py-2.5 bg-black border border-white/20 rounded-lg font-mono text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white transition-colors resize-y"
                    required
                  />
                  <div className="flex justify-between items-center text-[10px] font-mono text-white/40 mt-1">
                    <span>A concise description appearing below the thumbnail in the collection grid.</span>
                    <span>{description.length} characters</span>
                  </div>
                </div>
              </div>

              {/* Live Preview (Right Column) */}
              <div className="lg:col-span-5 bg-black/60 border border-white/15 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                      <Eye className="w-3 h-3 text-white/60" />
                      Live Collection Card Preview
                    </span>
                    {previewId ? (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white">
                        ID: {previewId}
                      </span>
                    ) : (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">
                        No URL parsed
                      </span>
                    )}
                  </div>

                  {/* Thumbnail / Video Box Preview */}
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/20 bg-neutral-900 flex items-center justify-center">
                    {previewId ? (
                      <img
                        src={getYouTubeThumbnail(previewId, 'hq')}
                        alt="YouTube Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${previewId}/0.jpg`;
                        }}
                      />
                    ) : (
                      <div className="text-center p-4 space-y-1">
                        <Youtube className="w-8 h-8 text-white/20 mx-auto" />
                        <p className="font-mono text-[11px] text-white/40">Enter a YouTube link to preview thumbnail</p>
                      </div>
                    )}

                    {previewId && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 ml-0.5 fill-black text-black" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card text preview */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-white/70">
                        {category || 'General'}
                      </span>
                    </div>
                    <div className="font-display text-xs font-bold text-white line-clamp-1">
                      {title || 'Video Title Preview'}
                    </div>
                    <p className="font-mono text-[11px] text-white/70 line-clamp-2">
                      {description || 'Small description text will appear here...'}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 mt-3 text-[10px] font-mono text-white/40 flex items-center justify-between">
                  <span>Display on /#/videos</span>
                  <span>Ready for member access</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/15">
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingVideoId(null);
                }}
                className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 active:scale-95 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-black" />
                    <span>{editingVideoId ? 'Save Changes' : 'Upload Video to Collection'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-black border border-white/20 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-white text-black border-white font-bold'
                  : 'bg-black text-white/70 border-white/20 hover:border-white/40 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All Videos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Videos List / Grid */}
      {isLoading ? (
        <div className="p-12 text-center bg-black border border-white/20 rounded-xl">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-mono text-xs text-white/70 uppercase tracking-wider">
            Loading Council Video Archive...
          </p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-12 text-center bg-black border border-white/20 rounded-xl space-y-3">
          <Video className="w-10 h-10 text-white/30 mx-auto" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
            {searchQuery ? 'No Matching Videos Found' : 'No Videos in Collection Yet'}
          </h3>
          <p className="font-editorial italic text-xs text-white/60 max-w-md mx-auto">
            {searchQuery
              ? 'Try refining your search terms or clearing the category filter.'
              : 'Click "Upload Video Link" above to add your first YouTube video link with a small description text for members.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-black" />
              Upload First Video Link
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-black border border-white/20 rounded-xl overflow-hidden flex flex-col justify-between hover:border-white/40 transition-colors group"
            >
              {/* Card Header Thumbnail */}
              <div className="relative aspect-video bg-neutral-900 overflow-hidden">
                <img
                  src={getYouTubeThumbnail(video.youtubeVideoId, 'hq')}
                  alt={video.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtubeVideoId}/0.jpg`;
                  }}
                />

                {/* Play Button Overlay */}
                <button
                  type="button"
                  onClick={() => setPreviewVideo(video)}
                  className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-colors group/play"
                  title="Watch Video"
                >
                  <div className="w-12 h-12 rounded-full bg-white/90 group-hover/play:bg-white text-black flex items-center justify-center shadow-2xl transform group-hover/play:scale-110 transition-transform">
                    <Play className="w-5 h-5 ml-0.5 fill-black text-black" />
                  </div>
                </button>

                {/* Category Pill on top left */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/30 bg-black/80 backdrop-blur-md text-white font-medium">
                    {video.category || 'General'}
                  </span>
                </div>
              </div>

              {/* Video Info Content */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <h4 className="font-display text-sm font-bold text-white uppercase tracking-wide leading-snug">
                    {video.title}
                  </h4>
                  <p className="font-mono text-xs text-white/70 line-clamp-3 leading-relaxed">
                    {video.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white/40" />
                      <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                    </div>
                    <a
                      href={video.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors flex items-center gap-1"
                    >
                      <span>YouTube</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewVideo(video)}
                      className="px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white font-mono text-[11px] uppercase tracking-wider transition-colors flex items-center gap-1.5 flex-1 justify-center"
                    >
                      <Play className="w-3 h-3 text-white" />
                      Play
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(video)}
                      className="p-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                      title="Edit Video"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingVideo(video)}
                      className="p-1.5 rounded-lg border border-red-500/30 hover:bg-red-950/50 text-red-400 hover:text-red-300 transition-colors"
                      title="Delete Video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl bg-neutral-950 border border-white/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/20 flex items-center justify-between gap-3 bg-black">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white">
                  {previewVideo.category || 'General'}
                </span>
                <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-white line-clamp-1">
                  {previewVideo.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Embedded Responsive YouTube Player */}
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${previewVideo.youtubeVideoId}?autoplay=1&rel=0`}
                title={previewVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            {/* Description and Info */}
            <div className="p-5 sm:p-6 space-y-3 bg-black">
              <div className="space-y-1">
                <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  {previewVideo.title}
                </h4>
                <p className="font-mono text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
                  {previewVideo.description}
                </p>
              </div>

              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-[11px] font-mono text-white/50">
                <span>Direct link: <a href={previewVideo.youtubeUrl} target="_blank" rel="noreferrer" className="text-white underline">{previewVideo.youtubeUrl}</a></span>
                <button
                  type="button"
                  onClick={() => setPreviewVideo(null)}
                  className="px-4 py-1.5 rounded-lg bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingVideo && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-950 border border-red-500/40 rounded-xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display text-base font-bold uppercase tracking-wider text-white">
                  Delete YouTube Video?
                </h4>
                <p className="font-mono text-xs text-white/60">
                  This will permanently remove this video from the member collection.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-1">
              <div className="font-display text-xs font-bold text-white uppercase">
                {deletingVideo.title}
              </div>
              <p className="font-mono text-[11px] text-white/60 line-clamp-2">
                {deletingVideo.description}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingVideo(null)}
                className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
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
