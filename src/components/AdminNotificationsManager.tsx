import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell,
  Send,
  Users,
  UserCheck,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  Search,
  X,
  ShieldAlert,
  FileText,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ImageIcon,
  UploadCloud,
  Link2,
  Maximize2,
  Eye
} from 'lucide-react';
import { MemberAccount, MemberNotification } from '../types';
import {
  sendMemberNotification,
  getMemberNotifications,
  subscribeToMemberNotifications,
  deleteMemberNotification
} from '../lib/firebase';

interface AdminNotificationsManagerProps {
  members: MemberAccount[];
  preselectedMemberAlias?: string | null;
  onClearPreselectedMember?: () => void;
}

export const AdminNotificationsManager: React.FC<AdminNotificationsManagerProps> = ({
  members,
  preselectedMemberAlias,
  onClearPreselectedMember
}) => {
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Compose Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [noticeType, setNoticeType] = useState<'text' | 'image'>('text');
  const [imageUrl, setImageUrl] = useState('');
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeKb: number; name: string } | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageInputMethod, setImageInputMethod] = useState<'upload' | 'url'>('upload');
  const [isDragOver, setIsDragOver] = useState(false);
  const [lightboxNotice, setLightboxNotice] = useState<MemberNotification | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [urgency, setUrgency] = useState<'standard' | 'urgent'>('standard');
  const [targetType, setTargetType] = useState<'all' | 'specific'>(
    preselectedMemberAlias ? 'specific' : 'all'
  );
  const [selectedAliases, setSelectedAliases] = useState<string[]>(
    preselectedMemberAlias ? [preselectedMemberAlias] : []
  );
  const [memberSearch, setMemberSearch] = useState('');

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

  // Deletion modal state
  const [noticeToDelete, setNoticeToDelete] = useState<MemberNotification | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Set preselected member when prop changes
  useEffect(() => {
    if (preselectedMemberAlias) {
      setTargetType('specific');
      setSelectedAliases((prev) =>
        prev.includes(preselectedMemberAlias) ? prev : [...prev, preselectedMemberAlias]
      );
    }
  }, [preselectedMemberAlias]);

  // Load and subscribe to notifications
  useEffect(() => {
    setIsLoading(true);
    getMemberNotifications()
      .then((data) => {
        setNotifications(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Error fetching notifications:', err);
        setIsLoading(false);
      });

    const unsubscribe = subscribeToMemberNotifications((data) => {
      setNotifications(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter members list based on search term
  const filteredMembers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return members;
    return members.filter(
      (m) =>
        m.alias.toLowerCase().includes(query) ||
        (m.name && m.name.toLowerCase().includes(query)) ||
        (m.role && m.role.toLowerCase().includes(query))
    );
  }, [members, memberSearch]);

  // Toggle single member selection
  const handleToggleMember = (alias: string) => {
    setSelectedAliases((prev) =>
      prev.includes(alias) ? prev.filter((a) => a !== alias) : [...prev, alias]
    );
  };

  // Select all filtered members
  const handleSelectAllFiltered = () => {
    const newAliases = new Set([...selectedAliases, ...filteredMembers.map((m) => m.alias)]);
    setSelectedAliases(Array.from(newAliases));
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedAliases([]);
  };

  // Process and center-crop image to high-quality 1:1 square canvas & compress (< 150KB)
  const processOneToOneImage = (
    file: File
  ): Promise<{ dataUrl: string; width: number; height: number; sizeKb: number; name: string }> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file (PNG, JPG, WebP, GIF, or SVG).'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const rawResult = event.target?.result;
        if (typeof rawResult !== 'string') {
          reject(new Error('Failed to read image data from selected file.'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            // Optimal 800x800 for high resolution yet fast and lightweight (<100KB) Firestore storage
            const TARGET_SIZE = 800;

            // Compute square center-crop coordinates
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;

            canvas.width = TARGET_SIZE;
            canvas.height = TARGET_SIZE;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context not available for 1:1 image optimization.'));
              return;
            }

            // High-quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Neutral dark background in case of transparent PNG/SVG
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

            // Draw center-cropped square
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, TARGET_SIZE, TARGET_SIZE);

            // Compress to JPEG at 0.85 quality (~40KB - 85KB, safe for Firestore 1MB limit)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            const sizeInBytes = Math.round((compressedDataUrl.length * 3) / 4);
            const sizeKb = Math.round(sizeInBytes / 1024);

            resolve({
              dataUrl: compressedDataUrl,
              width: TARGET_SIZE,
              height: TARGET_SIZE,
              sizeKb,
              name: file.name
            });
          } catch (err: any) {
            reject(new Error(err?.message || 'Error processing image to 1:1 square.'));
          }
        };

        img.onerror = () => {
          reject(new Error('Selected image file is corrupted or could not be decoded.'));
        };

        img.src = rawResult;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read image file from disk.'));
      };

      reader.readAsDataURL(file);
    });
  };

  // Handle image file selection
  const handleImageFile = async (file: File) => {
    setErrorMessage(null);
    setIsProcessingImage(true);
    try {
      const result = await processOneToOneImage(file);
      setImageUrl(result.dataUrl);
      setImageMeta({
        width: result.width,
        height: result.height,
        sizeKb: result.sizeKb,
        name: result.name
      });
    } catch (err: any) {
      console.error('Error processing 1:1 image:', err);
      setErrorMessage(err.message || 'Failed to process image.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (noticeType !== 'image') return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleImageFile(file);
          break;
        }
      }
    }
  };

  // Handle form submission
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSendSuccess(null);

    if (!title.trim()) {
      setErrorMessage('Please provide a title or subject for the notification.');
      return;
    }

    if (noticeType === 'text' && !message.trim()) {
      setErrorMessage('Please provide the written text content for the notification.');
      return;
    }

    if (noticeType === 'image' && !imageUrl.trim()) {
      setErrorMessage('Please upload a 1:1 image or provide a valid image URL for the notice.');
      return;
    }

    if (targetType === 'specific' && selectedAliases.length === 0) {
      setErrorMessage('Please select at least one member to receive this notification.');
      return;
    }

    setIsSending(true);

    try {
      await sendMemberNotification({
        title: title.trim(),
        message: message.trim(),
        noticeType,
        imageUrl: noticeType === 'image' ? imageUrl.trim() : undefined,
        imageAspectRatio: '1:1',
        targetType,
        targetMemberAliases: targetType === 'all' ? [] : selectedAliases,
        urgency,
        senderName: 'Council Administration'
      });

      setSendSuccess(
        `${noticeType === 'image' ? '1:1 Image Notice' : 'Written Notice'} dispatched successfully to ${
          targetType === 'all'
            ? 'all council members'
            : `${selectedAliases.length} selected member${selectedAliases.length > 1 ? 's' : ''}`
        }.`
      );

      // Reset form
      setTitle('');
      setMessage('');
      setImageUrl('');
      setImageMeta(null);
      setNoticeType('text');
      setUrgency('standard');
      setTargetType('all');
      setSelectedAliases([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onClearPreselectedMember) {
        onClearPreselectedMember();
      }

      setTimeout(() => setSendSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error dispatching notification:', err);
      setErrorMessage(err.message || 'Failed to dispatch notification to members.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle permanent notice deletion
  const handleConfirmDelete = async () => {
    if (!noticeToDelete) return;
    setIsDeleting(true);

    try {
      await deleteMemberNotification(noticeToDelete.id);
      setNotifications((prev) => prev.filter((n) => n.id !== noticeToDelete.id));
      setNoticeToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
      setErrorMessage('Failed to delete notification from repository.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white/70">
              Council Dispatch Terminal
            </span>
            <span className="font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/50">
              Auto-Acknowledged on Login
            </span>
          </div>
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-wider uppercase text-white">
            Written Notices & Directives
          </h2>
          <p className="font-editorial italic text-xs sm:text-sm text-white/70 max-w-3xl">
            Dispatch written notices to all members or specific operatives. When a member logs in to fill task forms, the notification will appear on their screen first. Once they click "OK" under the notification box, it will be gone and will not show again to that member.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-white/80 flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-white" />
            <span>{notifications.length} Total Notices</span>
          </span>
        </div>
      </div>

      {/* Action Messages */}
      {sendSuccess && (
        <div className="p-4 rounded-xl border border-white/40 bg-white/10 text-white font-mono text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span>{sendSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setSendSuccess(null)}
            className="text-white/60 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-950/40 text-red-200 font-mono text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Left = Compose Notice, Right = Sent Notices Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COMPOSE NOTICE CARD */}
        <div className="lg:col-span-6 bg-black/60 border border-white/20 rounded-2xl p-5 sm:p-6 space-y-6 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/10 border border-white/20 text-white">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                  Compose Notice Directive
                </h3>
                <p className="font-editorial italic text-xs text-white/60">
                  Dispatch written directive or 1:1 square image notice to operatives
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setUrgency('standard')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  urgency === 'standard'
                    ? 'bg-white text-black font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition-colors flex items-center gap-1 ${
                  urgency === 'urgent'
                    ? 'bg-red-500 text-white font-bold'
                    : 'text-white/60 hover:text-red-300'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Urgent
              </button>
            </div>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-5">
            {/* Notice Format Selector (Text vs 1:1 Image) */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] uppercase tracking-wider text-white/80">
                Notice Format / Type <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setNoticeType('text')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    noticeType === 'text'
                      ? 'border-white bg-white/15 text-white shadow-md'
                      : 'border-white/15 bg-black/40 text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 mt-0.5 shrink-0 text-white" />
                  <div>
                    <div className="font-display text-xs uppercase tracking-wider font-bold">
                      Written Notice
                    </div>
                    <div className="font-editorial italic text-[11px] text-white/60">
                      Standard multi-line directive
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setNoticeType('image')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    noticeType === 'image'
                      ? 'border-white bg-white/15 text-white shadow-md'
                      : 'border-white/15 bg-black/40 text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 mt-0.5 shrink-0 text-white" />
                  <div>
                    <div className="font-display text-xs uppercase tracking-wider font-bold">
                      1:1 Image Notice
                    </div>
                    <div className="font-editorial italic text-[11px] text-white/60">
                      Square bulletin (1:1 ratio)
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[11px] uppercase tracking-wider text-white/80">
                Notice Title / Subject <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={noticeType === 'image' ? 'e.g. Visual Directive: Security Clearance Chart' : 'e.g. Operational Directive: Submit Quarterly Asset Log'}
                className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-mono"
                required
              />
            </div>

            {/* Target Selection */}
            <div className="space-y-2.5">
              <label className="block font-mono text-[11px] uppercase tracking-wider text-white/80">
                Recipient Audience <span className="text-red-400">*</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType('all')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    targetType === 'all'
                      ? 'border-white bg-white/10 text-white'
                      : 'border-white/15 bg-black/40 text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 mt-0.5 shrink-0 text-white" />
                  <div>
                    <div className="font-display text-xs uppercase tracking-wider font-bold">
                      All Members
                    </div>
                    <div className="font-editorial italic text-[11px] text-white/60">
                      Dispatches to every registered council operative ({members.length} members)
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetType('specific')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                    targetType === 'specific'
                      ? 'border-white bg-white/10 text-white'
                      : 'border-white/15 bg-black/40 text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <UserCheck className="w-4 h-4 mt-0.5 shrink-0 text-white" />
                  <div>
                    <div className="font-display text-xs uppercase tracking-wider font-bold">
                      Specific Members
                    </div>
                    <div className="font-editorial italic text-[11px] text-white/60">
                      Select designated individual operatives ({selectedAliases.length} selected)
                    </div>
                  </div>
                </button>
              </div>

              {/* Specific Member Selector Box */}
              {targetType === 'specific' && (
                <div className="p-3.5 rounded-xl border border-white/20 bg-black/90 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search member by alias or name..."
                        className="w-full bg-white/5 border border-white/15 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] uppercase tracking-wider transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-mono text-[10px] uppercase tracking-wider transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Members Checkbox List */}
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                    {filteredMembers.length === 0 ? (
                      <div className="text-center py-4 text-white/40 font-editorial italic text-xs">
                        No members found matching filter
                      </div>
                    ) : (
                      filteredMembers.map((member) => {
                        const isSelected = selectedAliases.includes(member.alias);
                        return (
                          <div
                            key={member.id || member.alias}
                            onClick={() => handleToggleMember(member.alias)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${
                              isSelected
                                ? 'bg-white/15 border-white/40 text-white'
                                : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-white shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-white/40 shrink-0" />
                              )}
                              <div>
                                <span className="font-semibold text-white tracking-wide">
                                  {member.alias}
                                </span>
                                {member.name && (
                                  <span className="ml-2 text-white/50 text-[11px]">
                                    ({member.name})
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-white/40 uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5">
                              {member.role || 'Member'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Selected count indicator */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/60">
                    <span>
                      {selectedAliases.length} of {members.length} members selected
                    </span>
                    {selectedAliases.length > 0 && (
                      <span className="text-white/80 font-bold truncate max-w-[200px]">
                        {selectedAliases.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 1:1 Image Section (When Image Notice is selected) */}
            {noticeType === 'image' && (
              <div
                onPaste={handlePaste}
                className="space-y-4 p-4 rounded-xl border border-white/20 bg-black/80"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-white">
                    <ImageIcon className="w-4 h-4 text-white" />
                    <span>1:1 Square Image Source</span>
                    <span className="text-red-400">*</span>
                  </div>

                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setImageInputMethod('upload')}
                      className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                        imageInputMethod === 'upload'
                          ? 'bg-white text-black font-bold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <UploadCloud className="w-3 h-3" />
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMethod('url')}
                      className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                        imageInputMethod === 'url'
                          ? 'bg-white text-black font-bold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Link2 className="w-3 h-3" />
                      Image URL
                    </button>
                  </div>
                </div>

                {imageInputMethod === 'upload' ? (
                  <div>
                    {/* Native Hidden File Input */}
                    <input
                      id="admin-notice-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="sr-only"
                    />

                    {/* Native Accessible Drag/Drop Label Dropzone */}
                    <label
                      htmlFor="admin-notice-file-input"
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all select-none ${
                        isDragOver
                          ? 'border-white bg-white/15'
                          : 'border-white/25 hover:border-white/50 bg-white/5 hover:bg-white/10'
                      } ${isProcessingImage ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      {isProcessingImage ? (
                        <div className="flex flex-col items-center gap-2 py-2">
                          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span className="font-mono text-xs text-white font-medium">
                            Optimizing & center-cropping to 1:1 square...
                          </span>
                          <span className="font-mono text-[10px] text-white/50">
                            Compressing for instant cloud sync
                          </span>
                        </div>
                      ) : (
                        <>
                          <UploadCloud className="w-8 h-8 mx-auto text-white/70 mb-2" />
                          <p className="font-mono text-xs text-white font-semibold">
                            Click to browse or drag & drop image file
                          </p>
                          <p className="font-editorial italic text-[11px] text-white/50 mt-1">
                            PNG, JPG, WebP, GIF, SVG. Auto-crops & optimizes to high-res 1:1 square.
                          </p>
                          <div className="mt-3 flex items-center justify-center gap-2">
                            <span className="px-3 py-1 rounded bg-white text-black font-display text-[10px] uppercase font-bold tracking-wider hover:bg-neutral-200 transition-colors">
                              Select Image File
                            </span>
                            <span className="font-mono text-[10px] text-white/40">
                              or paste with Ctrl+V
                            </span>
                          </div>
                        </>
                      )}
                    </label>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-white/60">
                      Direct Image URL Link
                    </label>
                    <div className="relative">
                      <Link2 className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value);
                          setImageMeta(null);
                        }}
                        placeholder="https://... direct image link"
                        className="w-full bg-black/90 border border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* 1:1 Square Image Preview Box */}
                {imageUrl && (
                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <div className="flex items-center justify-between font-mono text-[11px] text-white/80">
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        1:1 Square Notice Ready
                        {imageMeta && (
                          <span className="font-normal text-white/50 text-[10px]">
                            ({imageMeta.width}×{imageMeta.height} • ~{imageMeta.sizeKb} KB)
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {imageInputMethod === 'upload' && (
                          <label
                            htmlFor="admin-notice-file-input"
                            className="text-white/80 hover:text-white text-[10px] uppercase tracking-wider transition-colors cursor-pointer underline"
                          >
                            Replace
                          </label>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setImageUrl('');
                            setImageMeta(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="text-red-400 hover:text-red-300 text-[10px] uppercase tracking-wider transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="relative w-full max-w-[260px] mx-auto aspect-square rounded-xl overflow-hidden border border-white/30 bg-black shadow-2xl">
                      <img
                        src={imageUrl}
                        alt="1:1 notice preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/20 font-mono text-[9px] text-white font-bold tracking-wider uppercase">
                        1:1 Ratio
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Accompanying Caption */}
                <div className="space-y-1.5 pt-2">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-white/60">
                    Accompanying Directive Note / Caption (Optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Add an optional brief text note to accompany the 1:1 image notice..."
                    className="w-full bg-black/60 border border-white/15 rounded-lg p-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white font-mono leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Written Message Area (When Written Notice is selected) */}
            {noticeType === 'text' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-white/80">
                    Written Notification Text <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-white/40">
                    Supports multiple lines & paragraphs
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder="Write the notification message here. For example:&#10;&#10;Greetings Operative,&#10;&#10;Please ensure you file your Weekly Intelligence and Asset Status report before 18:00 UTC. In addition, review the updated protocol in the Knowledge Portal.&#10;&#10;— Council Directive"
                  className="w-full bg-black/80 border border-white/20 rounded-xl p-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-mono leading-relaxed"
                  required={noticeType === 'text'}
                />
                <p className="text-[11px] font-editorial italic text-white/50">
                  This exact written notice will pop up on screen immediately when the member logs into the task portal. Once the member clicks "OK", it will be permanently dismissed.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3 px-6 rounded-xl bg-white text-black hover:bg-neutral-200 font-display text-xs sm:text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Notice...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-black" />
                    <span>
                      {noticeType === 'image'
                        ? 'Dispatch 1:1 Image Notice to Members'
                        : 'Dispatch Written Notice to Members'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* SENT NOTIFICATIONS LOG & ACKNOWLEDGMENT STATUS */}
        <div className="lg:col-span-6 bg-black/60 border border-white/20 rounded-2xl p-5 sm:p-6 space-y-5 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-white/10 border border-white/20 text-white">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                  Dispatched Notices Archive
                </h3>
                <p className="font-editorial italic text-xs text-white/60">
                  Track member delivery and "OK" acknowledgment status
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                getMemberNotifications().then((d) => {
                  setNotifications(d);
                  setIsLoading(false);
                });
              }}
              className="p-1.5 rounded-lg border border-white/15 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Refresh notices"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-white/50 font-mono text-xs flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Loading dispatched notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-white/40 space-y-3">
              <Bell className="w-8 h-8 mx-auto text-white/20" />
              <div className="font-display text-sm uppercase tracking-wider text-white/60">
                No Notices Dispatched Yet
              </div>
              <p className="font-editorial italic text-xs text-white/40 max-w-sm mx-auto">
                Use the composer on the left to write and dispatch your first directive to council operatives.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
              {notifications.map((notice) => {
                const isExpanded = expandedNoticeId === notice.id;
                const totalRecipients =
                  notice.targetType === 'all'
                    ? members.length
                    : notice.targetMemberAliases?.length || 0;
                const ackCount = notice.acknowledgedBy?.length || 0;
                const isUrgent = notice.urgency === 'urgent';

                return (
                  <div
                    key={notice.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isUrgent
                        ? 'border-red-500/40 bg-red-950/10'
                        : 'border-white/15 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    {/* Notice Top Meta */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span
                            className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border font-bold flex items-center gap-1 ${
                              isUrgent
                                ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                : 'bg-white/10 border-white/20 text-white/80'
                            }`}
                          >
                            {isUrgent && <AlertTriangle className="w-2.5 h-2.5" />}
                            {isUrgent ? 'URGENT' : 'STANDARD'}
                          </span>

                          <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/10 bg-white/5 text-white/70">
                            {notice.noticeType === 'image' || notice.imageUrl ? '1:1 IMAGE' : 'WRITTEN'}
                          </span>

                          <span className="font-mono text-[10px] text-white/50">
                            {new Date(notice.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>

                          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/70 border border-white/10">
                            {notice.targetType === 'all' ? (
                              <span className="flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" /> All Members
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <UserCheck className="w-2.5 h-2.5" /> {totalRecipients} Selected
                              </span>
                            )}
                          </span>
                        </div>

                        <h4 className="font-display text-sm font-bold tracking-wide text-white uppercase mt-1">
                          {notice.title}
                        </h4>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => setNoticeToDelete(notice)}
                        className="p-1.5 rounded-lg border border-red-500/30 hover:border-red-500 text-red-400 hover:bg-red-950/30 transition-colors shrink-0"
                        title="Delete notice permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Notice Message or 1:1 Image Preview */}
                    {notice.noticeType === 'image' || notice.imageUrl ? (
                      <div className="bg-black/60 rounded-lg p-3 border border-white/10 space-y-2.5">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
                          <div
                            onClick={() => setLightboxNotice(notice)}
                            className="relative w-24 h-24 sm:w-28 sm:h-28 aspect-square rounded-lg border border-white/25 overflow-hidden shrink-0 bg-neutral-900 cursor-pointer group shadow-sm"
                            title="Click to view 1:1 image in full size"
                          >
                            <img
                              src={notice.imageUrl}
                              alt={notice.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-4 h-4 text-white" />
                            </div>
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[8px] font-mono text-white/90 uppercase tracking-widest border border-white/20">
                              1:1
                            </div>
                          </div>

                          <div className="flex-1 space-y-1.5 text-center sm:text-left">
                            <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/15 inline-block">
                              1:1 Image Notice
                            </span>
                            {notice.message ? (
                              <p className="font-mono text-xs text-white/85 whitespace-pre-wrap leading-relaxed">
                                {notice.message}
                              </p>
                            ) : (
                              <p className="font-editorial italic text-xs text-white/40">
                                Visual directive only (no accompanying text).
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-black/60 rounded-lg p-3 border border-white/10 font-mono text-xs text-white/85 whitespace-pre-wrap leading-relaxed">
                        {notice.message}
                      </div>
                    )}

                    {/* Acknowledgment Status Bar */}
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span className="text-white/70">
                          Acknowledged by{' '}
                          <strong className="text-white">{ackCount}</strong>
                          {totalRecipients > 0 && (
                            <> of <strong className="text-white">{totalRecipients}</strong> operatives</>
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedNoticeId(isExpanded ? null : notice.id)}
                        className="text-[11px] font-mono uppercase tracking-wider text-white/70 hover:text-white inline-flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Acknowledged Members'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Expanded Acknowledgment Breakdown */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-3 font-mono text-xs bg-black/40 p-3 rounded-lg">
                        {/* Target operatives list if specific */}
                        {notice.targetType === 'specific' && notice.targetMemberAliases && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase tracking-wider text-white/50 block">
                              Targeted Operatives:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {notice.targetMemberAliases.map((alias) => (
                                <span
                                  key={alias}
                                  className="text-[11px] px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white"
                                >
                                  {alias}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Members who clicked OK */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-white/50 block">
                            Acknowledged by (Clicked "OK"):
                          </span>
                          {notice.acknowledgedBy && notice.acknowledgedBy.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {notice.acknowledgedBy.map((alias) => (
                                <span
                                  key={alias}
                                  className="text-[11px] px-2 py-0.5 rounded bg-white/20 border border-white/40 text-white flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                  {alias}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] font-editorial italic text-white/40">
                              No members have acknowledged this notice yet.
                            </span>
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
      </div>

      {/* CONFIRMATION MODAL FOR DELETING NOTICE */}
      {noticeToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-black border border-white/30 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl border border-white/20 bg-white/5 text-white shrink-0">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white/70">
                    Permanent Purge
                  </span>
                </div>
                <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                  Delete Notice Directive?
                </h3>
                <p className="font-editorial italic text-xs text-white/70 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-mono not-italic font-semibold text-white">
                    "{noticeToDelete.title}"
                  </span>
                  ? It will immediately stop displaying on any member login screen.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setNoticeToDelete(null)}
                className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 font-mono text-xs text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Purging Notice...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-black" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR 1:1 IMAGE NOTICES */}
      {lightboxNotice && lightboxNotice.imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-black border border-white/20 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white/80">
                  1:1 Visual Directive Preview
                </span>
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-white mt-1">
                  {lightboxNotice.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxNotice(null)}
                className="p-1.5 rounded-lg border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full max-w-md mx-auto aspect-square rounded-xl overflow-hidden border border-white/20 bg-neutral-950 shadow-inner">
              <img
                src={lightboxNotice.imageUrl}
                alt={lightboxNotice.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/20 font-mono text-[9px] text-white uppercase tracking-wider">
                1:1 Aspect Ratio
              </div>
            </div>

            {lightboxNotice.message && (
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 font-mono text-xs text-white/80 whitespace-pre-wrap leading-relaxed">
                {lightboxNotice.message}
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setLightboxNotice(null)}
                className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
