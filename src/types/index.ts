export type QuestionType =
  | 'agree_disagree'
  | 'multiple_choice'
  | 'text'
  | 'scale'
  | 'photo';

export type QuestionTarget = 'candidate' | 'member' | 'both';

export interface Question {
  id: string;
  title: string;
  description?: string;
  type: QuestionType;
  options?: string[]; // For multiple_choice
  correctOptionIndex?: number; // For automated scoring
  points?: number; // Points awarded for correct answer
  order: number;
  required: boolean;
  category?: string;
  target?: QuestionTarget; // 'candidate' | 'member' | 'both'
  allowMemberAddInfo?: boolean; // Member can login and add new information/text anytime
  minScale?: number;
  maxScale?: number;
  scaleLabels?: { min: string; max: string };
}

export interface MemberInfoEntry {
  id: string;
  questionId: string;
  questionTitle: string;
  memberAlias: string;
  memberName?: string;
  content: string;
  submittedAt: string;
  photos?: string[];
}

export interface MemberAccount {
  id: string;
  alias: string;
  password: string;
  name?: string;
  role?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
}

export interface SocietySettings {
  heading: string;
  subheading: string;
  backgroundImage: string;
  sigilImage?: string;
  timerMinutes: number;
  passingScore: number; // e.g. 75%
  adminPin: string;
  oathIntro: string;
  closingMessage: string;
  memberPortalHeading?: string;
  memberPortalNotice?: string;
  memberClosingMessage?: string;
}

export type SubmissionStatus = 'pending' | 'accepted' | 'scrutiny' | 'rejected';

export interface CandidateAnswer {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  answer: any;
  isCorrect?: boolean;
  pointsAwarded?: number;
  maxPoints?: number;
}

export interface Answersheet {
  id: string;
  candidateName: string;
  candidateAlias: string;
  candidateEmail: string;
  submittedAt: string;
  timeSpentSeconds: number;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, CandidateAnswer>;
  photos: string[]; // Base64 data URLs or uploaded URLs
  status: SubmissionStatus;
  adminNotes?: string;
  isMemberSubmission?: boolean;
}
