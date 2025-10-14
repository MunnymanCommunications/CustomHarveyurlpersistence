import type { PERSONALITY_TRAITS_DEFINITIONS, ATTITUDE_OPTIONS_DEFINITIONS, VOICE_SETTINGS_DEFINITIONS } from './definitions';

// All possible personality traits, derived from the single source of truth.
export type Personality = typeof PERSONALITY_TRAITS_DEFINITIONS[number];

// All possible attitudes, derived from the single source of truth.
export type Attitude = typeof ATTITUDE_OPTIONS_DEFINITIONS[number];

// All possible voice options, derived from the single source of truth.
export type VoiceOption = typeof VOICE_SETTINGS_DEFINITIONS[number]['value'];

// The settings that define the AI assistant's persona, matching the database schema.
export interface Assistant {
  id: string; // UUID from DB
  user_id: string; // UUID from auth.users
  name: string;
  avatar: string; // URL or data URI
  personality: Personality[];
  attitude: Attitude;
  knowledgeBase: string;
  voice: VoiceOption;
  prompt: string;
  created_at: string;
  updated_at: string;
}

// A single entry in the conversation history
export interface HistoryEntry {
  user: string;
  assistant: string;
  timestamp: string; // ISO string for simplicity
}

// The status of the live conversation session
export type ConversationStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'ERROR';
