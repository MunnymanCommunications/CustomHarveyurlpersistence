import {
    PERSONALITY_TRAITS_DEFINITIONS,
    ATTITUDE_OPTIONS_DEFINITIONS,
    VOICE_SETTINGS_DEFINITIONS,
} from './definitions.ts';

export type VoiceOption = typeof VOICE_SETTINGS_DEFINITIONS[number]['value'];
export type PersonalityTrait = typeof PERSONALITY_TRAITS_DEFINITIONS[number];
export type AttitudeOption = typeof ATTITUDE_OPTIONS_DEFINITIONS[number];

export interface GroundingChunk {
    web?: {
        title?: string;
        url?: string;
        snippet?: string;
    };
    [key: string]: any;
}

export interface Candidate {
    groundingMetadata?: {
        groundingChunks?: GroundingChunk[];
    };
}

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
  knowledge_base?: string;
  created_at: string;
  updated_at?: string;
  is_public?: boolean;
  is_embeddable?: boolean;
  description?: string;
  author_name?: string;
  orb_hue?: number;
  // FIX: Add missing property `original_assistant_id` to the Assistant type.
  // This resolves a TypeScript error in `SettingsDashboardPage.tsx` where this property was being accessed.
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

export interface Profile {
  id: string;
  username?: string | null;
  full_name?: string | null;
  updated_at?: string;
  role: 'user' | 'admin';
}

export interface AppLog {
  id: number;
  created_at: string;
  user_id: string;
  assistant_id?: string;
  event_type: string;
  metadata?: Record<string, any>;
}