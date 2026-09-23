import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Send,
  Lock,
  User,
  KeyRound,
  LogOut,
  AlertCircle,
  Clock,
  Radio,
  Sparkles,
  ArrowLeft,
  CheckCheck
} from 'lucide-react';
import { SocietySettings, MemberAccount, ChatMessage } from '../types';
import { getMemberAccounts, saveMemberAccount } from '../lib/firebase';
import {
  sendChatMessage,
  subscribeToChatMessages,
  markChatThreadReadByMember,
  getChatFirebaseConfig
} from '../lib/firebaseChat';

interface MemberChatPortalProps {
  settings: SocietySettings;
  onBack: () => void;
}

export const MemberChatPortal: React.FC<MemberChatPortalProps> = ({ settings, onBack }) => {
  // Session storage for logged in member
  const [currentMember, setCurrentMember] = useState<MemberAccount | null>(() => {
    try {
      const saved = sessionStorage.getItem('secretsociety_chat_member');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Login form state
  const [aliasInput, setAliasInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Chat message state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chat project config details
  const chatConfig = getChatFirebaseConfig();

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Real-time subscription to member's chat thread with admin
  useEffect(() => {
    if (!currentMember) return;

    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeToChatMessages(currentMember.alias, (msgs) => {
        setMessages(msgs);
        setTimeout(() => scrollToBottom('smooth'), 100);
      });
      // Mark as read by member
      markChatThreadReadByMember(currentMember.alias).catch(console.warn);
    } catch (err) {
      console.warn('Chat subscription error:', err);
    }

    return () => {
      unsubscribe();
    };
  }, [currentMember]);

  // Handle member login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanAlias = aliasInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanAlias || !cleanPass) {
      setAuthError('Both Member Alias and Passphrase are mandatory.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const accounts = await getMemberAccounts();
      const matched = accounts.find(
        (acc) =>
          acc.alias.trim().toLowerCase() === cleanAlias.toLowerCase() &&
          acc.password.trim() === cleanPass
      );

      if (!matched) {
        setAuthError('Authorization failed: Alias or Access Key not recognized by Council records.');
        setIsAuthenticating(false);
        return;
      }

      if (matched.isActive === false) {
        setAuthError('Membership account is suspended by Council decree.');
        setIsAuthenticating(false);
        return;
      }

      // Update last login timestamp
      const updatedAccount: MemberAccount = {
        ...matched,
        lastLoginAt: new Date().toISOString()
      };
      saveMemberAccount(updatedAccount).catch(console.warn);

      sessionStorage.setItem('secretsociety_chat_member', JSON.stringify(updatedAccount));
      setCurrentMember(updatedAccount);
    } catch (err) {
      console.error('Authentication error:', err);
      setAuthError('Authentication service unreachable. Please retry.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('secretsociety_chat_member');
    setCurrentMember(null);
    setMessages([]);
    setAliasInput('');
    setPasswordInput('');
  };

  // Handle send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentMember || !inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await sendChatMessage({
        threadId: currentMember.alias,
        memberAlias: currentMember.alias,
        memberName: currentMember.name,
        senderRole: 'member',
        senderAlias: currentMember.alias,
        text: textToSend
      });
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-stone-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200">
      {/* Background with Ambient Overlay */}
      {settings.backgroundImage && (
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-40 z-0 transition-opacity duration-1000"
          style={{ backgroundImage: `url(${settings.backgroundImage})` }}
        />
      )}
      <div className="fixed inset-0 bg-gradient-to-b from-black/85 via-black/90 to-black pointer-events-none z-0" />

      {/* Main Container */}
      <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-6 sm:px-6">
        {/* Navigation Bar */}
        <header className="flex items-center justify-between border-b border-stone-800/80 pb-4 mb-6">
          <div className="flex items-center gap-3">
            {settings.sigilImage ? (
              <img
                src={settings.sigilImage}
                alt="Society Sigil"
                className="w-10 h-10 object-contain rounded-full border border-amber-500/30 p-1 bg-black/60 shadow-lg shadow-black"
              />
            ) : (
              <div className="w-10 h-10 rounded-full border border-amber-500/30 bg-stone-900/80 flex items-center justify-center text-amber-400 shadow-lg shadow-black">
                <Shield className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-amber-400 font-semibold tracking-widest uppercase flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Council Direct Comms
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-stone-900 border border-stone-700 text-stone-300">
                  Admin Only
                </span>
              </div>
              <h1 className="font-serif text-lg font-bold text-stone-100 tracking-wide">
                Direct Inquiry Channel
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="px-3 py-1.5 rounded bg-stone-900/80 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white font-mono text-xs transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Main Portal
            </button>
            {currentMember && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-300 hover:text-red-100 font-mono text-xs transition flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            )}
          </div>
        </header>

        {/* View 1: Member Authentication Gate */}
        {!currentMember ? (
          <div className="flex-1 flex items-center justify-center my-auto">
            <div className="w-full max-w-md bg-stone-950/85 backdrop-blur-md border border-stone-800 rounded-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

              <div className="text-center mb-6">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-stone-900/90 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                  <Lock className="w-7 h-7" />
                </div>
                <h2 className="font-serif text-xl font-bold text-white tracking-wide">
                  Member Channel Gate
                </h2>
                <p className="text-xs font-mono text-stone-400 mt-1 max-w-xs mx-auto">
                  Provide your assigned Member Alias & Passphrase configured in the Council Records.
                </p>
              </div>

              {authError && (
                <div className="mb-5 p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-200 text-xs font-mono flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-stone-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400/80" />
                    Member Alias
                  </label>
                  <input
                    type="text"
                    required
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    placeholder="e.g. AGENT_NOVA or SHADOW_4"
                    className="w-full px-3 py-2 rounded-lg bg-stone-900/90 border border-stone-700 text-white font-mono text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                  />
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-stone-300 mb-1 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400/80" />
                    Member Passphrase
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter security key..."
                    className="w-full px-3 py-2 rounded-lg bg-stone-900/90 border border-stone-700 text-white font-mono text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold font-mono text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isAuthenticating ? (
                      <>
                        <Radio className="w-4 h-4 animate-spin" />
                        Verifying Clearance...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Connect With Council Admin
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between text-[11px] font-mono text-stone-500">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400" />
                  Secondary Comms Database
                </span>
                <span className="truncate max-w-[140px] text-stone-400">
                  {chatConfig.projectId}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* View 2: Active Member Chat Screen */
          <div className="flex-1 flex flex-col bg-stone-950/80 backdrop-blur-md border border-stone-800/90 rounded-xl overflow-hidden shadow-2xl">
            {/* Active Session Header Banner */}
            <div className="px-4 py-3 bg-stone-900/70 border-b border-stone-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-stone-300">
                  Channel Active with{' '}
                  <span className="text-amber-400 font-semibold uppercase">
                    Council Administration (Admin Only)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-stone-400">
                <span>
                  Member: <strong className="text-white">{currentMember.alias}</strong>
                  {currentMember.role && (
                    <span className="text-stone-500 ml-1">({currentMember.role})</span>
                  )}
                </span>
                <span className="hidden sm:inline-block text-stone-600">|</span>
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400/90">
                  <Radio className="w-3 h-3" />
                  Dedicated Comms Project
                </span>
              </div>
            </div>

            {/* Scrollable Message History Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[380px] max-h-[58vh]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-500">
                  <div className="w-12 h-12 rounded-full border border-stone-800 bg-stone-900/50 flex items-center justify-center text-stone-400 mb-3">
                    <Shield className="w-6 h-6 text-amber-500/60" />
                  </div>
                  <p className="font-mono text-sm text-stone-300 font-semibold mb-1">
                    Direct Channel Open with Council Administration
                  </p>
                  <p className="font-mono text-xs text-stone-500 max-w-md">
                    You are connected directly to Council Admin. No other members can view or participate in this thread. Direct your official text inquiry below.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.senderRole === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-mono text-stone-400">
                        {isAdmin ? (
                          <>
                            <Shield className="w-3 h-3 text-amber-400" />
                            <span className="text-amber-400 font-semibold uppercase tracking-wider">
                              Council Administration
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-stone-300 font-semibold">
                              {currentMember.alias}
                            </span>
                            <span className="text-stone-500 text-[10px]">(You)</span>
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
                        className={`max-w-[85%] sm:max-w-xl rounded-xl p-3.5 shadow-md break-words font-sans text-sm leading-relaxed ${
                          isAdmin
                            ? 'bg-amber-950/40 border border-amber-500/30 text-amber-100 rounded-tl-none'
                            : 'bg-stone-900 border border-stone-700 text-stone-100 rounded-tr-none'
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

            {/* Input Footer: Strictly Text Only (Photos Forbidden) */}
            <div className="p-3 sm:p-4 bg-stone-900/90 border-t border-stone-800">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type encrypted message to Council Administration... (Enter to send, Shift+Enter for newline)"
                    className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-white font-sans text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold font-mono text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:bg-amber-500 cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>

              {/* Protocol Notice */}
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-stone-500">
                <span className="flex items-center gap-1 text-stone-400">
                  <Lock className="w-3 h-3 text-amber-400/70" />
                  Text-only encrypted transmission. Image and file uploads prohibited.
                </span>
                <span className="hidden sm:inline text-stone-600">
                  Endpoint: {chatConfig.projectId}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
