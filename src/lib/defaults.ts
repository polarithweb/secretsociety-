import { Question, SocietySettings, MemberAccount } from '../types';

export const DEFAULT_BACKGROUND_PRESETS = [
  {
    id: 'pitch_black',
    name: 'Pure Black',
    url: '',
    thumbnail: '',
    description: 'Pure pitch black background'
  },
  {
    id: 'subtle_night',
    name: 'Deep Midnight',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=400&q=80',
    description: 'Deep nocturnal celestial sky with dark blue tones'
  },
  {
    id: 'obsidian_corridor',
    name: 'Obsidian Archive',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    description: 'Minimal shadows and deep stone geometry'
  }
];

export const DEFAULT_SETTINGS: SocietySettings = {
  heading: 'secretsociety_ind',
  subheading: 'Candidate Application Portal',
  backgroundImage: '',
  sigilImage: '',
  timerMinutes: 0,
  passingScore: 70,
  adminPin: 'PolarithWeb8825',
  oathIntro: 'Please provide accurate and candid responses. All submitted information is directly reviewed by the council.',
  closingMessage: 'Your application has been received and entered into the council records. The council will review your responses.',
  memberPortalHeading: 'secretsociety_ind',
  memberPortalNotice: 'Confidential Member Inquest. Authorized credentials required. Respond to the active society directives and verification questions below.',
  memberClosingMessage: 'Your member submission has been cryptographically recorded in the inner society archives.'
};

export const DEFAULT_MEMBERS: MemberAccount[] = [
  {
    id: 'mem_archon_01',
    alias: 'ARCHON_01',
    password: 'arc_password_2026',
    name: 'Archon Observer',
    role: 'Council Member',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// No hardcoded questions - all questions are configured from the Admin Portal
export const DEFAULT_QUESTIONS: Question[] = [];
