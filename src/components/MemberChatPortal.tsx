import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  LogOut,
  Shield,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { SocietySettings, MemberAccount, ChatMessage } from '../types';
import { getMemberAccounts, saveMemberAccount } from '../lib/firebase';
import {
  sendChatMessage,
  subscribeToChatMessages,
  markChatThreadReadByMember
} from '../lib/firebaseChat';

interface MemberChatPortalProps {
  settings: SocietySettings;
  onBack: () => void;
}

export const MemberChatPortal: React.FC<MemberChatPortalProps> = ({ settings, onBack }) => {
  const [currentMember, setCurrentMember] = useState<MemberAccount | null>(() => {
    try {
      const saved =
        sessionStorage.getItem('secretsociety_chat_member') ||
        sessionStorage.getItem('secretsociety_member_session') ||
        localStorage.getItem('secretsociety_member_session');
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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!currentMember) return;

    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeToChatMessages(currentMember.alias, (msgs) => {
        setMessages(msgs);
        setTimeout(() => scrollToBottom('auto'), 50);
      });
      markChatThreadReadByMember(currentMember.alias).catch(console.warn);
    } catch (err) {
      console.warn('Chat subscription error:', err);
    }

    return () => {
      unsubscribe();
    };
  }, [currentMember]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const cleanAlias = aliasInput.trim();
    const cleanPass = passwordInput.trim();

    if (!cleanAlias || !cleanPass) {
      setAuthError('Alias and password required.');
      return;
    }

    setIsAuthenticating(true);
    try {
      const accounts = await getMemberAccounts();
      const matched = accounts.find(
        (acc) =>
          (acc.alias || '').trim().toLowerCase() === cleanAlias.toLowerCase() &&
          (acc.password || '').trim() === cleanPass
      );

      if (!matched) {
        setAuthError('Invalid alias or password.');
        setIsAuthenticating(false);
        return;
      }

      if (matched.isActive === false) {
        setAuthError('Account suspended.');
        setIsAuthenticating(false);
        return;
      }

      const updatedAccount: MemberAccount = {
        ...matched,
        lastLoginAt: new Date().toISOString()
      };
      saveMemberAccount(updatedAccount).catch(console.warn);

      sessionStorage.setItem('secretsociety_chat_member', JSON.stringify(updatedAccount));
      sessionStorage.setItem('secretsociety_member_session', JSON.stringify(updatedAccount));
      try {
        localStorage.setItem('secretsociety_member_session', JSON.stringify(updatedAccount));
      } catch {}
      setCurrentMember(updatedAccount);
    } catch {
      setAuthError('Unable to connect. Please retry.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('secretsociety_chat_member');
    sessionStorage.removeItem('secretsociety_member_session');
    try {
      localStorage.removeItem('secretsociety_member_session');
    } catch {}
    setCurrentMember(null);
    setMessages([]);
    setAliasInput('');
    setPasswordInput('');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const textToSend = inputText.trim();
    if (!currentMember || !textToSend || isSending) return;

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
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send message:', err);
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateIso: string) => {
    try {
      const d = new Date(dateIso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // 1. Clean Minimal Login View (Black & White Luxury Theme)
  if (!currentMember) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center p-4 selection:bg-white selection:text-black">
        <div className="w-full max-w-sm bg-zinc-950 rounded-2xl p-8 sm:p-9 shadow-2xl border border-zinc-800">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-4 shadow-inner">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-lg font-display uppercase tracking-[0.25em] font-bold text-white text-center">
              Member Portal
            </h1>
            <p className="text-xs font-editorial italic text-zinc-400 text-center mt-1">
              Direct Secure Channel
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-zinc-900 border border-red-500/40 text-red-300 text-xs text-center font-mono">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                required
                autoFocus
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="Alias"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white text-white text-sm font-body placeholder-zinc-500 focus:outline-none transition shadow-inner"
              />
            </div>

            <div>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-white text-white text-sm font-body placeholder-zinc-500 focus:outline-none transition shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-display text-xs tracking-[0.2em] uppercase font-bold transition shadow-lg cursor-pointer disabled:opacity-50 mt-2"
            >
              {isAuthenticating ? 'Authenticating...' : 'Enter Channel'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-zinc-900 text-center">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-zinc-500 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Member Hub (/#/member)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Chat View (Black & White Luxury Theme - Zero Ticks, No Green)
  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col justify-between overflow-hidden selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="h-16 px-5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between z-20 shrink-0 select-none shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            title="Return to Member Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 overflow-hidden shrink-0">
            {settings.sigilImage ? (
              <img
                src={settings.sigilImage}
                alt="Sigil"
                className="w-full h-full object-cover"
              />
            ) : (
              <Shield className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-display font-semibold text-white text-sm tracking-[0.15em] uppercase">
              Admin
            </span>
            <span className="font-mono text-[10px] tracking-wider text-zinc-400 uppercase">
              Secure Direct Comms
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="#/member"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Member Hub</span>
          </a>
          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative bg-black">
        {/* Subtle Security Pill */}
        <div className="flex justify-center my-2">
          <div className="px-3.5 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono text-[10px] tracking-wider flex items-center gap-2 shadow-sm text-center uppercase">
            <Lock className="w-3 h-3 text-zinc-300 shrink-0" />
            <span>Encrypted Direct Text Channel</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 font-mono text-xs space-y-2">
            <p>No messages in this channel.</p>
            <p className="text-[11px] text-zinc-600">
              Type below to communicate directly with Admin.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.senderRole === 'admin';
            return (
              <div
                key={msg.id}
                className={`flex w-full ${isAdmin ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[82%] sm:max-w-[65%] px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed break-words shadow-md relative ${
                    isAdmin
                      ? 'bg-zinc-900 border border-zinc-800 text-white rounded-tl-sm'
                      : 'bg-white text-black rounded-tr-sm'
                  }`}
                >
                  <p className={`whitespace-pre-wrap select-text font-body ${isAdmin ? 'text-zinc-100' : 'text-black font-medium'}`}>
                    {msg.text}
                  </p>
                  {/* Clean timestamp with zero tick marks */}
                  <div
                    className={`mt-1 text-[10px] font-mono select-none flex ${
                      isAdmin ? 'justify-start text-zinc-400' : 'justify-end text-zinc-600 font-semibold'
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

      {/* Bottom Input Bar */}
      <footer className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2 z-20 shrink-0">
        <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm font-body placeholder-zinc-500 focus:outline-none focus:border-white transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="w-12 h-12 rounded-xl bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black flex items-center justify-center shrink-0 transition disabled:opacity-40 cursor-pointer shadow-lg"
          >
            <Send className="w-5 h-5 ml-0.5 text-black" />
          </button>
        </form>
      </footer>
    </div>
  );
};
