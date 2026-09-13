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
  orderBy
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { Question, SocietySettings, Answersheet, SubmissionStatus } from '../types';
import { DEFAULT_SETTINGS, DEFAULT_QUESTIONS } from './defaults';

// Initialize Firebase App instance
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfigData);

// Note: firebaseConfigData contains `firestoreDatabaseId`
export const db = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

const SETTINGS_DOC_REF = doc(db, 'settings', 'global');
const QUESTIONS_COLLECTION = collection(db, 'questions');
const SUBMISSIONS_COLLECTION = collection(db, 'submissions');

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
