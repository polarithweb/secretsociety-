import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  Search,
  Trash2,
  Lock,
  ArrowLeft,
  MessageSquarePlus,
  Users,
  Clock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { MemberAccount, ChatThread, ChatMessage } from '../types';
import {
  subscribeToChatThreads,
  subscribeToChatMessages,
  sendChatMessage,
  markChatThreadReadByAdmin,
  deleteChatThread
} from '../lib/firebaseChat';

interface AdminChatManagerProps {
  members: MemberAccount[];
  preselectedMemberAlias?: string | null;
  onClearPreselectedMember?: () => void;
}

export const AdminChatManager: React.FC<AdminChatManagerProps> = ({
  members = [],
  preselectedMemberAlias,
  onClearPreselectedMember
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'threads' | 'members'>('threads');
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Automatically select thread if preselected from Member list
  useEffect(() => {
    if (preselectedMemberAlias) {
      setSelectedThreadId(preselectedMemberAlias);
      onClearPreselectedMember?.();
    }
  }, [preselectedMemberAlias]);

  // Subscribe to all chat threads in real time
  useEffect(() => {
    try {
      const unsubscribe = subscribeToChatThreads((updatedThreads) => {
        setThreads(Array.isArray(updatedThreads) ? updatedThreads : []);
      });
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.warn('Failed to subscribe to chat threads:', err);
    }
  }, []);

  // Subscribe to messages of the selected thread in real time
  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    try {
      const unsubscribe = subscribeToChatMessages(selectedThreadId, (msgs) => {
        setMessages(Array.isArray(msgs) ? msgs : []);
        setTimeout(() => scrollToBottom('auto'), 50);
      });

      markChatThreadReadByAdmin(selectedThreadId).catch(console.warn);

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.warn('Failed to subscribe to chat messages:', err);
    }
  }, [selectedThreadId]);

  const selectedMemberAccount = (members || []).find(
    (m) => (m?.alias || '').toLowerCase() === (selectedThreadId || '').toLowerCase()
  );

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = (replyText || '').trim();
    if (!selectedThreadId || !trimmed || isSending) return;

    setReplyText('');
    setIsSending(true);

    try {
      await sendChatMessage({
        threadId: selectedThreadId,
        memberAlias: selectedThreadId,
        memberName: selectedMemberAccount?.name || '',
        senderRole: 'admin',
        senderAlias: 'Admin',
        text: trimmed
      });
      setTimeout(() => scrollToBottom('smooth'), 50);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send reply from admin portal:', err);
      // Restore draft text so admin doesn't lose it
      setReplyText(trimmed);
      setStatusNotice('Message failed to transmit. Please retry.');
      setTimeout(() => setStatusNotice(null), 4000);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmDeleteThread = async () => {
    if (!threadToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteChatThread(threadToDelete);
      if ((selectedThreadId || '').toLowerCase() === threadToDelete.toLowerCase()) {
        setSelectedThreadId(null);
        setMessages([]);
      }
      setStatusNotice(`Chat with ${threadToDelete} deleted permanently from everywhere.`);
      setTimeout(() => setStatusNotice(null), 4000);
    } catch (err) {
      console.error('Failed to delete thread from everywhere:', err);
      setStatusNotice('Failed to delete chat. Please check connection.');
      setTimeout(() => setStatusNotice(null), 4000);
    } finally {
      setIsDeleting(false);
      setThreadToDelete(null);
    }
  };

  const formatMessageTime = (dateIso?: string) => {
    if (!dateIso) return '';
    try {
      const d = new Date(dateIso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Safe Filtering of threads
  const filteredThreads = (threads || []).filter((t) => {
    if (!t) return false;
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return true;
    const alias = (t.memberAlias || t.id || '').toLowerCase();
    const name = (t.memberName || '').toLowerCase();
    const lastMsg = (t.lastMessageText || '').toLowerCase();
    return alias.includes(q) || name.includes(q) || lastMsg.includes(q);
  });

  // Safe Filtering of members
  const filteredMembers = (members || []).filter((m) => {
    if (!m) return false;
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return true;
    const alias = (m.alias || '').toLowerCase();
    const name = (m.name || '').toLowerCase();
    return alias.includes(q) || name.includes(q);
  });

  if (hasError) {
    return (
      <div className="w-full bg-zinc-950 rounded-2xl border border-zinc-800 p-8 text-center text-white my-4">
        <AlertTriangle className="w-10 h-10 text-white mx-auto mb-3" />
        <h3 className="font-display text-base uppercase tracking-wider mb-2 font-bold">
          Communications Channel Re-syncing
        </h3>
        <p className="text-xs text-zinc-400 font-mono mb-4 max-w-md mx-auto">
          The chat sub-system encountered a display anomaly. Click below to reconnect.
        </p>
        <button
          type="button"
          onClick={() => {
            setHasError(false);
            setSelectedThreadId(null);
          }}
          className="px-4 py-2 bg-white text-black font-display text-xs uppercase tracking-wider font-bold rounded-xl hover:bg-zinc-200 transition inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset Comms View</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col h-[750px] max-h-[85vh] selection:bg-white selection:text-black">
      {/* Top Banner Notice if any */}
      {statusNotice && (
        <div className="bg-zinc-900 border-b border-zinc-800 text-white text-xs font-mono px-4 py-2 text-center animate-fadeIn shrink-0">
          {statusNotice}
        </div>
      )}

      {/* Main Top Header */}
      <div className="h-14 px-5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display tracking-[0.15em] text-sm uppercase font-bold text-white">
            Direct Member Communications
          </span>
          {threads.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-white text-black font-bold">
              {threads.length} {threads.length === 1 ? 'chat' : 'chats'}
            </span>
          )}
        </div>
      </div>

      {/* Main 2-Column Interface (Responsive for Mobile & Desktop) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Threads / Members List */}
        <div
          className={`${
            selectedThreadId ? 'hidden sm:flex' : 'flex'
          } w-full sm:w-80 md:w-96 bg-black border-r border-zinc-800 flex-col shrink-0`}
        >
          {/* Tabs: Active Chats vs All Members */}
          <div className="flex border-b border-zinc-800 bg-zinc-950">
            <button
              type="button"
              onClick={() => setSidebarTab('threads')}
              className={`flex-1 py-2.5 px-3 text-xs font-display uppercase tracking-wider font-semibold transition border-b-2 flex items-center justify-center gap-1.5 ${
                sidebarTab === 'threads'
                  ? 'border-white text-white bg-zinc-900/50'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Active ({threads.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('members')}
              className={`flex-1 py-2.5 px-3 text-xs font-display uppercase tracking-wider font-semibold transition border-b-2 flex items-center justify-center gap-1.5 ${
                sidebarTab === 'members'
                  ? 'border-white text-white bg-zinc-900/50'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Members ({(members || []).length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-3 bg-zinc-950 border-b border-zinc-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={sidebarTab === 'threads' ? 'Search active chats...' : 'Search registered members...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-body placeholder-zinc-500 focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
            {sidebarTab === 'threads' ? (
              filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs font-mono space-y-3">
                  <p>No active chat threads found.</p>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('members')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-display text-[11px] uppercase tracking-wider transition"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5 text-white" />
                    <span>Start Chat With a Member</span>
                  </button>
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const threadId = thread.id || thread.memberAlias || '';
                  const isSelected = (selectedThreadId || '').toLowerCase() === threadId.toLowerCase();
                  const hasUnread = (thread.unreadForAdminCount || 0) > 0;
                  const displayName = thread.memberAlias || thread.id || 'Member';

                  return (
                    <div
                      key={thread.id || thread.memberAlias}
                      onClick={() => {
                        setSelectedThreadId(threadId);
                        markChatThreadReadByAdmin(threadId).catch(console.warn);
                      }}
                      className={`p-3.5 cursor-pointer transition flex items-center gap-3 ${
                        isSelected
                          ? 'bg-zinc-900 border-l-2 border-l-white text-white'
                          : 'hover:bg-zinc-950 text-zinc-300'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-display text-xs uppercase tracking-wider text-white font-semibold truncate">
                            {displayName}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {formatMessageTime(thread.lastMessageAt || thread.updatedAt)}
                          </span>
                        </div>
                        <p className="text-xs font-body text-zinc-400 truncate">
                          {thread.lastSenderRole === 'admin' ? (
                            <span className="text-zinc-500 font-mono text-[11px] mr-1">You:</span>
                          ) : null}
                          {thread.lastMessageText || 'No messages yet'}
                        </p>
                      </div>

                      {hasUnread && (
                        <span className="w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold font-mono flex items-center justify-center shrink-0 shadow">
                          {thread.unreadForAdminCount}
                        </span>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              /* All Members Tab: allow opening chat with ANY member */
              filteredMembers.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs font-mono">
                  No members match your search.
                </div>
              ) : (
                filteredMembers.map((mem) => {
                  const memAlias = mem.alias || '';
                  const isSelected = (selectedThreadId || '').toLowerCase() === memAlias.toLowerCase();
                  const existingThread = threads.find(
                    (t) => (t.memberAlias || t.id || '').toLowerCase() === memAlias.toLowerCase()
                  );

                  return (
                    <div
                      key={mem.id || mem.alias}
                      onClick={() => {
                        setSelectedThreadId(memAlias);
                      }}
                      className={`p-3.5 cursor-pointer transition flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-zinc-900 border-l-2 border-l-white text-white'
                          : 'hover:bg-zinc-950 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-display text-xs uppercase tracking-wider text-white font-semibold block truncate">
                            {mem.alias}
                          </span>
                          {mem.name && (
                            <span className="text-[11px] font-body text-zinc-400 block truncate">
                              {mem.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {existingThread ? (
                          <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
                            Active Chat
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-white bg-white/10 hover:bg-white hover:text-black border border-white/20 px-2 py-0.5 rounded-full transition">
                            Message
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Window */}
        <div
          className={`${
            selectedThreadId ? 'flex' : 'hidden sm:flex'
          } flex-1 flex-col bg-black relative`}
        >
          {selectedThreadId ? (
            <>
              {/* Chat Top Bar */}
              <div className="h-16 px-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setSelectedThreadId(null)}
                    className="sm:hidden p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-xl transition"
                    title="Back to chats"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-display font-semibold text-white text-sm tracking-wider uppercase block leading-tight">
                      {selectedThreadId}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400 block leading-tight">
                      {selectedMemberAccount?.name ? `${selectedMemberAccount.name} • ` : ''}
                      Member Channel
                    </span>
                  </div>
                </div>

                {/* Delete Entire Chat from Everywhere Button */}
                <button
                  onClick={() => setThreadToDelete(selectedThreadId)}
                  title="Delete Chat From Everywhere"
                  className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-zinc-900 border border-zinc-800 transition flex items-center gap-1.5 font-display text-[11px] uppercase tracking-wider"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span className="hidden sm:inline">Delete Chat</span>
                </button>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative bg-black">
                {/* Security Pill */}
                <div className="flex justify-center my-2">
                  <div className="px-3.5 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono text-[10px] tracking-wider flex items-center gap-2 shadow-sm uppercase">
                    <Lock className="w-3 h-3 text-zinc-300 shrink-0" />
                    <span>Direct Member Comms • {selectedThreadId}</span>
                  </div>
                </div>

                {messages.length === 0 ? (
                  <div className="py-16 text-center text-zinc-500 text-xs font-mono space-y-2">
                    <p>No messages yet in this channel.</p>
                    <p className="text-[11px] text-zinc-600">
                      Send a message below to reach {selectedThreadId}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (!msg || !msg.id) return null;
                    const isAdmin = msg.senderRole === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex w-full ${isAdmin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[82%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed break-words shadow-md relative ${
                            isAdmin
                              ? 'bg-white text-black rounded-tr-sm'
                              : 'bg-zinc-900 border border-zinc-800 text-white rounded-tl-sm'
                          }`}
                        >
                          <p className={`whitespace-pre-wrap select-text font-body ${isAdmin ? 'text-black font-medium' : 'text-zinc-100'}`}>
                            {msg.text || ''}
                          </p>
                          <div
                            className={`mt-1 text-[10px] font-mono select-none flex ${
                              isAdmin ? 'justify-end text-zinc-600 font-semibold' : 'justify-start text-zinc-400'
                            }`}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Bar: Type text & Send button */}
              <div className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-800 shrink-0">
                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${selectedThreadId}...`}
                    disabled={isSending}
                    className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm font-body placeholder-zinc-500 focus:outline-none focus:border-white transition disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !(replyText || '').trim()}
                    className="w-12 h-12 rounded-xl bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black flex items-center justify-center shrink-0 transition disabled:opacity-40 cursor-pointer shadow-lg"
                  >
                    <Send className="w-5 h-5 ml-0.5 text-black" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs font-mono p-6 text-center space-y-3">
              <Users className="w-8 h-8 text-zinc-600" />
              <p>Select a member communication channel from the left panel.</p>
              <button
                type="button"
                onClick={() => setSidebarTab('members')}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-display text-xs uppercase tracking-wider transition"
              >
                Browse All Members
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal (Deletes from everywhere) */}
      {threadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-sm font-display uppercase tracking-wider font-bold text-white mb-2">
              Delete Chat with {threadToDelete}?
            </h3>
            <p className="text-xs font-body text-zinc-400 mb-6 leading-relaxed">
              This will permanently delete all messages and this chat thread from everywhere (including the member&apos;s view and database). This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setThreadToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-body transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteThread}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-display tracking-wider uppercase font-semibold transition disabled:opacity-50"
              >
                {isDeleting ? 'Erasing...' : 'Delete From Everywhere'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
