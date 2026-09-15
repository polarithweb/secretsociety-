import { Question, SocietySettings, MemberAccount, TaskForm } from '../types';

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
  memberPortalNotice: 'Member Task & Information Operations. Select or search a task directive, fill out the form for your specific purpose, and log ongoing updates in authorized boxes.',
  memberClosingMessage: 'Your member task submission and updates have been cryptographically recorded.'
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

// No hardcoded candidate questions - all questions are configured from the Admin Portal
export const DEFAULT_QUESTIONS: Question[] = [];

// Default initial Task Forms for the Info Portal task system
export const DEFAULT_TASK_FORMS: TaskForm[] = [
  {
    id: 'task_form_intel_report',
    title: 'Intelligence & Surveillance Debrief',
    description: 'Standard operational debrief form for member intelligence gathering, field observations, and continuous updates.',
    category: 'Intelligence',
    isActive: true,
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q_target_subject',
        label: 'Target Entity / Subject Description',
        description: 'Detail the entity, organization, or individual being monitored.',
        type: 'text',
        required: true,
        allowAddInfo: false,
        placeholder: 'e.g., Vanguard Holdings or Subject X'
      },
      {
        id: 'q_initial_findings',
        label: 'Initial Findings & Summary',
        description: 'Provide a concise overview of initial observations.',
        type: 'textarea',
        required: true,
        allowAddInfo: false,
        placeholder: 'Summarize initial encounter or discovery...'
      },
      {
        id: 'q_continuous_intel',
        label: 'Continuous Field Updates & New Information Box',
        description: 'Allowed box: Members can append new information, logs, and findings to this field anytime.',
        type: 'textarea',
        required: false,
        allowAddInfo: true,
        placeholder: 'Enter new developments, timestamps, or ongoing intel...'
      },
      {
        id: 'q_risk_level',
        label: 'Current Threat Assessment (1-10)',
        description: 'Estimated operational sensitivity rating.',
        type: 'scale',
        required: false,
        allowAddInfo: false
      }
    ]
  },
  {
    id: 'task_form_resource_log',
    title: 'Resource & Operation Log',
    description: 'Form to track assets, secure meeting nodes, and subsequent field reports for various operational objectives.',
    category: 'Operations',
    isActive: true,
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: 'q_location_node',
        label: 'Designated Node or Sector',
        description: 'Geographic or codenamed node identifier.',
        type: 'text',
        required: true,
        allowAddInfo: false,
        placeholder: 'Sector or Location identifier...'
      },
      {
        id: 'q_ongoing_logs',
        label: 'Ongoing Activity & Notes (Allowed Box)',
        description: 'Add new information and notes anytime as the operation progresses.',
        type: 'textarea',
        required: false,
        allowAddInfo: true,
        placeholder: 'Log new events, contacts, or updates...'
      }
    ]
  }
];

