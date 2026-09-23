import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  Search,
  CheckCheck,
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
      // Restore draft text so admin doesn't lose it
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
    <div className="w-full bg-[#111b21] rounded-2xl overflow-hidden border border-[#222d34] shadow-2xl flex flex-col h-[750px] max-h-[85vh]">
      {/* WhatsApp Header */}
      <div className="h-14 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between text-[#e9edef] shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-white text-base">Direct Member Chats</span>
          {threads.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#00a884] text-white font-medium">
              {threads.length}
            </span>
          )}
        </div>
      </div>

      {/* Main WhatsApp 2-Column Interface (Responsive for Mobile & Desktop) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Threads List (Visible on desktop, or on mobile when no chat is open) */}
        <div
          className={`${
            selectedThreadId ? 'hidden sm:flex' : 'flex'
          } w-full sm:w-80 md:w-96 bg-[#111b21] border-r border-[#222d34] flex-col shrink-0`}
        >
          {/* Search Bar */}
          <div className="p-2.5 bg-[#111b21] border-b border-[#222d34]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#202c33] text-white text-xs placeholder-[#8696a0] focus:outline-none"
              />
            </div>
          </div>

          {/* List of Member Threads */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0] text-xs">
                No chats yet. When a member sends a message at <code className="text-[#00a884]">/#/chat</code>, it appears here.
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
                    className={`p-3 cursor-pointer transition flex items-center gap-3 ${
                      isSelected
                        ? 'bg-[#2a3942] text-white'
                        : 'hover:bg-[#202c33] text-[#d1d7db]'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-[#374248] text-[#aebac1] flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-medium text-sm text-white truncate">
                          {thread.memberAlias}
                        </span>
                        <span className="text-[11px] text-[#8696a0] shrink-0">
                          {formatMessageTime(thread.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-xs text-[#8696a0] truncate">
                        {thread.lastSenderRole === 'admin' ? 'You: ' : ''}
                        {thread.lastMessageText}
                      </p>
                    </div>

                    {hasUnread && (
                      <span className="w-5 h-5 rounded-full bg-[#00a884] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                        {thread.unreadForAdminCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Window (Visible on desktop, or on mobile when a chat is open) */}
        <div
          className={`${
            selectedThreadId ? 'flex' : 'hidden sm:flex'
          } flex-1 flex-col bg-[#0b141a] relative`}
        >
          {selectedThreadId ? (
            <>
              {/* WhatsApp Chat Top Bar */}
              <div className="h-16 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setSelectedThreadId(null)}
                    className="sm:hidden p-1.5 -ml-1 text-[#aebac1] hover:text-white rounded-full transition"
                    title="Back to chats"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-[#374248] flex items-center justify-center text-[#aebac1] shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-medium text-white text-base leading-tight block">
                      {selectedThreadId}
                    </span>
                    <span className="text-xs text-[#8696a0] leading-tight block">
                      {selectedMemberAccount?.name ? `${selectedMemberAccount.name} • ` : ''}
                      Member
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setThreadToDelete(selectedThreadId)}
                  title="Delete Chat"
                  className="p-2 rounded-full text-[#8696a0] hover:text-red-400 hover:bg-[#374248] transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Message History */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{
                  backgroundColor: '#0b141a',
                  backgroundImage:
                    'radial-gradient(circle at 50% 50%, rgba(17, 27, 33, 0.6) 0%, rgba(11, 20, 26, 0.95) 100%)'
                }}
              >
                {/* Privacy indicator */}
                <div className="flex justify-center my-2">
                  <div className="px-3 py-1.5 rounded-lg bg-[#182229] border border-[#222d34] text-[#ffd279] text-[11px] flex items-center gap-1.5 shadow-sm">
                    <Lock className="w-3 h-3 text-[#ffd279] shrink-0" />
                    <span>Direct chat with {selectedThreadId}. Text only.</span>
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
                        className={`max-w-[82%] sm:max-w-[70%] px-3.5 py-2 rounded-lg text-[14px] leading-relaxed break-words shadow ${
                          isAdmin
                            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                            : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap select-text">{msg.text}</p>
                        <div className="flex items-center gap-1 justify-end mt-1 text-[11px] text-[#8696a0] select-none">
                          <span>{formatMessageTime(msg.createdAt)}</span>
                          {isAdmin && (
                            <CheckCheck
                              className={`w-3.5 h-3.5 ${
                                msg.readByMember ? 'text-[#53bdeb]' : 'text-[#8696a0]'
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* WhatsApp Input Bar: Type text & Send button */}
              <div className="p-3 bg-[#202c33] border-t border-[#222d34] shrink-0">
                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 rounded-lg bg-[#2a3942] text-white text-sm placeholder-[#8696a0] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                    className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#02906f] active:bg-[#007a5e] text-white flex items-center justify-center shrink-0 transition disabled:opacity-40 cursor-pointer shadow-md"
                  >
                    <Send className="w-5 h-5 ml-0.5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0] text-sm p-4 text-center">
              Select a chat from the left to start messaging.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {threadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">
              Delete chat with {threadToDelete}?
            </h3>
            <p className="text-xs text-[#8696a0] mb-6">
              Messages will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setThreadToDelete(null)}
                className="px-4 py-2 rounded-lg bg-[#2a3942] hover:bg-[#374248] text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteThread}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
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
