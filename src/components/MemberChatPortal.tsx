import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  LogOut,
  Shield,
  CheckCheck,
  Lock
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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
          acc.alias.trim().toLowerCase() === cleanAlias.toLowerCase() &&
          acc.password.trim() === cleanPass
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
      setCurrentMember(updatedAccount);
    } catch {
      setAuthError('Unable to connect. Please retry.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('secretsociety_chat_member');
    setCurrentMember(null);
    setMessages([]);
    setAliasInput('');
    setPasswordInput('');
  };

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
      console.error('Failed to send message:', err);
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

  // 1. Clean Minimal Login View
  if (!currentMember) {
    return (
      <div className="fixed inset-0 bg-[#111b21] text-[#e9edef] flex items-center justify-center p-4 selection:bg-[#00a884] selection:text-white">
        <div className="w-full max-w-sm bg-[#202c33] rounded-2xl p-6 sm:p-8 shadow-2xl border border-[#2a3942]">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-[#00a884] mb-3">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-semibold text-white tracking-wide">
              Chat Login
            </h1>
          </div>

          {authError && (
            <div className="mb-4 p-2.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-200 text-xs text-center font-mono">
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
                className="w-full px-4 py-3 rounded-lg bg-[#2a3942] border border-transparent focus:border-[#00a884] text-white text-sm placeholder-[#8696a0] focus:outline-none transition"
              />
            </div>

            <div>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-lg bg-[#2a3942] border border-transparent focus:border-[#00a884] text-white text-sm placeholder-[#8696a0] focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 px-4 rounded-lg bg-[#00a884] hover:bg-[#02906f] active:bg-[#007a5e] text-white font-medium text-sm transition shadow cursor-pointer disabled:opacity-50 mt-2"
            >
              {isAuthenticating ? 'Connecting...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Clean WhatsApp Chat View
  return (
    <div className="fixed inset-0 bg-[#0b141a] text-[#e9edef] flex flex-col justify-between overflow-hidden">
      {/* WhatsApp Top Bar */}
      <header className="h-16 px-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between z-20 shrink-0 select-none shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#374248] flex items-center justify-center text-[#aebac1] overflow-hidden shrink-0">
            {settings.sigilImage ? (
              <img
                src={settings.sigilImage}
                alt="Sigil"
                className="w-full h-full object-cover"
              />
            ) : (
              <Shield className="w-5 h-5 text-[#00a884]" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-white text-base leading-tight">Admin</span>
            <span className="text-xs text-[#00a884] font-normal leading-tight">online</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Logout"
          className="p-2 rounded-full text-[#aebac1] hover:text-white hover:bg-[#374248] transition cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* WhatsApp Message Body */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
        style={{
          backgroundColor: '#0b141a',
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(17, 27, 33, 0.6) 0%, rgba(11, 20, 26, 0.95) 100%)'
        }}
      >
        {/* Subtle lock notice like WhatsApp */}
        <div className="flex justify-center my-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#182229] border border-[#222d34] text-[#ffd279] text-[11px] font-sans flex items-center gap-1.5 shadow-sm text-center max-w-xs">
            <Lock className="w-3 h-3 text-[#ffd279] shrink-0" />
            <span>Messages are direct and private with Admin.</span>
          </div>
        </div>

        {messages.map((msg) => {
          const isAdmin = msg.senderRole === 'admin';
          return (
            <div
              key={msg.id}
              className={`flex w-full ${isAdmin ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[82%] sm:max-w-[65%] px-3.5 py-2 rounded-lg text-[14px] leading-relaxed break-words shadow relative ${
                  isAdmin
                    ? 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                    : 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                }`}
              >
                <p className="whitespace-pre-wrap select-text">{msg.text}</p>
                <div
                  className={`flex items-center gap-1 justify-end mt-1 text-[11px] select-none ${
                    isAdmin ? 'text-[#8696a0]' : 'text-[#8696a0]'
                  }`}
                >
                  <span>{formatMessageTime(msg.createdAt)}</span>
                  {!isAdmin && (
                    <CheckCheck
                      className={`w-3.5 h-3.5 ${
                        msg.readByAdmin ? 'text-[#53bdeb]' : 'text-[#8696a0]'
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
      <footer className="p-2 sm:p-3 bg-[#202c33] border-t border-[#222d34] flex items-center gap-2 z-20 shrink-0">
        <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#2a3942] text-white text-sm placeholder-[#8696a0] focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#02906f] active:bg-[#007a5e] text-white flex items-center justify-center shrink-0 transition disabled:opacity-40 cursor-pointer shadow-md"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </footer>
    </div>
  );
};
