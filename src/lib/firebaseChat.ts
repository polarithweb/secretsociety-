import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  deleteDoc
} from 'firebase/firestore';
import defaultChatConfigData from '../../firebase-chat-config.json';
import primaryFirebaseConfig from '../../firebase-applet-config.json';
import { ChatMessage, ChatThread, ChatFirebaseConfig } from '../types';

const CHAT_APP_NAME = 'SecretSocietyChatApp';
const CHAT_CONFIG_KEY = 'secretsociety_chat_custom_firebase_config';
const CHAT_LOCAL_MESSAGES_KEY = 'secretsociety_local_chat_messages';
const CHAT_LOCAL_THREADS_KEY = 'secretsociety_local_chat_threads';

/**
 * Retrieve active Chat Firebase configuration (custom project if provided by Admin, or default chat config)
 */
export function getChatFirebaseConfig(): ChatFirebaseConfig {
  try {
    const saved = localStorage.getItem(CHAT_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId && parsed.apiKey) {
        return { ...parsed, isCustomProject: true };
      }
    }
  } catch (e) {
    console.warn('Error reading custom chat Firebase config:', e);
  }

  return {
    projectId: defaultChatConfigData.projectId || primaryFirebaseConfig.projectId,
    appId: defaultChatConfigData.appId || primaryFirebaseConfig.appId,
    apiKey: defaultChatConfigData.apiKey || primaryFirebaseConfig.apiKey,
    authDomain: defaultChatConfigData.authDomain || primaryFirebaseConfig.authDomain,
    firestoreDatabaseId: defaultChatConfigData.firestoreDatabaseId || primaryFirebaseConfig.firestoreDatabaseId,
    storageBucket: defaultChatConfigData.storageBucket || primaryFirebaseConfig.storageBucket,
    messagingSenderId: defaultChatConfigData.messagingSenderId || primaryFirebaseConfig.messagingSenderId,
    isCustomProject: false,
    chatInstanceLabel: 'Dedicated Chat Firebase App Instance'
  };
}

/**
 * Save custom secondary Firebase Project configuration
 */
export function saveChatFirebaseConfig(config: ChatFirebaseConfig): void {
  try {
    localStorage.setItem(CHAT_CONFIG_KEY, JSON.stringify(config));
    // Trigger window reload so the newly configured secondary Firebase project initializes cleanly
    window.location.reload();
  } catch (e) {
    console.error('Failed to save chat Firebase config:', e);
  }
}

/**
 * Reset chat configuration to default dedicated instance
 */
export function resetChatFirebaseConfig(): void {
  try {
    localStorage.removeItem(CHAT_CONFIG_KEY);
    window.location.reload();
  } catch (e) {
    console.error('Failed to reset chat Firebase config:', e);
  }
}

/**
 * Initialize dedicated Firebase App and Firestore for Chat
 */
function initChatAppAndDb(): { app: FirebaseApp; db: Firestore } {
  const config = getChatFirebaseConfig();
  const existingApps = getApps();
  let chatApp = existingApps.find((a) => a.name === CHAT_APP_NAME);

  if (!chatApp) {
    try {
      chatApp = initializeApp(
        {
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId
        },
        CHAT_APP_NAME
      );
    } catch (e) {
      console.warn('Failed to initialize dedicated chat app with custom name, falling back to default:', e);
      chatApp = existingApps.length > 0 ? getApp() : initializeApp(primaryFirebaseConfig);
    }
  }

  let chatDb: Firestore;
  try {
    chatDb = config.firestoreDatabaseId
      ? getFirestore(chatApp, config.firestoreDatabaseId)
      : getFirestore(chatApp);
  } catch (e) {
    console.warn('Failed to initialize Firestore on dedicated database, falling back:', e);
    chatDb = getFirestore(chatApp);
  }

  return { app: chatApp, db: chatDb };
}

const { db: chatFirestore } = initChatAppAndDb();

export const CHAT_MESSAGES_COLLECTION = collection(chatFirestore, 'chat_messages');
export const CHAT_THREADS_COLLECTION = collection(chatFirestore, 'chat_threads');

// In-memory caches to eliminate race conditions and provide zero-latency UI
const inMemoryMessages = new Map<string, ChatMessage>();
const inMemoryThreads = new Map<string, ChatThread>();

// Preload local storage backups into memory
try {
  const storedMsgs = localStorage.getItem(CHAT_LOCAL_MESSAGES_KEY);
  if (storedMsgs) {
    const list: ChatMessage[] = JSON.parse(storedMsgs);
    list.forEach((m) => {
      if (m && m.id) inMemoryMessages.set(m.id, m);
    });
  }

  const storedThreads = localStorage.getItem(CHAT_LOCAL_THREADS_KEY);
  if (storedThreads) {
    const list: ChatThread[] = JSON.parse(storedThreads);
    list.forEach((t) => {
      if (t && t.id) inMemoryThreads.set(t.id, t);
    });
  }
} catch {
  // Ignore storage read errors
}

function persistLocalData(): void {
  try {
    const msgs = Array.from(inMemoryMessages.values()).slice(-200);
    localStorage.setItem(CHAT_LOCAL_MESSAGES_KEY, JSON.stringify(msgs));

    const threads = Array.from(inMemoryThreads.values());
    localStorage.setItem(CHAT_LOCAL_THREADS_KEY, JSON.stringify(threads));
  } catch {
    // Ignore storage quota warnings
  }
}

/**
 * Strictly sanitize text: strip HTML and forbid images or data URLs
 */
export function sanitizeChatText(input: string): string {
  if (!input) return '';
  // Strip script/html tags
  let clean = input.replace(/<[^>]*>?/gm, '');
  // Forbid any base64 image data strings
  if (clean.includes('data:image/') || clean.includes(';base64,')) {
    clean = '[Notice: Photo transmission prohibited in secure direct comms]';
  }
  return clean.trim();
}

/**
 * Send a strictly text-only direct message
 */
export async function sendChatMessage(params: {
  threadId: string;
  memberAlias: string;
  memberName?: string;
  senderRole: 'member' | 'admin';
  senderAlias: string;
  text: string;
}): Promise<ChatMessage> {
  const cleanText = sanitizeChatText(params.text);
  if (!cleanText) {
    throw new Error('Message text cannot be empty');
  }

  const nowIso = new Date().toISOString();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const newMessage: ChatMessage = {
    id: messageId,
    threadId: params.threadId,
    memberAlias: params.memberAlias,
    memberName: params.memberName || '',
    senderRole: params.senderRole,
    senderAlias: params.senderAlias,
    text: cleanText,
    createdAt: nowIso,
    readByAdmin: params.senderRole === 'admin',
    readByMember: params.senderRole === 'member'
  };

  // 1. Immediately store in memory cache for instantaneous UI feedback
  inMemoryMessages.set(messageId, newMessage);

  // 2. Update/create thread in memory
  const existingThread = inMemoryThreads.get(params.threadId);
  const unreadAdminInc = params.senderRole === 'member' ? (existingThread?.unreadForAdminCount || 0) + 1 : 0;
  const unreadMemberInc = params.senderRole === 'admin' ? (existingThread?.unreadForMemberCount || 0) + 1 : 0;

  const updatedThread: ChatThread = {
    id: params.threadId,
    memberAlias: params.memberAlias,
    memberName: params.memberName || existingThread?.memberName || '',
    lastMessageText: cleanText,
    lastMessageAt: nowIso,
    lastSenderRole: params.senderRole,
    unreadForAdminCount: unreadAdminInc,
    unreadForMemberCount: unreadMemberInc,
    createdAt: existingThread?.createdAt || nowIso,
    updatedAt: nowIso
  };

  inMemoryThreads.set(params.threadId, updatedThread);
  persistLocalData();

  // 3. Persist message and thread to dedicated Chat Firestore instance
  try {
    const msgDocRef = doc(CHAT_MESSAGES_COLLECTION, messageId);
    await setDoc(msgDocRef, newMessage);

    const threadDocRef = doc(CHAT_THREADS_COLLECTION, params.threadId);
    await setDoc(threadDocRef, updatedThread);
  } catch (err) {
    console.warn('Dedicated Chat Firestore save warning (message retained in active session):', err);
  }

  return newMessage;
}

/**
 * Subscribe to real-time chat messages for a specific member-admin thread
 */
export function subscribeToChatMessages(
  threadId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  // Immediately emit current in-memory messages for this thread
  const filterAndSort = () => {
    const list = Array.from(inMemoryMessages.values())
      .filter((m) => m.threadId === threadId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  };

  callback(filterAndSort());

  try {
    const q = query(
      CHAT_MESSAGES_COLLECTION,
      where('threadId', '==', threadId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        snap.forEach((d) => {
          const msg = { ...(d.data() as ChatMessage), id: d.id };
          inMemoryMessages.set(d.id, msg);
        });
        persistLocalData();
        callback(filterAndSort());
      },
      (err) => {
        console.warn('Chat messages subscription warning:', err);
        callback(filterAndSort());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to start chat messages subscription:', err);
    return () => {};
  }
}

/**
 * Subscribe to real-time chat threads list (Admin perspective)
 */
export function subscribeToChatThreads(callback: (threads: ChatThread[]) => void): () => void {
  const getSortedThreads = () => {
    const list = Array.from(inMemoryThreads.values());
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  };

  callback(getSortedThreads());

  try {
    const unsubscribe = onSnapshot(
      CHAT_THREADS_COLLECTION,
      (snap) => {
        snap.forEach((d) => {
          const t = { ...(d.data() as ChatThread), id: d.id };
          inMemoryThreads.set(d.id, t);
        });
        persistLocalData();
        callback(getSortedThreads());
      },
      (err) => {
        console.warn('Chat threads subscription warning:', err);
        callback(getSortedThreads());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to chat threads:', err);
    return () => {};
  }
}

/**
 * Mark messages in a thread as read by Admin
 */
export async function markChatThreadReadByAdmin(threadId: string): Promise<void> {
  const thread = inMemoryThreads.get(threadId);
  if (thread) {
    thread.unreadForAdminCount = 0;
    inMemoryThreads.set(threadId, thread);
  }

  // Update in-memory messages
  inMemoryMessages.forEach((m) => {
    if (m.threadId === threadId && !m.readByAdmin) {
      m.readByAdmin = true;
    }
  });

  persistLocalData();

  try {
    const threadRef = doc(CHAT_THREADS_COLLECTION, threadId);
    await setDoc(threadRef, { unreadForAdminCount: 0 }, { merge: true });
  } catch (err) {
    console.warn('Mark thread read by admin warning:', err);
  }
}

/**
 * Mark messages in a thread as read by Member
 */
export async function markChatThreadReadByMember(threadId: string): Promise<void> {
  const thread = inMemoryThreads.get(threadId);
  if (thread) {
    thread.unreadForMemberCount = 0;
    inMemoryThreads.set(threadId, thread);
  }

  inMemoryMessages.forEach((m) => {
    if (m.threadId === threadId && !m.readByMember) {
      m.readByMember = true;
    }
  });

  persistLocalData();

  try {
    const threadRef = doc(CHAT_THREADS_COLLECTION, threadId);
    await setDoc(threadRef, { unreadForMemberCount: 0 }, { merge: true });
  } catch (err) {
    console.warn('Mark thread read by member warning:', err);
  }
}

/**
 * Delete a chat thread and all its associated messages
 */
export async function deleteChatThread(threadId: string): Promise<void> {
  inMemoryThreads.delete(threadId);
  Array.from(inMemoryMessages.entries()).forEach(([id, msg]) => {
    if (msg.threadId === threadId) {
      inMemoryMessages.delete(id);
    }
  });
  persistLocalData();

  try {
    const threadRef = doc(CHAT_THREADS_COLLECTION, threadId);
    await deleteDoc(threadRef);

    // Delete messages from remote collection
    const q = query(CHAT_MESSAGES_COLLECTION, where('threadId', '==', threadId));
    const snap = await getDocs(q);
    snap.forEach(async (d) => {
      await deleteDoc(d.ref);
    });
  } catch (err) {
    console.warn('Error deleting chat thread from Firestore:', err);
  }
}
