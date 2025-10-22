import {
    PERSONALITY_TRAITS_DEFINITIONS,
    ATTITUDE_OPTIONS_DEFINITIONS,
    VOICE_SETTINGS_DEFINITIONS,
} from './definitions.ts';

export type VoiceOption = typeof VOICE_SETTINGS_DEFINITIONS[number]['value'];
export type PersonalityTrait = typeof PERSONALITY_TRAITS_DEFINITIONS[number];
export type AttitudeOption = typeof ATTITUDE_OPTIONS_DEFINITIONS[number];

export type ConversationStatus = 'IDLE' | 'CONNECTING' | 'ACTIVE' | 'ERROR';

export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  avatar: string;
  personality: PersonalityTrait[];
  attitude: AttitudeOption;
  voice: VoiceOption;
  prompt: string;
  created_at: string;
  is_public?: boolean;
  original_assistant_id?: string;
}

export interface MemoryItem {
  id: number;
  assistant_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface HistoryEntry {
  user: string;
  assistant: string;
  timestamp: string;
}