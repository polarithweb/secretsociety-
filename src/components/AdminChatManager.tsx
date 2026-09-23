import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  User,
  Search,
  CheckCheck,
  Trash2,
  Database,
  X,
  Radio,
  Lock
} from 'lucide-react';
import { MemberAccount, ChatThread, ChatMessage, ChatFirebaseConfig } from '../types';
import {
  subscribeToChatThreads,
  subscribeToChatMessages,
  sendChatMessage,
  markChatThreadReadByAdmin,
  deleteChatThread,
  getChatFirebaseConfig,
  saveChatFirebaseConfig,
  resetChatFirebaseConfig
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

  // Secondary Firebase Project Modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [chatConfig, setChatConfig] = useState<ChatFirebaseConfig>(getChatFirebaseConfig());
  const [customProjectId, setCustomProjectId] = useState(chatConfig.projectId);
  const [customApiKey, setCustomApiKey] = useState(chatConfig.apiKey);
  const [customAppId, setCustomAppId] = useState(chatConfig.appId);
  const [customAuthDomain, setCustomAuthDomain] = useState(chatConfig.authDomain || '');
  const [customDbId, setCustomDbId] = useState(chatConfig.firestoreDatabaseId || '');
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const unsubscribe = subscribeToChatThreads((updatedThreads) => {
      setThreads(updatedThreads);
      if (!selectedThreadId && updatedThreads.length > 0) {
        setSelectedThreadId(updatedThreads[0].id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedThreadId]);

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
    if (e) e.preventDefault();
    if (!selectedThreadId || !replyText.trim() || isSending) return;

    const textToSend = replyText.trim();
    setReplyText('');
    setIsSending(true);

    try {
      await sendChatMessage({
        threadId: selectedThreadId,
        memberAlias: selectedThreadId,
        memberName: selectedMemberAccount?.name,
        senderRole: 'admin',
        senderAlias: 'Admin',
        text: textToSend
      });
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      console.error('Failed to send reply:', err);
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
        const remaining = threads.filter((t) => t.id !== threadToDelete);
        setSelectedThreadId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete thread:', err);
    } finally {
      setThreadToDelete(null);
    }
  };

  const handleSaveSecondaryConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ChatFirebaseConfig = {
      projectId: customProjectId.trim(),
      apiKey: customApiKey.trim(),
      appId: customAppId.trim(),
      authDomain: customAuthDomain.trim() || `${customProjectId.trim()}.firebaseapp.com`,
      firestoreDatabaseId: customDbId.trim() || undefined,
      isCustomProject: true,
      chatInstanceLabel: 'Custom Secondary Firebase Project'
    };
    saveChatFirebaseConfig(updated);
    setConfigSuccessMsg('Secondary Firebase Project saved. Reloading connection...');
  };

  const handleResetSecondaryConfig = () => {
    resetChatFirebaseConfig();
    setConfigSuccessMsg('Reset to default dedicated instance. Reloading...');
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
      {/* Top Header */}
      <div className="h-14 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between text-[#e9edef] shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white text-base">Direct Member Chats</span>
          {threads.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#00a884] text-white font-medium">
              {threads.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowConfigModal(true)}
          className="px-2.5 py-1 rounded bg-[#2a3942] hover:bg-[#374248] text-[#d1d7db] text-xs font-mono transition flex items-center gap-1.5"
          title="Configure secondary Firebase project"
        >
          <Database className="w-3.5 h-3.5 text-[#00a884]" />
          <span>Firebase Project</span>
        </button>
      </div>

      {/* Main WhatsApp 2-Column Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Chat Threads List */}
        <div className="w-full sm:w-80 md:w-96 bg-[#111b21] border-r border-[#222d34] flex flex-col shrink-0">
          {/* Search Bar */}
          <div className="p-2.5 bg-[#111b21] border-b border-[#222d34]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or start new chat"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#202c33] text-white text-xs placeholder-[#8696a0] focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#202c33]">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-[#8696a0] text-xs">
                No chats yet. When a member logs into /#/chat and sends a message, it appears here.
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

        {/* Right Side: Active Chat Window */}
        <div className="hidden sm:flex flex-1 flex-col bg-[#0b141a] relative">
          {selectedThreadId ? (
            <>
              {/* WhatsApp Chat Top Bar */}
              <div className="h-16 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#374248] flex items-center justify-center text-[#aebac1]">
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

              {/* Message List */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-2"
                style={{
                  backgroundColor: '#0b141a',
                  backgroundImage:
                    'radial-gradient(circle at 50% 50%, rgba(17, 27, 33, 0.6) 0%, rgba(11, 20, 26, 0.95) 100%)'
                }}
              >
                {/* Notice pill */}
                <div className="flex justify-center my-2">
                  <div className="px-3 py-1.5 rounded-lg bg-[#182229] border border-[#222d34] text-[#ffd279] text-[11px] flex items-center gap-1.5 shadow-sm">
                    <Lock className="w-3 h-3 text-[#ffd279] shrink-0" />
                    <span>Direct text chat with {selectedThreadId}. Only text allowed.</span>
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
                        className={`max-w-[75%] px-3.5 py-2 rounded-lg text-[14px] leading-relaxed break-words shadow ${
                          isAdmin
                            ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                            : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap select-text">{msg.text}</p>
                        <div
                          className={`flex items-center gap-1 justify-end mt-1 text-[11px] text-[#8696a0] select-none`}
                        >
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

              {/* WhatsApp Bottom Input Bar: Only Text Input + Single Send Button */}
              <div className="p-3 bg-[#202c33] border-t border-[#222d34] shrink-0">
                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message"
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
            <div className="flex-1 flex flex-col items-center justify-center text-[#8696a0] text-sm">
              Select a chat from the left to start messaging.
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {threadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-white mb-2">Delete chat with {threadToDelete}?</h3>
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

      {/* Secondary Firebase Project Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#202c33] border border-[#2a3942] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#2a3942] mb-4">
              <h3 className="text-base font-semibold text-white">Chat Firebase Project</h3>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  setConfigSuccessMsg(null);
                }}
                className="p-1 text-[#8696a0] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {configSuccessMsg && (
              <div className="mb-4 p-2.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono">
                {configSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveSecondaryConfig} className="space-y-3">
              <div>
                <label className="block text-xs text-[#8696a0] mb-1 font-mono">Project ID</label>
                <input
                  type="text"
                  required
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#2a3942] text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8696a0] mb-1 font-mono">API Key</label>
                <input
                  type="text"
                  required
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#2a3942] text-white text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#8696a0] mb-1 font-mono">App ID</label>
                <input
                  type="text"
                  required
                  value={customAppId}
                  onChange={(e) => setCustomAppId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#2a3942] text-white text-xs focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-[#2a3942]">
                <button
                  type="button"
                  onClick={handleResetSecondaryConfig}
                  className="px-3 py-1.5 rounded bg-[#2a3942] hover:bg-[#374248] text-xs text-[#8696a0]"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
