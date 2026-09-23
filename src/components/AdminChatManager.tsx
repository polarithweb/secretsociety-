import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  User,
  Shield,
  Clock,
  Search,
  CheckCheck,
  Database,
  Trash2,
  Settings,
  Radio,
  Sparkles,
  Lock,
  RefreshCw,
  X,
  ExternalLink,
  Info
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

  // Subscribe to real-time chat threads
  useEffect(() => {
    const unsubscribe = subscribeToChatThreads((updatedThreads) => {
      setThreads(updatedThreads);

      // If no thread is selected yet and threads exist, auto-select first thread with unread or most recent
      if (!selectedThreadId && updatedThreads.length > 0) {
        setSelectedThreadId(updatedThreads[0].id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedThreadId]);

  // Subscribe to messages of selected thread
  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToChatMessages(selectedThreadId, (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollToBottom('smooth'), 100);
    });

    // Mark as read by admin
    markChatThreadReadByAdmin(selectedThreadId).catch(console.warn);

    return () => {
      unsubscribe();
    };
  }, [selectedThreadId]);

  // Find member details for selected thread
  const selectedMemberAccount = members.find(
    (m) => m.alias.toLowerCase() === (selectedThreadId || '').toLowerCase()
  );

  // Send admin reply
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
        senderAlias: 'Council Administration',
        text: textToSend
      });
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      console.error('Failed to send admin reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Delete thread
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

  // Save custom secondary Firebase Project
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

  // Filter threads by search query
  const filteredThreads = threads.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.memberAlias.toLowerCase().includes(q) ||
      (t.memberName && t.memberName.toLowerCase().includes(q)) ||
      t.lastMessageText.toLowerCase().includes(q)
    );
  });

  // Calculate total unread count across all threads
  const totalUnreadCount = threads.reduce((acc, t) => acc + (t.unreadForAdminCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner and Secondary Firebase Node Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-stone-900/80 border border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base font-bold text-white tracking-wide">
                Direct Member Comms (Admin Only)
              </h2>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-stone-950">
                  {totalUnreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-stone-400">
              Direct, 1-on-1 text communication between Council Administration and individual members.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 hover:text-white font-mono text-xs transition flex items-center gap-1.5 shrink-0"
          >
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>Chat Firebase Project</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Chat Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-stone-950/80 border border-stone-800/90 rounded-xl overflow-hidden shadow-2xl min-h-[600px]">
        {/* Left Column: Member Threads List */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-stone-800 flex flex-col bg-stone-950">
          {/* Threads Search */}
          <div className="p-3 border-b border-stone-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member threads..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700/80 text-white font-mono text-xs placeholder:text-stone-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Threads List */}
          <div className="flex-1 overflow-y-auto max-h-[260px] lg:max-h-[520px] divide-y divide-stone-900">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-stone-500 font-mono text-xs">
                {threads.length === 0 ? (
                  <>
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-stone-700" />
                    <p className="text-stone-400 font-semibold mb-1">No Active Threads</p>
                    <p className="text-[11px] text-stone-600">
                      When members log into <code className="text-amber-400">/#/chat</code> with their alias and send a message, their thread appears here.
                    </p>
                  </>
                ) : (
                  'No matching member threads found'
                )}
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
                    className={`p-3.5 cursor-pointer transition flex items-start justify-between gap-2 group ${
                      isSelected
                        ? 'bg-amber-950/30 border-l-2 border-amber-400 text-white'
                        : 'hover:bg-stone-900/60 text-stone-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                          hasUnread
                            ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                            : isSelected
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : 'bg-stone-900 text-stone-400 border border-stone-800'
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-mono text-xs font-bold text-white truncate">
                            {thread.memberAlias}
                          </span>
                          <span className="text-[10px] font-mono text-stone-500 shrink-0">
                            {thread.lastMessageAt
                              ? new Date(thread.lastMessageAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : ''}
                          </span>
                        </div>

                        {thread.memberName && (
                          <div className="text-[11px] font-mono text-stone-400 truncate mb-1">
                            {thread.memberName}
                          </div>
                        )}

                        <p className="text-xs text-stone-400 truncate font-sans line-clamp-1">
                          {thread.lastSenderRole === 'admin' ? (
                            <span className="text-amber-400/90 font-mono text-[11px]">You: </span>
                          ) : null}
                          {thread.lastMessageText}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {hasUnread && (
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-stone-950 font-mono text-[10px] font-bold flex items-center justify-center shadow-md">
                          {thread.unreadForAdminCount}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setThreadToDelete(thread.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-500 hover:text-red-400 transition"
                        title="Delete Thread"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Thread Messages & Reply Input */}
        <div className="lg:col-span-8 flex flex-col bg-stone-950/60 justify-between">
          {selectedThreadId ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 px-5 border-b border-stone-800 bg-stone-900/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-stone-900 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono text-sm font-bold text-white">
                        {selectedThreadId}
                      </h3>
                      {selectedMemberAccount?.role && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-stone-800 border border-stone-700 text-amber-300">
                          {selectedMemberAccount.role}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-stone-400">
                      {selectedMemberAccount?.name ? `${selectedMemberAccount.name} • ` : ''}
                      Direct 1-on-1 Channel with Council Administration
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setThreadToDelete(selectedThreadId)}
                    className="p-1.5 rounded hover:bg-red-950/50 text-stone-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition text-xs font-mono flex items-center gap-1"
                    title="Delete Thread and History"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[360px] max-h-[460px]">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500">
                    <Shield className="w-10 h-10 text-stone-700 mb-2" />
                    <p className="font-mono text-xs text-stone-400 font-semibold mb-1">
                      No Messages Exchanged Yet
                    </p>
                    <p className="font-mono text-[11px] text-stone-600 max-w-sm">
                      Send a direct inquiry or directive to member <strong>{selectedThreadId}</strong> using the reply console below.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAdmin = msg.senderRole === 'admin';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-mono text-stone-400">
                          {isAdmin ? (
                            <>
                              <Shield className="w-3 h-3 text-amber-400" />
                              <span className="text-amber-400 font-semibold uppercase">
                                Council Administration (You)
                              </span>
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 text-stone-400" />
                              <span className="text-stone-300 font-semibold">{msg.memberAlias}</span>
                            </>
                          )}
                          <span className="text-stone-600">•</span>
                          <span className="text-stone-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-lg rounded-xl p-3.5 shadow-md break-words font-sans text-sm leading-relaxed ${
                            isAdmin
                              ? 'bg-amber-950/50 border border-amber-500/40 text-amber-100 rounded-tr-none'
                              : 'bg-stone-900 border border-stone-700 text-stone-100 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Reply Box: Strictly Text Only */}
              <div className="p-3 sm:p-4 bg-stone-900/90 border-t border-stone-800">
                <form onSubmit={handleSendReply} className="flex items-end gap-2">
                  <div className="flex-1">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Reply as Council Administration to ${selectedThreadId}... (Enter to send, Shift+Enter for newline)`}
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-white font-sans text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending || !replyText.trim()}
                    className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-mono text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-amber-500 cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Dispatch</span>
                  </button>
                </form>

                <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-stone-500">
                  <span className="flex items-center gap-1 text-stone-400">
                    <Lock className="w-3 h-3 text-amber-400/70" />
                    Text-only channel. Photos and attachments strictly forbidden.
                  </span>
                  <span className="text-stone-500">
                    Target: <span className="text-amber-400 font-bold">{selectedThreadId}</span>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-stone-500">
              <MessageSquare className="w-12 h-12 text-stone-700 mb-3" />
              <h3 className="font-serif text-lg font-bold text-stone-300 mb-1">
                No Member Thread Selected
              </h3>
              <p className="font-mono text-xs text-stone-500 max-w-sm">
                Select an existing member conversation from the left panel or wait for a member to initiate contact at <code className="text-amber-400">/#/chat</code>.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {threadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-red-500/40 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Delete Member Chat Thread?
            </h3>
            <p className="text-xs font-mono text-stone-400 mb-6">
              This will permanently delete all communications with member{' '}
              <strong className="text-white">{threadToDelete}</strong> from the Dedicated Chat Firebase instance.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setThreadToDelete(null)}
                className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteThread}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs uppercase font-bold"
              >
                Delete Thread
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Firebase Project Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif text-base font-bold text-white">
                  Chat Firebase Project Node
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  setConfigSuccessMsg(null);
                }}
                className="p-1 rounded text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-stone-400 mb-4 leading-relaxed">
              This chat system utilizes an independent Firebase Project node separated from the primary candidate portal. You can view or customize the external Firebase project credentials below.
            </p>

            {configSuccessMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{configSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSecondaryConfig} className="space-y-3">
              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-stone-300 mb-1">
                  Firebase Project ID
                </label>
                <input
                  type="text"
                  required
                  value={customProjectId}
                  onChange={(e) => setCustomProjectId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-stone-300 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  required
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-stone-300 mb-1">
                  App ID
                </label>
                <input
                  type="text"
                  required
                  value={customAppId}
                  onChange={(e) => setCustomAppId(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block font-mono text-xs uppercase tracking-wider text-stone-300 mb-1">
                  Auth Domain (Optional)
                </label>
                <input
                  type="text"
                  value={customAuthDomain}
                  onChange={(e) => setCustomAuthDomain(e.target.value)}
                  placeholder="e.g. project-id.firebaseapp.com"
                  className="w-full px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-700 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={handleResetSecondaryConfig}
                  className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white font-mono text-xs transition"
                >
                  Reset to Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 font-mono text-xs"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-mono text-xs uppercase transition"
                  >
                    Save & Connect
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
