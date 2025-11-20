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
  avatar: string | null;
  personality: PersonalityTrait[] | null;
  attitude: AttitudeOption | null;
  voice: VoiceOption | null;
  prompt: string | null;
  knowledge_base?: string;
  created_at: string;
  updated_at?: string | null;
  is_public?: boolean | null;
  is_embeddable?: boolean | null;
  description?: string | null;
  author_name?: string | null;
  orb_hue?: number | null;
  original_assistant_id?: string | null;
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
  subscription_tier?: string;
}

export interface AppLog {
  id: number;
  created_at: string;
  user_id: string;
  assistant_id?: string;
  event_type: string;
  metadata?: Record<string, any>;
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  memory_limit: number | null;
  assistant_limit: number | null;
  features: Record<string, any>;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  memory_count: number;
  assistant_count: number;
  first_memory_added_at?: string;
  shown_first_memory_congrats: boolean;
  shown_upgrade_prompt: boolean;
  updated_at: string;
}