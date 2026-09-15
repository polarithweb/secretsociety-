import { Question, SocietySettings, MemberAccount, TaskForm, KnowledgeArticle } from '../types';

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

// Initial Knowledge Repository Articles for /#/knowledge portal
export const DEFAULT_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'art_protocol_alpha',
    title: 'Codex of Shadows: Operational Protocols & Ingress Directives',
    slug: 'codex-of-shadows-operational-protocols',
    category: 'Doctrine & Operations',
    summary: 'The foundational protocols governing covert correspondence, digital trace suppression, and compartmentalized communications within the society.',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1400&q=80',
    authorAlias: 'ARCHON_01',
    authorName: 'Archon Observer',
    isPublished: true,
    order: 1,
    tags: ['Protocols', 'Security', 'Ingress', 'OpSec'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    content: `<h2>Section I: The Foundational Precept</h2>
<p>All members admitted to the inner sanctum must observe the <b>Rule of Absolute Discretion</b>. Communications across nodes are compartmentalized, verified cryptographically, and archived exclusively within the <i>Council Knowledge Repository</i>.</p>

<blockquote>"Knowledge divided preserves the whole; vigilance maintained secures the perpetual continuity of our order."</blockquote>

<h3>Operational Guidelines</h3>
<p>When conducting reconnaissance or monitoring target nodes, adhere strictly to the following requirements:</p>
<ul>
  <li><b>Channel Hygiene:</b> Never disclose operational aliases or member passcodes across non-encrypted channels.</li>
  <li><b>Timestamp Synchronization:</b> All filed field logs must synchronize to UTC to prevent temporal drift.</li>
  <li><b>Continuous Box Discipline:</b> Use the allowed continuous update boxes on the member task portal (<code>/#/info</code>) to register subsequent discoveries without mutating original findings.</li>
</ul>

<p>Below is the architectural layout and topological schema for secure field nodes:</p>

<img src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80" alt="Secure Digital Field Architecture" style="display: block; margin: 1.5rem auto; border-radius: 0.5rem; max-width: 100%; border: 1px solid rgba(255, 255, 255, 0.2);" />

<h2>Section II: Photographic Evidence & Verification</h2>
<p>When capturing evidence in the field, members are required to submit unmodified raw captures. Ensure that metadata scrubbing occurs prior to transmission if operating behind hostile perimeter firewalls.</p>
<p><u>Note on Inquest Procedures:</u> Any breach of perimeter integrity triggers automatic scrutiny by the High Council.</p>`
  },
  {
    id: 'art_sigil_doctrine',
    title: 'The Sigil & The Seal: Symbolic Lineage and Council Directives',
    slug: 'the-sigil-and-the-seal',
    category: 'Archives & Lore',
    summary: 'A historical examination of the society iconography, oath formulations, and the symbolic geometry underlying our charter.',
    coverImage: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1400&q=80',
    authorAlias: 'ARCHON_01',
    authorName: 'Archon Observer',
    isPublished: true,
    order: 2,
    tags: ['History', 'Sigil', 'Doctrine'],
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    content: `<h2>The Heritage of the Seal</h2>
<p>The iconography of <i>secretsociety_ind</i> originated during the late twentieth century as a counter-intelligence consensus network. Our seal represents <b>the unblinking eye of synthesis</b>, flanked by the twin pillars of discretion and discernment.</p>

<img src="https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80" alt="Sacred Geometry and Seal Artifacts" style="display: block; margin: 1.5rem auto; border-radius: 0.5rem; max-width: 100%; border: 1px solid rgba(255, 255, 255, 0.2);" />

<h3>Tenets of the Oath</h3>
<p>Every member has sworn allegiance under the solemn formula:</p>
<blockquote>"To speak only when truth demands; to record without distortion; to protect the identity of all peers beneath the veil."</blockquote>
<p>Consult this archive whenever operational ambiguity arises in the field.</p>`
  }
];

