import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  Check,
  X,
  Search,
  BookOpen,
  Image as ImageIcon,
  Upload,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Minus,
  Code,
  Link,
  Eye,
  FileCode,
  Tag,
  AlertCircle,
  ExternalLink,
  Clock,
  User,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { KnowledgeArticle } from '../types';
import {
  getKnowledgeArticles,
  subscribeToKnowledgeArticles,
  saveKnowledgeArticle,
  deleteKnowledgeArticle
} from '../lib/firebase';

const CATEGORY_SUGGESTIONS = [
  'Doctrine & Operations',
  'Operational Directives',
  'Security & OpSec',
  'Archives & Lore',
  'Field Intelligence',
  'Technical Protocols'
];

export const AdminKnowledgeManager: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Permanent deletion confirmation state (replaces window.confirm which is blocked in sandboxed iframes)
  const [articleToDelete, setArticleToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingArticle, setIsDeletingArticle] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);

  // Editor mode: 'visual' (WYSIWYG) or 'code' (HTML source code)
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<KnowledgeArticle | null>(null);

  // Image insertion modal
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageAltInput, setImageAltInput] = useState('');
  const [imageCaptionInput, setImageCaptionInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Cover image file input
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Link insertion modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkTextInput, setLinkTextInput] = useState('');

  // ContentEditable ref and raw code textarea ref
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Current article being created or edited
  const [currentArticle, setCurrentArticle] = useState<KnowledgeArticle>({
    id: '',
    title: '',
    slug: '',
    category: 'Doctrine & Operations',
    summary: '',
    content: '<p>Enter article content here...</p>',
    coverImage: '',
    authorAlias: 'ARCHON_01',
    authorName: 'Council Scribe',
    isPublished: true,
    order: 1,
    tags: ['Protocol'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Load and subscribe to articles
  useEffect(() => {
    getKnowledgeArticles(false).then(setArticles).catch(console.warn);
    const unsubscribe = subscribeToKnowledgeArticles((arts) => {
      setArticles(arts);
    }, false);
    return () => unsubscribe();
  }, []);

  // Synchronize visual editor when currentArticle content changes or mode switches
  useEffect(() => {
    if (isEditing && editorMode === 'visual' && visualEditorRef.current) {
      if (visualEditorRef.current.innerHTML !== currentArticle.content) {
        visualEditorRef.current.innerHTML = currentArticle.content || '<p></p>';
      }
    }
  }, [isEditing, editorMode, currentArticle.id]);

  // Handle open create modal
  const handleCreateNewArticle = () => {
    const newArt: KnowledgeArticle = {
      id: `art_${Date.now()}`,
      title: '',
      slug: '',
      category: 'Doctrine & Operations',
      summary: '',
      content: `<h2>Executive Directive Overview</h2>
<p>Detail the foundational doctrine, operational background, and protocols for council members.</p>

<blockquote>"Discretion is the seal of our covenant."</blockquote>

<h3>Operational Protocols</h3>
<ul>
  <li>Maintain absolute cryptographic hygiene.</li>
  <li>Synchronize timestamps with council nodes.</li>
</ul>`,
      coverImage: '',
      authorAlias: 'ARCHON_01',
      authorName: 'Council Scribe',
      isPublished: true,
      order: articles.length + 1,
      tags: ['Protocol', 'Operations'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCurrentArticle(newArt);
    setErrorMessage(null);
    setEditorMode('visual');
    setIsEditing(true);
  };

  // Handle open edit modal
  const handleEditArticle = (art: KnowledgeArticle) => {
    setCurrentArticle(JSON.parse(JSON.stringify(art)));
    setErrorMessage(null);
    setEditorMode('visual');
    setIsEditing(true);
  };

  // Handle delete article - opens in-app confirmation modal (avoids iframe confirm() suppression)
  const handleDeleteArticle = (id: string, title: string) => {
    setErrorMessage(null);
    setArticleToDelete({ id, title });
  };

  // Execute permanent deletion from Firestore and memory
  const handleConfirmPermanentDelete = async () => {
    if (!articleToDelete) return;
    const { id, title } = articleToDelete;
    setIsDeletingArticle(true);
    setErrorMessage(null);

    try {
      // 1. Optimistic removal from state immediately
      setArticles((prev) => prev.filter((a) => a.id !== id));

      // 2. Permanently purge from Firestore and recorded metadata
      await deleteKnowledgeArticle(id);

      // 3. Close the article editor if the deleted article was currently open
      if (currentArticle.id === id) {
        setIsEditing(false);
      }

      setDeleteSuccessMessage(`Article "${title}" was permanently deleted from the knowledge archives.`);
      setTimeout(() => setDeleteSuccessMessage(null), 4000);
      setArticleToDelete(null);
    } catch (err: any) {
      console.error('Failed to permanently delete article:', err);
      setErrorMessage(err.message || 'Failed to permanently delete article from repository.');
      // Refresh articles on failure
      getKnowledgeArticles(false).then(setArticles).catch(console.warn);
    } finally {
      setIsDeletingArticle(false);
    }
  };

  // Toggle publish status
  const handleTogglePublish = async (art: KnowledgeArticle) => {
    try {
      await saveKnowledgeArticle({
        ...art,
        isPublished: !art.isPublished
      });
    } catch (err) {
      console.error('Failed to toggle article status:', err);
    }
  };

  // Process image file to base64 with canvas resizing (< 100KB safe)
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawResult = e.target?.result;
        if (typeof rawResult !== 'string') {
          resolve('');
          return;
        }

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 900;
              const MAX_HEIGHT = 900;
              let width = img.naturalWidth || img.width;
              let height = img.naturalHeight || img.height;

              if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                if (width > height) {
                  height = Math.round((height * MAX_WIDTH) / width);
                  width = MAX_WIDTH;
                } else {
                  width = Math.round((width * MAX_HEIGHT) / height);
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(rawResult);
                return;
              }
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/jpeg', 0.78);
              resolve(compressed);
            } catch {
              resolve(rawResult);
            }
          };
          img.onerror = () => resolve(rawResult);
          img.src = rawResult;
        } catch {
          resolve(rawResult);
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // Upload Cover Image
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const base64 = await processImageFile(file);
      if (base64) {
        setCurrentArticle((prev) => ({ ...prev, coverImage: base64 }));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Image upload failed');
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  // Synchronize content from visual editor
  const syncFromVisual = () => {
    if (visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML;
      setCurrentArticle((prev) => ({ ...prev, content: html }));
    }
  };

  // Apply rich formatting command
  const applyFormat = (command: string, value: string | undefined = undefined) => {
    if (editorMode === 'visual') {
      visualEditorRef.current?.focus();
      document.execCommand(command, false, value);
      syncFromVisual();
    } else {
      // In code mode, insert standard tags
      insertTagInCode(command);
    }
  };

  // Insert standard HTML tags in Code Mode
  const insertTagInCode = (tagType: string) => {
    const textarea = codeTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end);
    let before = '';
    let after = '';

    switch (tagType) {
      case 'bold':
        before = '<b>';
        after = '</b>';
        break;
      case 'italic':
        before = '<i>';
        after = '</i>';
        break;
      case 'underline':
        before = '<u>';
        after = '</u>';
        break;
      case 'strikeThrough':
        before = '<s>';
        after = '</s>';
        break;
      case 'h1':
        before = '<h1>';
        after = '</h1>';
        break;
      case 'h2':
        before = '<h2>';
        after = '</h2>';
        break;
      case 'h3':
        before = '<h3>';
        after = '</h3>';
        break;
      case 'p':
        before = '<p>';
        after = '</p>';
        break;
      case 'blockquote':
        before = '<blockquote>';
        after = '</blockquote>';
        break;
      case 'code':
        before = '<code>';
        after = '</code>';
        break;
      case 'pre':
        before = '<pre><code>';
        after = '</code></pre>';
        break;
      case 'hr':
        before = '<hr />\n';
        after = '';
        break;
      case 'ul':
        before = '<ul>\n  <li>';
        after = '</li>\n</ul>';
        break;
      case 'ol':
        before = '<ol>\n  <li>';
        after = '</li>\n</ol>';
        break;
      default:
        before = `<${tagType}>`;
        after = `</${tagType}>`;
    }

    const replacement = before + (selected || 'Text') + after;
    const newContent =
      textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    setCurrentArticle((prev) => ({ ...prev, content: newContent }));

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + (selected || 'Text').length);
    }, 50);
  };

  // Insert image HTML anywhere in middle of article
  const insertImageIntoArticle = (src: string, alt = '', caption = '') => {
    const cleanAlt = alt.trim() || 'Article illustration';
    const cleanCaption = caption.trim();

    let imageHtml = '';
    if (cleanCaption) {
      imageHtml = `
<figure style="margin: 1.75rem 0; text-align: center;">
  <img src="${src}" alt="${cleanAlt}" style="display: block; margin: 0 auto; max-width: 100%; border-radius: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.2);" />
  <figcaption style="margin-top: 0.5rem; font-style: italic; font-size: 0.8rem; color: rgba(255, 255, 255, 0.65); font-family: serif;">
    ${cleanCaption}
  </figcaption>
</figure>
<p></p>`;
    } else {
      imageHtml = `
<p style="text-align: center; margin: 1.75rem 0;">
  <img src="${src}" alt="${cleanAlt}" style="display: block; margin: 0 auto; max-width: 100%; border-radius: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.2);" />
</p>
<p></p>`;
    }

    if (editorMode === 'visual') {
      visualEditorRef.current?.focus();
      // Check if document.execCommand insertHTML works
      const success = document.execCommand('insertHTML', false, imageHtml);
      if (!success && visualEditorRef.current) {
        // Fallback: append or insert at selection
        visualEditorRef.current.innerHTML += imageHtml;
      }
      syncFromVisual();
    } else {
      const textarea = codeTextareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent =
          textarea.value.substring(0, start) + imageHtml + textarea.value.substring(end);
        setCurrentArticle((prev) => ({ ...prev, content: newContent }));
      } else {
        setCurrentArticle((prev) => ({
          ...prev,
          content: prev.content + imageHtml
        }));
      }
    }

    setIsImageModalOpen(false);
    setImageUrlInput('');
    setImageAltInput('');
    setImageCaptionInput('');
  };

  // Handle image upload from computer to insert inside article
  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const base64 = await processImageFile(file);
      insertImageIntoArticle(base64, imageAltInput || file.name, imageCaptionInput);
    } catch (err: any) {
      alert(err.message || 'Image processing failed');
    } finally {
      setIsUploadingImage(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    }
  };

  // Insert Link
  const insertLink = () => {
    if (!linkUrlInput.trim()) return;
    const cleanUrl = linkUrlInput.trim();
    const cleanText = linkTextInput.trim() || cleanUrl;
    const linkHtml = `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: underline; text-underline-offset: 4px;">${cleanText}</a>`;

    if (editorMode === 'visual') {
      visualEditorRef.current?.focus();
      document.execCommand('insertHTML', false, linkHtml);
      syncFromVisual();
    } else {
      const textarea = codeTextareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent =
          textarea.value.substring(0, start) + linkHtml + textarea.value.substring(end);
        setCurrentArticle((prev) => ({ ...prev, content: newContent }));
      }
    }

    setIsLinkModalOpen(false);
    setLinkUrlInput('');
    setLinkTextInput('');
  };

  // Save the article to Firestore
  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentArticle.title.trim()) {
      setErrorMessage('Article title is required.');
      return;
    }

    // Ensure visual content is captured
    if (editorMode === 'visual' && visualEditorRef.current) {
      currentArticle.content = visualEditorRef.current.innerHTML;
    }

    if (!currentArticle.content.trim()) {
      setErrorMessage('Article content cannot be empty.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await saveKnowledgeArticle(currentArticle);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save knowledge article.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered articles list
  const filteredArticles = articles.filter((art) => {
    if (selectedCategoryFilter !== 'all' && art.category !== selectedCategoryFilter) {
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

  // Calculate distinct categories
  const allCategories = Array.from(
    new Set(articles.map((a) => a.category).filter(Boolean))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white font-medium">
              Knowledge Base (/#/knowledge)
            </span>
            <h2 className="font-display text-base sm:text-lg font-bold uppercase tracking-wider text-white">
              Council Knowledge Repository & Articles
            </h2>
          </div>
          <p className="font-editorial italic text-xs sm:text-sm text-white/70 mt-1 max-w-2xl">
            Publish doctrinal articles, protocols, and intelligence lore accessible by verified members at <code className="font-mono text-white bg-white/10 px-1 py-0.5 rounded">/#/knowledge</code>. Use standard HTML formatting and embed images anywhere in the text.
          </p>
        </div>

        <button
          id="btnCreateArticle"
          type="button"
          onClick={handleCreateNewArticle}
          className="px-4 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4 text-black" />
          Create New Article
        </button>
      </div>

      {/* Action Banners */}
      {deleteSuccessMessage && (
        <div className="p-3.5 rounded-xl border border-white/30 bg-white/10 text-white font-mono text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span>{deleteSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteSuccessMessage(null)}
            className="text-white/60 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMessage && !isEditing && (
        <div className="p-3.5 rounded-xl border border-red-500/40 bg-red-950/40 text-red-200 font-mono text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
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

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search articles by title, category, keywords, or content..."
            className="w-full font-body pl-9 pr-4 py-2.5 rounded-lg bg-black border border-white/20 text-white placeholder-white/30 text-xs focus:outline-none focus:border-white transition-colors"
          />
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {allCategories.length > 0 && (
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="font-mono px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white uppercase shrink-0"
          >
            <option value="all">All Categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="bg-black border border-white/20 rounded-xl p-8 sm:p-12 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-white/40 mx-auto" />
          <h3 className="font-display text-base font-semibold uppercase tracking-wider text-white">
            No Knowledge Articles Found
          </h3>
          <p className="font-editorial italic text-xs sm:text-sm text-white/60 max-w-sm mx-auto">
            Create your first article. Members can view published articles at <code className="font-mono text-white">/#/knowledge</code> using their same alias and passcode.
          </p>
          <button
            type="button"
            onClick={handleCreateNewArticle}
            className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2 mt-2"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            Write First Article
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map((art) => (
            <div
              key={art.id}
              className="bg-black border border-white/20 hover:border-white/40 rounded-xl overflow-hidden flex flex-col justify-between transition-colors"
            >
              {/* Cover Image */}
              {art.coverImage ? (
                <div className="w-full h-36 relative overflow-hidden bg-white/5 border-b border-white/10">
                  <img
                    src={art.coverImage}
                    alt={art.title}
                    className="w-full h-full object-cover grayscale contrast-125 opacity-80 hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute top-2 right-2">
                    <span
                      className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                        art.isPublished
                          ? 'border-white/40 bg-black/80 text-white'
                          : 'border-white/20 bg-black/80 text-white/50'
                      }`}
                    >
                      {art.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 pb-0 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/70 bg-white/5">
                    {art.category || 'General'}
                  </span>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border ${
                      art.isPublished
                        ? 'border-white/40 bg-white/10 text-white font-medium'
                        : 'border-white/20 text-white/40'
                    }`}
                  >
                    {art.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
              )}

              {/* Content info */}
              <div className="p-4 sm:p-5 space-y-2.5 flex-1">
                {art.coverImage && (
                  <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/70 bg-white/5 inline-block">
                    {art.category || 'General'}
                  </span>
                )}

                <h3 className="font-display text-base font-bold uppercase tracking-wider text-white line-clamp-2">
                  {art.title}
                </h3>

                {art.summary && (
                  <p className="font-editorial italic text-xs text-white/70 line-clamp-3 leading-relaxed">
                    {art.summary}
                  </p>
                )}

                <div className="pt-2 flex items-center gap-3 font-mono text-[10px] text-white/50">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-white/40" />
                    {art.authorAlias || 'Council'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-white/40" />
                    {new Date(art.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2 bg-white/[0.01]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleDeleteArticle(art.id, art.title)}
                    className="p-1.5 rounded-lg border border-white/15 text-white/40 hover:text-white hover:border-white/40 transition-colors"
                    title="Delete Article"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePublish(art)}
                    className="px-2 py-1 rounded border border-white/15 text-white/60 hover:text-white font-mono text-[10px] transition-colors"
                    title={art.isPublished ? 'Switch to Draft' : 'Publish Article'}
                  >
                    {art.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewArticle(art);
                      setShowPreviewModal(true);
                    }}
                    className="p-1.5 rounded-lg border border-white/20 text-white/70 hover:text-white transition-colors"
                    title="Preview as Member"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditArticle(art)}
                    className="px-3 py-1.5 rounded-lg border border-white/30 hover:border-white text-white font-display text-xs uppercase tracking-wider font-semibold transition-colors inline-flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Article
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =====================================================================
          FULL TEXT ARTICLE EDITOR MODAL (WYSIWYG + HTML CODE + IMAGE INSERTER)
          ===================================================================== */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-5xl bg-black border border-white/30 rounded-2xl p-5 sm:p-7 space-y-5 max-h-[94vh] overflow-y-auto my-auto shadow-2xl">
            {/* Modal Top Bar */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/15">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 text-white/60 mb-1 inline-block">
                  Knowledge Base Article Editor
                </span>
                <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
                  {currentArticle.title || 'Untitled Article'}
                </h2>
                <p className="font-editorial italic text-xs text-white/70 mt-0.5">
                  Format using standard HTML annotations (bold, italics, headings, quotes, lists) and upload images anywhere in the middle.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (editorMode === 'visual' && visualEditorRef.current) {
                      currentArticle.content = visualEditorRef.current.innerHTML;
                    }
                    setPreviewArticle(currentArticle);
                    setShowPreviewModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-white/25 text-white/80 hover:text-white font-mono text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Live Preview
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-lg border border-white/20 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-lg border border-white/40 bg-white/5 text-white text-xs font-body flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 rounded-lg border border-white bg-white/10 text-white text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 text-white" />
                <span>Article saved successfully to knowledge repository.</span>
              </div>
            )}

            <form onSubmit={handleSaveArticle} className="space-y-5">
              {/* Metadata row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                    Article Title <span className="text-white/60">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={currentArticle.title}
                    onChange={(e) =>
                      setCurrentArticle({ ...currentArticle, title: e.target.value })
                    }
                    placeholder="e.g. Codex of Shadows: Ingress & Operational Security Directives"
                    className="w-full font-body px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                    Category
                  </label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={currentArticle.category}
                    onChange={(e) =>
                      setCurrentArticle({ ...currentArticle, category: e.target.value })
                    }
                    placeholder="e.g. Doctrine & Operations"
                    className="w-full font-body px-3 py-2 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                  <datalist id="category-suggestions">
                    {CATEGORY_SUGGESTIONS.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                {/* Excerpt / Summary */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                    Executive Summary / Abstract
                  </label>
                  <textarea
                    rows={2}
                    value={currentArticle.summary || ''}
                    onChange={(e) =>
                      setCurrentArticle({ ...currentArticle, summary: e.target.value })
                    }
                    placeholder="Brief summary displayed on article cards in the knowledge portal..."
                    className="w-full font-body px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                {/* Cover Image */}
                <div className="space-y-1">
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                    Cover Banner Image
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentArticle.coverImage || ''}
                      onChange={(e) =>
                        setCurrentArticle({ ...currentArticle, coverImage: e.target.value })
                      }
                      placeholder="Image URL or upload..."
                      className="flex-1 font-body px-2.5 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                    />
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={isUploadingCover}
                      className="px-2.5 py-1.5 rounded-lg border border-white/30 text-white hover:bg-white/10 font-mono text-xs shrink-0 inline-flex items-center gap-1"
                      title="Upload image from computer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isUploadingCover ? '...' : 'Upload'}
                    </button>
                  </div>
                  {currentArticle.coverImage && (
                    <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-white/50">
                      <span>Cover image attached</span>
                      <button
                        type="button"
                        onClick={() => setCurrentArticle({ ...currentArticle, coverImage: '' })}
                        className="text-white/40 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Tags & Author */}
                <div className="space-y-1">
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                    Author / Scribe Alias
                  </label>
                  <input
                    type="text"
                    value={currentArticle.authorAlias || 'ARCHON_01'}
                    onChange={(e) =>
                      setCurrentArticle({ ...currentArticle, authorAlias: e.target.value })
                    }
                    placeholder="e.g. ARCHON_01"
                    className="w-full font-body px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(currentArticle.tags || []).join(', ')}
                    onChange={(e) =>
                      setCurrentArticle({
                        ...currentArticle,
                        tags: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean)
                      })
                    }
                    placeholder="Protocol, Operations, OpSec"
                    className="w-full font-body px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <div className="space-y-1 flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-white/20 bg-white/5">
                    <input
                      type="checkbox"
                      checked={currentArticle.isPublished}
                      onChange={(e) =>
                        setCurrentArticle({ ...currentArticle, isPublished: e.target.checked })
                      }
                      className="accent-white"
                    />
                    <span className="font-mono text-xs text-white font-medium">
                      Publish to Knowledge Portal (/#/knowledge)
                    </span>
                  </label>
                </div>
              </div>

              {/* =============================================================
                  RICH FULL TEXT EDITOR TOOLBAR
                  ============================================================= */}
              <div className="space-y-2 pt-2 border-t border-white/15">
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.04] border border-white/20">
                  {/* Text Style Controls */}
                  <div className="flex items-center flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => applyFormat('bold')}
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Bold (<b> / <strong>)"
                    >
                      <Bold className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => applyFormat('italic')}
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Italics (<i> / <em>)"
                    >
                      <Italic className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => applyFormat('underline')}
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Underline (<u>)"
                    >
                      <Underline className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => applyFormat('strikeThrough')}
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Strikethrough (<s>)"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-white/20 mx-1" />

                    {/* Headings */}
                    <button
                      type="button"
                      onClick={() =>
                        editorMode === 'visual'
                          ? applyFormat('formatBlock', '<h1>')
                          : insertTagInCode('h1')
                      }
                      className="px-1.5 py-1 rounded hover:bg-white/20 text-white font-mono text-xs font-bold transition-colors"
                      title="Heading 1 (<h1>)"
                    >
                      H1
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editorMode === 'visual'
                          ? applyFormat('formatBlock', '<h2>')
                          : insertTagInCode('h2')
                      }
                      className="px-1.5 py-1 rounded hover:bg-white/20 text-white font-mono text-xs font-bold transition-colors"
                      title="Heading 2 (<h2>)"
                    >
                      H2
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editorMode === 'visual'
                          ? applyFormat('formatBlock', '<h3>')
                          : insertTagInCode('h3')
                      }
                      className="px-1.5 py-1 rounded hover:bg-white/20 text-white font-mono text-xs font-bold transition-colors"
                      title="Heading 3 (<h3>)"
                    >
                      H3
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        editorMode === 'visual'
                          ? applyFormat('formatBlock', '<p>')
                          : insertTagInCode('p')
                      }
                      className="px-1.5 py-1 rounded hover:bg-white/20 text-white font-mono text-xs transition-colors"
                      title="Paragraph (<p>)"
                    >
                      P
                    </button>

                    <div className="h-4 w-px bg-white/20 mx-1" />

                    {/* Quotes & Lists */}
                    <button
                      type="button"
                      onClick={() =>
                        editorMode === 'visual'
                          ? applyFormat('formatBlock', '<blockquote>')
                          : insertTagInCode('blockquote')
                      }
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Blockquote (<blockquote>)"
                    >
                      <Quote className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => applyFormat('insertUnorderedList')}
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Bullet List (<ul>)"
                    >
                      <List className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => applyFormat('insertOrderedList')}
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Numbered List (<ol>)"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => applyFormat('insertHorizontalRule')}
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Divider (<hr />)"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => insertTagInCode('pre')}
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Code Block (<pre><code>)"
                    >
                      <Code className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsLinkModalOpen(true)}
                      className="p-1.5 rounded hover:bg-white/20 text-white transition-colors"
                      title="Insert Hyperlink"
                    >
                      <Link className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-white/20 mx-1" />

                    {/* ========================================================
                        UPLOAD / INSERT IMAGE ANYWHERE IN MIDDLE OF ARTICLE
                        ======================================================== */}
                    <button
                      type="button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="px-2.5 py-1 rounded-md bg-white text-black hover:bg-neutral-200 font-display text-[11px] uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-1.5"
                      title="Upload or embed an image anywhere in the article"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-black" />
                      Insert Image Anywhere
                    </button>
                  </div>

                  {/* Mode Switch: Visual WYSIWYG vs HTML Source */}
                  <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-white/20">
                    <button
                      type="button"
                      onClick={() => {
                        if (editorMode === 'code') {
                          // Switching to visual, keep currentArticle.content
                          setEditorMode('visual');
                        }
                      }}
                      className={`px-2 py-1 rounded font-mono text-xs transition-colors inline-flex items-center gap-1 ${
                        editorMode === 'visual'
                          ? 'bg-white text-black font-semibold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Visual Editor
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (editorMode === 'visual' && visualEditorRef.current) {
                          setCurrentArticle((prev) => ({
                            ...prev,
                            content: visualEditorRef.current?.innerHTML || ''
                          }));
                        }
                        setEditorMode('code');
                      }}
                      className={`px-2 py-1 rounded font-mono text-xs transition-colors inline-flex items-center gap-1 ${
                        editorMode === 'code'
                          ? 'bg-white text-black font-semibold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      HTML Code
                    </button>
                  </div>
                </div>

                {/* Main Text Content Input */}
                {editorMode === 'visual' ? (
                  <div className="space-y-1">
                    <div
                      ref={visualEditorRef}
                      contentEditable
                      onInput={syncFromVisual}
                      onBlur={syncFromVisual}
                      className="w-full min-h-[360px] max-h-[500px] overflow-y-auto p-5 rounded-xl bg-black border border-white/25 text-white font-body text-sm leading-relaxed focus:outline-none focus:border-white prose prose-invert max-w-none shadow-inner"
                      style={{
                        outline: 'none'
                      }}
                    />
                    <span className="font-mono text-[10px] text-white/40 block">
                      Tip: You can highlight text and click formatting buttons, or click "Insert Image Anywhere" to embed illustrations at cursor position.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <textarea
                      ref={codeTextareaRef}
                      rows={15}
                      value={currentArticle.content}
                      onChange={(e) =>
                        setCurrentArticle({ ...currentArticle, content: e.target.value })
                      }
                      placeholder="<p>Write standard HTML content here...</p>"
                      className="w-full min-h-[360px] max-h-[500px] p-4 rounded-xl bg-neutral-950 border border-white/25 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-white"
                    />
                    <span className="font-mono text-[10px] text-white/40 block">
                      Standard HTML Mode: Direct editing of &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;h1&gt;, &lt;h2&gt;, &lt;h3&gt;, &lt;blockquote&gt;, &lt;ul&gt;, &lt;li&gt;, and &lt;img&gt; tags.
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="pt-4 border-t border-white/15 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 font-mono text-xs text-white transition-colors"
                  >
                    Cancel
                  </button>

                  {currentArticle.id && !currentArticle.id.startsWith('new_') && !currentArticle.id.startsWith('temp_') && articles.some((a) => a.id === currentArticle.id) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteArticle(currentArticle.id, currentArticle.title || 'Untitled Article')}
                      className="px-3.5 py-2 rounded-lg border border-red-500/30 hover:border-red-500/70 hover:bg-red-950/20 text-red-300 font-mono text-xs transition-colors inline-flex items-center gap-1.5"
                      title="Permanently delete this article"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      Delete Article
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (editorMode === 'visual' && visualEditorRef.current) {
                        currentArticle.content = visualEditorRef.current.innerHTML;
                      }
                      setPreviewArticle(currentArticle);
                      setShowPreviewModal(true);
                    }}
                    className="px-3.5 py-2 rounded-lg border border-white/30 hover:border-white font-display text-xs uppercase tracking-wider font-semibold text-white inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview Article
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Saving to Archives...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 text-black" />
                        Save Article
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          INSERT IMAGE ANYWHERE MODAL
          ===================================================================== */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-black border border-white/30 rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-white" />
                Embed Image Anywhere In Article
              </h3>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="p-1 rounded text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload from Computer */}
            <div className="p-4 rounded-lg border border-white/20 bg-white/[0.02] space-y-3">
              <span className="block font-mono text-xs font-semibold uppercase tracking-wider text-white">
                Option A: Upload from Device (Auto-embedded anywhere)
              </span>
              <p className="font-editorial italic text-xs text-white/60">
                Select any image (PNG, JPG, WebP, SVG) to optimize and insert directly in the middle of your text.
              </p>

              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInlineImageUpload}
                className="hidden"
              />

              <button
                type="button"
                disabled={isUploadingImage}
                onClick={() => imageFileInputRef.current?.click()}
                className="w-full py-2.5 rounded-lg border border-white/30 hover:border-white bg-white/5 hover:bg-white/10 font-display text-xs uppercase tracking-wider font-semibold text-white inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                {isUploadingImage ? 'Processing & Embedding Image...' : 'Choose Image File from Computer'}
              </button>
            </div>

            {/* Or by Image URL */}
            <div className="p-4 rounded-lg border border-white/20 bg-white/[0.02] space-y-3">
              <span className="block font-mono text-xs font-semibold uppercase tracking-wider text-white">
                Option B: Or Insert by Image Web URL
              </span>

              <div className="space-y-2">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full font-body px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={imageAltInput}
                    onChange={(e) => setImageAltInput(e.target.value)}
                    placeholder="Alt description (optional)"
                    className="w-full font-body px-2.5 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                  <input
                    type="text"
                    value={imageCaptionInput}
                    onChange={(e) => setImageCaptionInput(e.target.value)}
                    placeholder="Caption label (optional)"
                    className="w-full font-body px-2.5 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <button
                  type="button"
                  disabled={!imageUrlInput.trim()}
                  onClick={() => insertImageIntoArticle(imageUrlInput, imageAltInput, imageCaptionInput)}
                  className="w-full py-2 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-40 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-black" />
                  Insert Image at Cursor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INSERT LINK MODAL
          ===================================================================== */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-black border border-white/30 rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Link className="w-4 h-4 text-white" />
                Insert Hyperlink
              </h3>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 rounded text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70 mb-1">
                  Destination URL
                </label>
                <input
                  type="text"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full font-body px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-white/70 mb-1">
                  Link Text (optional)
                </label>
                <input
                  type="text"
                  value={linkTextInput}
                  onChange={(e) => setLinkTextInput(e.target.value)}
                  placeholder="e.g. Read Operational Directive 04"
                  className="w-full font-body px-3 py-1.5 rounded-lg bg-black border border-white/20 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-white/20 text-white font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={insertLink}
                  disabled={!linkUrlInput.trim()}
                  className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 disabled:opacity-40 font-display text-xs uppercase tracking-wider font-bold transition-colors"
                >
                  Insert Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PERMANENT DELETE CONFIRMATION MODAL (In-App, No window.confirm)
          ===================================================================== */}
      {articleToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-black border border-white/30 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl border border-white/20 bg-white/5 text-white shrink-0">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border border-white/20 bg-white/5 text-white/70">
                    Irreversible Operation
                  </span>
                </div>
                <h3 className="font-display text-sm sm:text-base font-bold uppercase tracking-wider text-white">
                  Permanently Delete Article?
                </h3>
                <p className="font-editorial italic text-xs text-white/70 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-mono not-italic font-semibold text-white">
                    "{articleToDelete.title}"
                  </span>
                  ? This will permanently purge the document from the knowledge archives and Firestore database.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingArticle}
                onClick={() => setArticleToDelete(null)}
                className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 font-mono text-xs text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingArticle}
                onClick={handleConfirmPermanentDelete}
                className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-display text-xs uppercase tracking-wider font-bold transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isDeletingArticle ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Purging Document...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-black" />
                    Confirm Permanent Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          LIVE READER PREVIEW MODAL
          ===================================================================== */}
      {showPreviewModal && previewArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/95 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-black border border-white/30 rounded-2xl overflow-hidden shadow-2xl my-auto max-h-[95vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-white/15 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border border-white/20 bg-white/10 text-white">
                  Member Portal Preview Mode
                </span>
                <span className="font-mono text-xs text-white/50">
                  {previewArticle.category}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 sm:p-10 overflow-y-auto space-y-6">
              {/* Cover Image if any */}
              {previewArticle.coverImage && (
                <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-white/20 bg-white/5">
                  <img
                    src={previewArticle.coverImage}
                    alt={previewArticle.title}
                    className="w-full h-full object-cover grayscale contrast-125"
                  />
                </div>
              )}

              {/* Title & Metadata */}
              <div className="space-y-3 pb-6 border-b border-white/15">
                <div className="flex items-center gap-2 flex-wrap font-mono text-[11px] text-white/60">
                  <span className="uppercase text-white font-semibold">
                    {previewArticle.category}
                  </span>
                  <span>•</span>
                  <span>Scribe: {previewArticle.authorAlias || 'ARCHON_01'}</span>
                  <span>•</span>
                  <span>{new Date(previewArticle.createdAt).toLocaleDateString()}</span>
                </div>

                <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wider text-white">
                  {previewArticle.title}
                </h1>

                {previewArticle.summary && (
                  <p className="font-editorial italic text-base sm:text-lg text-white/80 leading-relaxed max-w-3xl">
                    {previewArticle.summary}
                  </p>
                )}
              </div>

              {/* Formatted HTML Article Content with embedded images */}
              <div
                className="font-body text-sm sm:text-base text-white/90 leading-relaxed space-y-4 prose prose-invert max-w-none [&_h1]:font-display [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:uppercase [&_h1]:tracking-wider [&_h1]:text-white [&_h1]:mt-8 [&_h1]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wider [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:uppercase [&_h3]:tracking-wider [&_h3]:text-white [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:font-body [&_p]:text-sm [&_p]:sm:text-base [&_p]:text-white/85 [&_p]:leading-relaxed [&_blockquote]:border-l-2 [&_blockquote]:border-white [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:font-editorial [&_blockquote]:text-white/90 [&_blockquote]:my-4 [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1.5 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1.5 [&_ol]:my-3 [&_b]:text-white [&_b]:font-bold [&_strong]:text-white [&_strong]:font-bold [&_i]:italic [&_i]:font-editorial [&_u]:underline [&_u]:underline-offset-4 [&_code]:font-mono [&_code]:text-xs [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-white [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-white/20 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_hr]:border-white/15 [&_hr]:my-6 [&_img]:rounded-lg [&_img]:border [&_img]:border-white/20 [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4"
                dangerouslySetInnerHTML={{ __html: previewArticle.content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
