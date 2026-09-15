import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  arrayUnion
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import {
  Question,
  SocietySettings,
  Answersheet,
  SubmissionStatus,
  MemberAccount,
  MemberInfoEntry,
  TaskForm,
  TaskSubmission,
  TaskInfoUpdate,
  KnowledgeArticle
} from '../types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_QUESTIONS,
  DEFAULT_MEMBERS,
  DEFAULT_TASK_FORMS,
  DEFAULT_KNOWLEDGE_ARTICLES
} from './defaults';

// Initialize Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfigData);

// Note: firebaseConfigData contains `firestoreDatabaseId`
export const db = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

const SETTINGS_DOC_REF = doc(db, 'settings', 'global');
const QUESTIONS_COLLECTION = collection(db, 'questions');
const SUBMISSIONS_COLLECTION = collection(db, 'submissions');
const MEMBERS_COLLECTION = collection(db, 'members');
const MEMBER_INFO_ENTRIES_COLLECTION = collection(db, 'member_info_entries');
const TASK_FORMS_COLLECTION = collection(db, 'task_forms');
const TASK_SUBMISSIONS_COLLECTION = collection(db, 'task_submissions');
const KNOWLEDGE_ARTICLES_COLLECTION = collection(db, 'knowledge_articles');

/**
 * Fetch or initialize global society settings
 */
export async function getSocietySettings(): Promise<SocietySettings> {
  try {
    const snap = await getDoc(SETTINGS_DOC_REF);
    if (snap.exists()) {
      return { ...DEFAULT_SETTINGS, ...snap.data() } as SocietySettings;
    } else {
      // First-time seed
      await setDoc(SETTINGS_DOC_REF, DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
  } catch (err) {
    console.warn('Firestore settings read warning (using local defaults):', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update global society settings (e.g. background image, timer minutes, admin pin, heading)
 */
export async function updateSocietySettings(newSettings: Partial<SocietySettings>): Promise<void> {
  try {
    await setDoc(SETTINGS_DOC_REF, newSettings, { merge: true });
  } catch (err) {
    console.error('Failed to update settings in Firestore:', err);
    throw err;
  }
}

/**
 * Fetch questions ordered by 'order'
 */
export async function getQuestions(): Promise<Question[]> {
  try {
    const q = query(QUESTIONS_COLLECTION, orderBy('order', 'asc'));
    const snap = await getDocs(q);
    const questions: Question[] = [];
    if (!snap.empty) {
      snap.forEach((d) => {
        questions.push({ ...(d.data() as Question), id: d.id });
      });
    }
    return questions;
  } catch (err) {
    console.warn('Error reading questions from Firestore:', err);
    return [];
  }
}

/**
 * Clear all questions from Firestore (for admin clean slate)
 */
export async function clearAllQuestions(): Promise<void> {
  try {
    const snap = await getDocs(QUESTIONS_COLLECTION);
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(doc(db, 'questions', docSnap.id)));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error('Failed to clear questions:', err);
    throw err;
  }
}

/**
 * Seed initial questions into Firestore (no-op now as all questions are created by admin)
 */
export async function seedDefaultQuestions(): Promise<void> {
  // Deliberate no-op: All questions are managed strictly from the admin portal.
}

/**
 * Save or update a single question
 */
export async function saveQuestion(question: Question): Promise<string> {
  try {
    if (question.id && !question.id.startsWith('new_')) {
      const qRef = doc(QUESTIONS_COLLECTION, question.id);
      await setDoc(qRef, question, { merge: true });
      return question.id;
    } else {
      const docRef = await addDoc(QUESTIONS_COLLECTION, {
        ...question,
        id: '' // will be replaced
      });
      await updateDoc(docRef, { id: docRef.id });
      return docRef.id;
    }
  } catch (err) {
    console.error('Failed to save question:', err);
    throw err;
  }
}

/**
 * Delete a question by ID
 */
export async function deleteQuestionById(id: string): Promise<void> {
  try {
    const qRef = doc(QUESTIONS_COLLECTION, id);
    await deleteDoc(qRef);
  } catch (err) {
    console.error('Failed to delete question:', err);
    throw err;
  }
}

/**
 * Submit candidate answersheet to Firestore
 */
export async function submitAnswersheet(
  submission: Omit<Answersheet, 'id'>
): Promise<string> {
  try {
    const docRef = await addDoc(SUBMISSIONS_COLLECTION, submission);
    return docRef.id;
  } catch (err) {
    console.error('Failed to submit answersheet to Firestore:', err);
    throw err;
  }
}

/**
 * Fetch all candidate submissions for Admin Portal
 */
export async function getSubmissions(): Promise<Answersheet[]> {
  try {
    const q = query(SUBMISSIONS_COLLECTION, orderBy('submittedAt', 'desc'));
    const snap = await getDocs(q);
    const submissions: Answersheet[] = [];
    snap.forEach((d) => {
      submissions.push({ ...(d.data() as Answersheet), id: d.id });
    });
    return submissions;
  } catch (err) {
    console.warn('Error fetching submissions from Firestore:', err);
    return [];
  }
}

/**
 * Update candidate submission status or admin notes
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: SubmissionStatus,
  adminNotes?: string
): Promise<void> {
  try {
    const subRef = doc(SUBMISSIONS_COLLECTION, submissionId);
    const payload: Record<string, any> = { status };
    if (adminNotes !== undefined) {
      payload.adminNotes = adminNotes;
    }
    await updateDoc(subRef, payload);
  } catch (err) {
    console.error('Failed to update submission status:', err);
    throw err;
  }
}

/**
 * Delete candidate submission
 */
export async function deleteSubmissionById(submissionId: string): Promise<void> {
  try {
    const subRef = doc(SUBMISSIONS_COLLECTION, submissionId);
    await deleteDoc(subRef);
  } catch (err) {
    console.error('Failed to delete submission:', err);
    throw err;
  }
}

/**
 * Subscribe to real-time questions updates
 */
export function subscribeToQuestions(callback: (questions: Question[]) => void): () => void {
  try {
    const q = query(QUESTIONS_COLLECTION, orderBy('order', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const questions: Question[] = [];
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          questions.push({ ...(d.data() as Question), id: d.id });
        });
      }
      callback(questions);
    }, (err) => {
      console.warn('Question real-time listener error:', err);
      callback([]);
    });
  } catch (e) {
    console.warn('Could not setup questions snapshot:', e);
    callback([]);
    return () => {};
  }
}

/**
 * Subscribe to real-time settings updates
 */
export function subscribeToSettings(callback: (settings: SocietySettings) => void): () => void {
  try {
    return onSnapshot(SETTINGS_DOC_REF, (snap) => {
      if (snap.exists()) {
        callback({ ...DEFAULT_SETTINGS, ...snap.data() } as SocietySettings);
      } else {
        callback(DEFAULT_SETTINGS);
        setDoc(SETTINGS_DOC_REF, DEFAULT_SETTINGS);
      }
    }, (err) => {
      console.warn('Settings real-time listener error:', err);
      callback(DEFAULT_SETTINGS);
    });
  } catch (e) {
    console.warn('Could not setup settings snapshot:', e);
    callback(DEFAULT_SETTINGS);
    return () => {};
  }
}

/**
 * Subscribe to real-time candidate answersheets updates
 */
export function subscribeToSubmissions(callback: (submissions: Answersheet[]) => void): () => void {
  try {
    const q = query(SUBMISSIONS_COLLECTION, orderBy('submittedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: Answersheet[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as Answersheet), id: d.id });
      });
      callback(list);
    }, (err) => {
      console.warn('Submissions real-time listener error:', err);
      callback([]);
    });
  } catch (e) {
    console.warn('Could not setup submissions snapshot:', e);
    callback([]);
    return () => {};
  }
}

/**
 * Fetch all registered member accounts
 */
export async function getMemberAccounts(): Promise<MemberAccount[]> {
  try {
    const snap = await getDocs(MEMBERS_COLLECTION);
    const members: MemberAccount[] = [];
    if (!snap.empty) {
      snap.forEach((d) => {
        members.push({ ...(d.data() as MemberAccount), id: d.id });
      });
      return members;
    } else {
      // First-time seed default member
      for (const m of DEFAULT_MEMBERS) {
        const docRef = doc(MEMBERS_COLLECTION, m.id);
        await setDoc(docRef, m);
      }
      return DEFAULT_MEMBERS;
    }
  } catch (err) {
    console.warn('Error reading members from Firestore:', err);
    return DEFAULT_MEMBERS;
  }
}

/**
 * Save or update a member account
 */
export async function saveMemberAccount(member: MemberAccount): Promise<string> {
  try {
    if (member.id && !member.id.startsWith('new_')) {
      const mRef = doc(MEMBERS_COLLECTION, member.id);
      await setDoc(mRef, member, { merge: true });
      return member.id;
    } else {
      const docRef = await addDoc(MEMBERS_COLLECTION, {
        ...member,
        id: ''
      });
      await updateDoc(docRef, { id: docRef.id });
      return docRef.id;
    }
  } catch (err) {
    console.error('Failed to save member account:', err);
    throw err;
  }
}

/**
 * Delete a member account
 */
export async function deleteMemberAccountById(id: string): Promise<void> {
  try {
    const mRef = doc(MEMBERS_COLLECTION, id);
    await deleteDoc(mRef);
  } catch (err) {
    console.error('Failed to delete member account:', err);
    throw err;
  }
}

/**
 * Subscribe to real-time member account updates
 */
export function subscribeToMembers(callback: (members: MemberAccount[]) => void): () => void {
  try {
    return onSnapshot(MEMBERS_COLLECTION, (snapshot) => {
      const list: MemberAccount[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as MemberAccount), id: d.id });
      });
      callback(list);
    }, (err) => {
      console.warn('Members real-time listener error:', err);
      callback([]);
    });
  } catch (e) {
    console.warn('Could not setup members snapshot:', e);
    callback([]);
    return () => {};
  }
}

/**
 * Verify member credentials against registered member accounts
 */
export async function authenticateMember(alias: string, password: string): Promise<MemberAccount | null> {
  try {
    const members = await getMemberAccounts();
    const cleanAlias = alias.trim().toLowerCase();
    const cleanPass = password.trim();

    const matched = members.find(
      (m) => m.alias.trim().toLowerCase() === cleanAlias && m.password === cleanPass && m.isActive
    );

    if (matched) {
      // Update last login timestamp asynchronously
      try {
        const mRef = doc(MEMBERS_COLLECTION, matched.id);
        await updateDoc(mRef, { lastLoginAt: new Date().toISOString() });
      } catch (ignore) {}
      return matched;
    }
    return null;
  } catch (err) {
    console.error('Member authentication error:', err);
    return null;
  }
}

/**
 * Add a new information/intelligence entry to a question by an authenticated member anytime
 */
export async function addMemberInfoEntry(entry: Omit<MemberInfoEntry, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(MEMBER_INFO_ENTRIES_COLLECTION, {
      ...entry,
      id: ''
    });
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  } catch (err) {
    console.error('Failed to record member info entry:', err);
    throw err;
  }
}

/**
 * Fetch member information entries
 */
export async function getMemberInfoEntries(questionId?: string): Promise<MemberInfoEntry[]> {
  try {
    const q = query(MEMBER_INFO_ENTRIES_COLLECTION, orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    const list: MemberInfoEntry[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as MemberInfoEntry;
      if (!questionId || data.questionId === questionId) {
        list.push({ ...data, id: d.id });
      }
    });
    return list;
  } catch (err) {
    console.warn('Error reading member info entries:', err);
    return [];
  }
}

/**
 * Subscribe to real-time updates of member information entries
 */
export function subscribeToMemberInfoEntries(callback: (entries: MemberInfoEntry[]) => void): () => void {
  try {
    const q = query(MEMBER_INFO_ENTRIES_COLLECTION, orderBy('submittedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const list: MemberInfoEntry[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as MemberInfoEntry), id: d.id });
      });
      callback(list);
    }, (err) => {
      console.warn('Member info entries listener warning:', err);
      callback([]);
    });
  } catch (e) {
    console.warn('Could not setup member info listener:', e);
    callback([]);
    return () => {};
  }
}

/**
 * Delete a member information entry
 */
export async function deleteMemberInfoEntry(id: string): Promise<void> {
  try {
    const docRef = doc(MEMBER_INFO_ENTRIES_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete member info entry:', err);
    throw err;
  }
}

// ====================================================
// MEMBER TASK FORMS & SUBMISSIONS (INFO PORTAL TASK SYSTEM)
// ====================================================

/**
 * Fetch all task forms configured for the member info portal
 */
export async function getTaskForms(): Promise<TaskForm[]> {
  try {
    const snap = await getDocs(TASK_FORMS_COLLECTION);
    const forms: TaskForm[] = [];
    if (!snap.empty) {
      snap.forEach((d) => {
        forms.push({ ...(d.data() as TaskForm), id: d.id });
      });
      return forms.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // Seed default task forms
      for (const tf of DEFAULT_TASK_FORMS) {
        const formRef = doc(TASK_FORMS_COLLECTION, tf.id);
        await setDoc(formRef, tf);
      }
      return DEFAULT_TASK_FORMS;
    }
  } catch (err) {
    console.warn('Error reading task forms:', err);
    return DEFAULT_TASK_FORMS;
  }
}

/**
 * Subscribe to real-time task forms updates
 */
export function subscribeToTaskForms(callback: (forms: TaskForm[]) => void): () => void {
  try {
    return onSnapshot(
      TASK_FORMS_COLLECTION,
      (snapshot) => {
        const forms: TaskForm[] = [];
        snapshot.forEach((d) => {
          forms.push({ ...(d.data() as TaskForm), id: d.id });
        });
        forms.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        callback(forms);
      },
      (err) => {
        console.warn('Task forms listener warning:', err);
        callback([]);
      }
    );
  } catch (e) {
    console.warn('Could not setup task forms listener:', e);
    callback([]);
    return () => {};
  }
}

/**
 * Save or update a task form
 */
export async function saveTaskForm(form: TaskForm): Promise<string> {
  try {
    const dataToSave = {
      title: form.title || 'Untitled Task Form',
      description: form.description || '',
      category: form.category || 'Directives',
      isActive: form.isActive !== undefined ? form.isActive : true,
      createdAt: form.createdAt || new Date().toISOString(),
      questions: form.questions || []
    };

    if (form.id && !form.id.startsWith('new_') && !form.id.startsWith('temp_')) {
      const formRef = doc(TASK_FORMS_COLLECTION, form.id);
      await setDoc(formRef, { ...dataToSave, id: form.id }, { merge: true });
      return form.id;
    } else {
      const docRef = await addDoc(TASK_FORMS_COLLECTION, dataToSave);
      await updateDoc(docRef, { id: docRef.id });
      return docRef.id;
    }
  } catch (err) {
    console.error('Error saving task form:', err);
    throw err;
  }
}

/**
 * Delete a task form
 */
export async function deleteTaskForm(id: string): Promise<void> {
  try {
    const docRef = doc(TASK_FORMS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting task form:', err);
    throw err;
  }
}

/**
 * Fetch task submissions (optionally filtered by member alias)
 */
export async function getTaskSubmissions(memberAlias?: string): Promise<TaskSubmission[]> {
  try {
    const snap = await getDocs(TASK_SUBMISSIONS_COLLECTION);
    const submissions: TaskSubmission[] = [];
    snap.forEach((d) => {
      const data = d.data() as TaskSubmission;
      if (!memberAlias || data.memberAlias?.toLowerCase() === memberAlias.toLowerCase()) {
        submissions.push({ ...data, id: d.id });
      }
    });
    return submissions.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  } catch (err) {
    console.warn('Error reading task submissions:', err);
    return [];
  }
}

/**
 * Subscribe to real-time task submissions
 */
export function subscribeToTaskSubmissions(
  callback: (submissions: TaskSubmission[]) => void,
  memberAlias?: string
): () => void {
  try {
    return onSnapshot(
      TASK_SUBMISSIONS_COLLECTION,
      (snapshot) => {
        const list: TaskSubmission[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as TaskSubmission;
          if (!memberAlias || data.memberAlias?.toLowerCase() === memberAlias.toLowerCase()) {
            list.push({ ...data, id: d.id });
          }
        });
        list.sort(
          (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        );
        callback(list);
      },
      (err) => {
        console.warn('Task submissions listener warning:', err);
        callback([]);
      }
    );
  } catch (e) {
    console.warn('Could not setup task submissions listener:', e);
    callback([]);
    return () => {};
  }
}

/**
 * Save a new task submission (a member can submit the same form multiple times for different purposes)
 */
export async function saveTaskSubmission(sub: TaskSubmission): Promise<string> {
  try {
    const now = new Date().toISOString();
    const cleanSub = {
      formId: sub.formId,
      formTitle: sub.formTitle || '',
      memberAlias: sub.memberAlias,
      memberName: sub.memberName || sub.memberAlias,
      purpose: sub.purpose || 'General Task Report',
      status: sub.status || 'active',
      createdAt: sub.createdAt || now,
      updatedAt: now,
      answers: sub.answers || {},
      infoUpdates: sub.infoUpdates || []
    };

    if (sub.id && !sub.id.startsWith('new_') && !sub.id.startsWith('temp_')) {
      const docRef = doc(TASK_SUBMISSIONS_COLLECTION, sub.id);
      await setDoc(docRef, cleanSub, { merge: true });
      return sub.id;
    } else {
      const docRef = await addDoc(TASK_SUBMISSIONS_COLLECTION, cleanSub);
      await updateDoc(docRef, { id: docRef.id });
      return docRef.id;
    }
  } catch (err) {
    console.error('Error saving task submission:', err);
    throw err;
  }
}

/**
 * Add a new info update to an allowed box/field in an existing task submission
 */
export async function addTaskInfoUpdate(
  submissionId: string,
  update: TaskInfoUpdate
): Promise<void> {
  try {
    const docRef = doc(TASK_SUBMISSIONS_COLLECTION, submissionId);
    await updateDoc(docRef, {
      infoUpdates: arrayUnion(update),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error adding task info update:', err);
    throw err;
  }
}

/**
 * Delete a task submission
 */
export async function deleteTaskSubmission(id: string): Promise<void> {
  try {
    const docRef = doc(TASK_SUBMISSIONS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting task submission:', err);
    throw err;
  }
}

// ----------------------------------------------------
// ----------------------------------------------------
// KNOWLEDGE REPOSITORY & ARTICLE ARCHIVES (/#/knowledge)
// ----------------------------------------------------

const KNOWLEDGE_META_DOC_REF = doc(db, 'settings', 'knowledge_meta');

/**
 * Get locally recorded deleted article IDs
 */
function getLocalDeletedArticleIds(): string[] {
  try {
    const stored = localStorage.getItem('secretsociety_deleted_articles');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // Ignore localStorage parse failures
  }
  return [];
}

/**
 * Record a deleted article ID locally in localStorage
 */
function recordLocalDeletedArticleId(id: string): void {
  try {
    const existing = getLocalDeletedArticleIds();
    if (!existing.includes(id)) {
      existing.push(id);
      localStorage.setItem('secretsociety_deleted_articles', JSON.stringify(existing));
    }
  } catch (e) {
    // Ignore storage write failures
  }
}

/**
 * Fetch all knowledge articles, optionally filtered by published status
 */
export async function getKnowledgeArticles(publishedOnly = false): Promise<KnowledgeArticle[]> {
  try {
    // Check metadata to determine if knowledge base has already been initialized
    let isSeeded = false;
    let remoteDeletedIds: string[] = [];

    try {
      const metaSnap = await getDoc(KNOWLEDGE_META_DOC_REF);
      if (metaSnap.exists()) {
        const data = metaSnap.data();
        isSeeded = Boolean(data.seeded);
        if (Array.isArray(data.deletedIds)) {
          remoteDeletedIds = data.deletedIds;
        }
      }
    } catch (metaErr) {
      console.warn('Could not check knowledge_meta in Firestore:', metaErr);
    }

    const localDeleted = getLocalDeletedArticleIds();
    const allDeletedIds = Array.from(new Set([...remoteDeletedIds, ...localDeleted]));

    const snap = await getDocs(KNOWLEDGE_ARTICLES_COLLECTION);
    let articles: KnowledgeArticle[] = [];

    if (!snap.empty) {
      snap.forEach((d) => {
        if (!allDeletedIds.includes(d.id)) {
          articles.push({ ...(d.data() as KnowledgeArticle), id: d.id });
        }
      });

      // Mark metadata as seeded so future empty states are respected
      if (!isSeeded) {
        try {
          await setDoc(KNOWLEDGE_META_DOC_REF, { seeded: true }, { merge: true });
        } catch (e) {
          // ignore
        }
      }
    } else if (!isSeeded) {
      // First-time seed ONLY if never initialized before
      for (const art of DEFAULT_KNOWLEDGE_ARTICLES) {
        if (!allDeletedIds.includes(art.id)) {
          try {
            const docRef = doc(KNOWLEDGE_ARTICLES_COLLECTION, art.id);
            await setDoc(docRef, art);
            articles.push(art);
          } catch (e) {
            console.warn('Seeding knowledge article warning:', e);
          }
        }
      }
      try {
        await setDoc(
          KNOWLEDGE_META_DOC_REF,
          { seeded: true, deletedIds: allDeletedIds },
          { merge: true }
        );
      } catch (e) {
        // ignore
      }
    }
    // Note: If snap is empty AND isSeeded is true, articles remains empty [] as intended when an admin purges all articles.

    if (publishedOnly) {
      articles = articles.filter((a) => a.isPublished);
    }

    // Sort by order asc, then createdAt desc
    return articles.sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } catch (err) {
    console.warn('Error fetching knowledge articles from Firestore:', err);
    const localDeleted = getLocalDeletedArticleIds();
    let fallback = DEFAULT_KNOWLEDGE_ARTICLES.filter((a) => !localDeleted.includes(a.id));
    if (publishedOnly) fallback = fallback.filter((a) => a.isPublished);
    return fallback;
  }
}

/**
 * Real-time subscription to knowledge articles
 */
export function subscribeToKnowledgeArticles(
  callback: (articles: KnowledgeArticle[]) => void,
  publishedOnly = false
): () => void {
  try {
    const unsubscribe = onSnapshot(
      KNOWLEDGE_ARTICLES_COLLECTION,
      (snap) => {
        const localDeleted = getLocalDeletedArticleIds();
        let articles: KnowledgeArticle[] = [];

        snap.forEach((d) => {
          if (!localDeleted.includes(d.id)) {
            articles.push({ ...(d.data() as KnowledgeArticle), id: d.id });
          }
        });

        if (publishedOnly) {
          articles = articles.filter((a) => a.isPublished);
        }

        articles.sort((a, b) => {
          const orderA = a.order ?? 999;
          const orderB = b.order ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        callback(articles);
      },
      (err) => {
        console.warn('Knowledge articles subscription error:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to subscribe to knowledge articles:', err);
    return () => {};
  }
}

/**
 * Create or update a knowledge article
 */
export async function saveKnowledgeArticle(
  article: Partial<KnowledgeArticle>
): Promise<string> {
  try {
    const now = new Date().toISOString();
    const cleanArticle: Omit<KnowledgeArticle, 'id'> = {
      title: article.title || 'Untitled Article',
      slug:
        article.slug ||
        (article.title || 'article')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      category: article.category || 'General',
      summary: article.summary || '',
      content: article.content || '<p></p>',
      coverImage: article.coverImage || '',
      authorAlias: article.authorAlias || 'COUNCIL_ADMIN',
      authorName: article.authorName || 'Council Scribe',
      isPublished: article.isPublished !== undefined ? article.isPublished : true,
      order: article.order ?? 1,
      tags: article.tags || [],
      createdAt: article.createdAt || now,
      updatedAt: now
    };

    if (article.id && !article.id.startsWith('new_') && !article.id.startsWith('temp_')) {
      const docRef = doc(KNOWLEDGE_ARTICLES_COLLECTION, article.id);
      await setDoc(docRef, cleanArticle, { merge: true });
      return article.id;
    } else {
      const docRef = await addDoc(KNOWLEDGE_ARTICLES_COLLECTION, cleanArticle);
      await updateDoc(docRef, { id: docRef.id });
      return docRef.id;
    }
  } catch (err) {
    console.error('Error saving knowledge article:', err);
    throw err;
  }
}

/**
 * Permanently delete a knowledge article from Firestore & archives
 */
export async function deleteKnowledgeArticle(id: string): Promise<void> {
  if (!id) return;

  try {
    // 1. Immediately record in local storage so it is excluded from all instant reactive listeners
    recordLocalDeletedArticleId(id);

    // 2. Delete document from Firestore collection
    const docRef = doc(KNOWLEDGE_ARTICLES_COLLECTION, id);
    await deleteDoc(docRef);

    // 3. Mark in remote metadata as deleted so default seeding or backups never resurrect it
    try {
      await setDoc(
        KNOWLEDGE_META_DOC_REF,
        {
          seeded: true,
          deletedIds: arrayUnion(id),
          lastDeletedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (metaErr) {
      console.warn('Could not record deleted article ID in knowledge_meta:', metaErr);
    }
  } catch (err) {
    console.error('Error permanently deleting knowledge article:', err);
    throw err;
  }
}

/**
 * Clear all knowledge articles from Firestore (admin purge)
 */
export async function clearAllKnowledgeArticles(): Promise<void> {
  try {
    const snap = await getDocs(KNOWLEDGE_ARTICLES_COLLECTION);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // Mark all defaults as purged
    for (const art of DEFAULT_KNOWLEDGE_ARTICLES) {
      recordLocalDeletedArticleId(art.id);
    }

    await setDoc(
      KNOWLEDGE_META_DOC_REF,
      {
        seeded: true,
        deletedIds: DEFAULT_KNOWLEDGE_ARTICLES.map((a) => a.id),
        lastPurgedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error clearing all knowledge articles:', err);
    throw err;
  }
}

