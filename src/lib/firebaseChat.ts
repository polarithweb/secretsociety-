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
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import primaryFirebaseConfig from '../../firebase-applet-config.json';
import { ChatMessage, ChatThread, ChatFirebaseConfig } from '../types';

const CHAT_APP_NAME = 'SecretSocietyChatApp';
const CHAT_CONFIG_KEY = 'secretsociety_chat_custom_firebase_config';
const CHAT_LOCAL_MESSAGES_KEY = 'secretsociety_local_chat_messages_v3';
const CHAT_LOCAL_THREADS_KEY = 'secretsociety_local_chat_threads_v3';

// Clear legacy cached chats from prior sessions
try {
  localStorage.removeItem('secretsociety_local_chat_messages');
  localStorage.removeItem('secretsociety_local_chat_threads');
} catch {}

/**
 * Retrieve active Chat Firebase configuration (custom project if provided by Admin, or default chat config)
 */
export function getChatFirebaseConfig(): ChatFirebaseConfig {
  try {
    const saved = localStorage.getItem(CHAT_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        parsed.projectId &&
        parsed.projectId !== 'grounded-bonfire-ms7sz-chat' &&
        parsed.apiKey
      ) {
        return { ...parsed, isCustomProject: true };
      } else {
        localStorage.removeItem(CHAT_CONFIG_KEY);
      }
    }
  } catch (e) {
    console.warn('Error reading custom chat Firebase config:', e);
  }

  return {
    projectId: primaryFirebaseConfig.projectId,
    appId: primaryFirebaseConfig.appId,
    apiKey: primaryFirebaseConfig.apiKey,
    authDomain: primaryFirebaseConfig.authDomain,
    firestoreDatabaseId: primaryFirebaseConfig.firestoreDatabaseId,
    storageBucket: primaryFirebaseConfig.storageBucket,
    messagingSenderId: primaryFirebaseConfig.messagingSenderId,
    isCustomProject: false,
    chatInstanceLabel: 'Primary Cloud Firestore Instance'
  };
}

/**
 * Save custom secondary Firebase Project configuration
 */
export function saveChatFirebaseConfig(config: ChatFirebaseConfig): void {
  try {
    localStorage.setItem(CHAT_CONFIG_KEY, JSON.stringify(config));
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

  // If the admin configured a custom external secondary project
  if (config.isCustomProject && config.projectId && config.projectId !== primaryFirebaseConfig.projectId) {
    try {
      let customApp = existingApps.find((a) => a.name === CHAT_APP_NAME);
      if (!customApp) {
        customApp = initializeApp(
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
      }

      const customDb = config.firestoreDatabaseId
        ? getFirestore(customApp, config.firestoreDatabaseId)
        : getFirestore(customApp);

      return { app: customApp, db: customDb };
    } catch (e) {
      console.warn('Failed to initialize custom external Firebase chat app, using default:', e);
    }
  }

  // Default: use the verified, active Firebase instance with valid firestoreDatabaseId
  const primaryApp = existingApps.length > 0 ? getApp() : initializeApp(primaryFirebaseConfig);
  const primaryDb = primaryFirebaseConfig.firestoreDatabaseId
    ? getFirestore(primaryApp, primaryFirebaseConfig.firestoreDatabaseId)
    : getFirestore(primaryApp);

  return { app: primaryApp, db: primaryDb };
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

function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
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
  const unreadAdminInc = params.senderRole === 'member' ? Number((existingThread?.unreadForAdminCount || 0) + 1) : 0;
  const unreadMemberInc = params.senderRole === 'admin' ? Number((existingThread?.unreadForMemberCount || 0) + 1) : 0;

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

  // 3. Persist message and thread to Chat Firestore instance
  try {
    const msgDocRef = doc(CHAT_MESSAGES_COLLECTION, messageId);
    await setDoc(msgDocRef, cleanForFirestore(newMessage));

    const threadDocRef = doc(CHAT_THREADS_COLLECTION, params.threadId);
    await setDoc(threadDocRef, cleanForFirestore(updatedThread));
  } catch (err) {
    console.warn('Chat Firestore save warning (retained in active session):', err);
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
  const normThreadId = (threadId || '').trim();
  if (!normThreadId) {
    callback([]);
    return () => {};
  }

  // Immediately emit current in-memory messages for this thread
  const filterAndSort = () => {
    const list = Array.from(inMemoryMessages.values())
      .filter((m) => (m.threadId || '').toLowerCase() === normThreadId.toLowerCase())
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime() || 0;
        const timeB = new Date(b.createdAt || 0).getTime() || 0;
        return timeA - timeB;
      });
    return list;
  };

  callback(filterAndSort());

  try {
    // Querying on threadId without orderBy avoids requiring a Firestore composite index
    const q = query(
      CHAT_MESSAGES_COLLECTION,
      where('threadId', '==', normThreadId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        // Clear all cached messages for this thread to reflect deletions in real time
        Array.from(inMemoryMessages.entries()).forEach(([id, m]) => {
          if ((m.threadId || '').toLowerCase() === normThreadId.toLowerCase()) {
            inMemoryMessages.delete(id);
          }
        });

        // Insert currently existing documents from Firestore safely
        snap.forEach((d) => {
          const raw = (d.data() || {}) as Partial<ChatMessage>;
          const msg: ChatMessage = {
            id: d.id,
            threadId: raw.threadId || normThreadId,
            memberAlias: raw.memberAlias || normThreadId,
            memberName: raw.memberName || '',
            senderRole: raw.senderRole || 'member',
            senderAlias: raw.senderAlias || raw.memberAlias || normThreadId,
            text: raw.text || '',
            createdAt: raw.createdAt || new Date().toISOString(),
            readByAdmin: !!raw.readByAdmin,
            readByMember: !!raw.readByMember
          };
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
    list.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.lastMessageAt || 0).getTime() || 0;
      const timeB = new Date(b.updatedAt || b.lastMessageAt || 0).getTime() || 0;
      return timeB - timeA;
    });
    return list;
  };

  callback(getSortedThreads());

  try {
    const unsubscribe = onSnapshot(
      CHAT_THREADS_COLLECTION,
      (snap) => {
        // Clear existing inMemoryThreads to reflect deleted threads in real-time
        inMemoryThreads.clear();
        snap.forEach((d) => {
          const raw = (d.data() || {}) as Partial<ChatThread>;
          const t: ChatThread = {
            id: d.id,
            memberAlias: raw.memberAlias || d.id || '',
            memberName: raw.memberName || '',
            lastMessageText: raw.lastMessageText || '',
            lastMessageAt: raw.lastMessageAt || raw.updatedAt || raw.createdAt || new Date().toISOString(),
            lastSenderRole: raw.lastSenderRole || 'member',
            unreadForAdminCount: typeof raw.unreadForAdminCount === 'number' ? raw.unreadForAdminCount : 0,
            unreadForMemberCount: typeof raw.unreadForMemberCount === 'number' ? raw.unreadForMemberCount : 0,
            createdAt: raw.createdAt || new Date().toISOString(),
            updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString()
          };
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
  const normId = (threadId || '').trim();
  if (!normId) return;

  const thread = inMemoryThreads.get(normId);
  if (thread) {
    thread.unreadForAdminCount = 0;
    inMemoryThreads.set(normId, thread);
  }

  // Update in-memory messages
  inMemoryMessages.forEach((m) => {
    if ((m.threadId || '').toLowerCase() === normId.toLowerCase() && !m.readByAdmin) {
      m.readByAdmin = true;
    }
  });

  persistLocalData();

  try {
    const threadRef = doc(CHAT_THREADS_COLLECTION, normId);
    await updateDoc(threadRef, { unreadForAdminCount: 0 });
  } catch (err) {
    // If doc does not exist yet, ignore to avoid creating malformed doc
  }
}

/**
 * Mark messages in a thread as read by Member
 */
export async function markChatThreadReadByMember(threadId: string): Promise<void> {
  const normId = (threadId || '').trim();
  if (!normId) return;

  const thread = inMemoryThreads.get(normId);
  if (thread) {
    thread.unreadForMemberCount = 0;
    inMemoryThreads.set(normId, thread);
  }

  inMemoryMessages.forEach((m) => {
    if ((m.threadId || '').toLowerCase() === normId.toLowerCase() && !m.readByMember) {
      m.readByMember = true;
    }
  });

  persistLocalData();

  try {
    const threadRef = doc(CHAT_THREADS_COLLECTION, normId);
    await updateDoc(threadRef, { unreadForMemberCount: 0 });
  } catch (err) {
    // If doc does not exist yet, ignore to avoid creating malformed doc
  }
}

/**
 * Delete a chat thread and all its associated messages permanently from everywhere
 */
export async function deleteChatThread(threadId: string): Promise<void> {
  const normThreadId = threadId.trim();

  // 1. Instantly delete from local memory and persist
  inMemoryThreads.delete(normThreadId);
  Array.from(inMemoryThreads.keys()).forEach((k) => {
    if (k.toLowerCase() === normThreadId.toLowerCase()) {
      inMemoryThreads.delete(k);
    }
  });

  Array.from(inMemoryMessages.entries()).forEach(([id, msg]) => {
    if (msg.threadId.toLowerCase() === normThreadId.toLowerCase()) {
      inMemoryMessages.delete(id);
    }
  });
  persistLocalData();

  // 2. Permanently delete all messages and thread document from Firestore
  try {
    const q = query(CHAT_MESSAGES_COLLECTION, where('threadId', '==', normThreadId));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    // If casing differed, also delete lowercase documents
    if (normThreadId !== normThreadId.toLowerCase()) {
      const qLower = query(CHAT_MESSAGES_COLLECTION, where('threadId', '==', normThreadId.toLowerCase()));
      const snapLower = await getDocs(qLower);
      const deleteLower = snapLower.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deleteLower);
    }

    // Delete the thread document itself
    const threadRef = doc(CHAT_THREADS_COLLECTION, normThreadId);
    await deleteDoc(threadRef);
  } catch (err) {
    console.warn('Error deleting chat thread from Firestore:', err);
  }
}
