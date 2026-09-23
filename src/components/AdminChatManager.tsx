import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  Search,
  Trash2,
  Lock,
  ArrowLeft
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
}

export const AdminChatManager: React.FC<AdminChatManagerProps> = ({ members }) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Subscribe to all chat threads
  useEffect(() => {
    const unsubscribe = subscribeToChatThreads((updatedThreads) => {
      setThreads(updatedThreads);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Subscribe to messages of selected thread
  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToChatMessages(selectedThreadId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollToBottom('auto'), 50);
    });

    markChatThreadReadByAdmin(selectedThreadId).catch(console.warn);

    return () => {
      unsubscribe();
    };
  }, [selectedThreadId]);

  const selectedMemberAccount = members.find(
    (m) => m.alias.toLowerCase() === (selectedThreadId || '').toLowerCase()
  );

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = replyText.trim();
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
      setReplyText(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleConfirmDeleteThread = async () => {
    if (!threadToDelete) return;
    try {
      await deleteChatThread(threadToDelete);
      if (selectedThreadId === threadToDelete) {
        setSelectedThreadId(null);
      }
    } catch (err) {
      console.error('Failed to delete thread:', err);
    } finally {
      setThreadToDelete(null);
    }
  };

  const filteredThreads = threads.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.memberAlias.toLowerCase().includes(q) ||
      (t.memberName && t.memberName.toLowerCase().includes(q)) ||
      t.lastMessageText.toLowerCase().includes(q)
    );
  });

  const formatMessageTime = (dateIso: string) => {
    try {
      const d = new Date(dateIso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="w-full bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col h-[750px] max-h-[85vh] selection:bg-white selection:text-black">
      {/* Top Header */}
      <div className="h-14 px-5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display tracking-[0.15em] text-sm uppercase font-bold text-white">
            Direct Member Communications
          </span>
          {threads.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-white text-black font-bold">
              {threads.length}
            </span>
          )}
        </div>
      </div>

      {/* Main 2-Column Interface (Responsive for Mobile & Desktop) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Threads List */}
        <div
          className={`${
            selectedThreadId ? 'hidden sm:flex' : 'flex'
          } w-full sm:w-80 md:w-96 bg-black border-r border-zinc-800 flex-col shrink-0`}
        >
          {/* Search Bar */}
          <div className="p-3 bg-zinc-950 border-b border-zinc-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member chats..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-body placeholder-zinc-500 focus:outline-none focus:border-white transition"
              />
            </div>
          </div>

          {/* List of Member Threads */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs font-mono">
                No active transmissions. When a member messages via <code className="text-white">/#/chat</code>, it appears here.
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThreadId === thread.id;
                const hasUnread = (thread.unreadForAdminCount || 0) > 0;

                return (
                  <div
                    key={thread.id}
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      markChatThreadReadByAdmin(thread.id).catch(console.warn);
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
                          {thread.memberAlias}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          {formatMessageTime(thread.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs font-body text-zinc-400 truncate">
                        {thread.lastSenderRole === 'admin' ? (
                          <span className="text-zinc-500 font-mono text-[11px] mr-1">You:</span>
                        ) : null}
                        {thread.lastMessageText}
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
                      Member Account
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setThreadToDelete(selectedThreadId)}
                  title="Delete Thread"
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-zinc-900 transition"
                >
                  <Trash2 className="w-4 h-4" />
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

                {messages.map((msg) => {
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
                          {msg.text}
                        </p>
                        {/* Clean timestamp with zero tick marks */}
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
                })}
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
                    onKeyDown={handleKeyDown}
                    placeholder="Type a reply..."
                    className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm font-body placeholder-zinc-500 focus:outline-none focus:border-white transition"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                    className="w-12 h-12 rounded-xl bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black flex items-center justify-center shrink-0 transition disabled:opacity-40 cursor-pointer shadow-lg"
                  >
                    <Send className="w-5 h-5 ml-0.5 text-black" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs font-mono p-4 text-center">
              Select a member communication channel from the left panel.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {threadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-sm font-display uppercase tracking-wider font-bold text-white mb-2">
              Delete Thread with {threadToDelete}?
            </h3>
            <p className="text-xs font-body text-zinc-400 mb-6">
              All messages in this direct line will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setThreadToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-body transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteThread}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-display tracking-wider uppercase font-semibold transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
