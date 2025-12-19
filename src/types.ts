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
  mcp_server_settings?: MCPServerSettings | null;
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

export interface Reminder {
  id: string;
  user_id: string;
  assistant_id: string;
  content: string;
  due_date: string | null;
  is_completed: boolean;
  created_at: string;
  completed_at: string | null;
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
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
}

export interface UserSession {
  id: string;
  user_id: string;
  assistant_id: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
  session_type: 'voice' | 'chat';
  error_count: number;
  created_at: string;
}

export interface APIHealth {
  id: string;
  provider: string;
  status: 'healthy' | 'degraded' | 'down';
  last_check: string;
  response_time_ms?: number | null;
  error_message?: string | null;
  created_at: string;
}

export interface UserWithProfile {
  user_id: string;
  email?: string;
  full_name?: string | null;
  username?: string | null;
  role: 'user' | 'admin';
}

export interface MCPServerConfig {
  url: string;
  headers?: Record<string, string>;
  apiKey?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface MCPServerSettings {
  enabled: boolean;
  config: MCPServerConfig;
  tools: MCPTool[];
  optimizedToolDescriptions?: string;
}