
import type { PERSONALITY_TRAITS_DEFINITIONS, ATTITUDE_OPTIONS_DEFINITIONS, VOICE_SETTINGS_DEFINITIONS } from './definitions.ts';

export type Personality = typeof PERSONALITY_TRAITS_DEFINITIONS[number];

export type Attitude = typeof ATTITUDE_OPTIONS_DEFINITIONS[number];

export type VoiceOption = typeof VOICE_SETTINGS_DEFINITIONS[number]['value'];

export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  personality: Personality[];
  attitude: Attitude;
  knowledgeBase: string;
  voice: VoiceOption;
  prompt: string;
  created_at: string;
  updated_at: string;
}

export interface HistoryEntry {
  user: string;
  assistant: string;
  timestamp: string;
}

export type ConversationStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'ERROR';
