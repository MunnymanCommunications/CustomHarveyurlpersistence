// All possible personality traits. These should match the values in constants.ts
export type Personality = 'Friendly' | 'Witty' | 'Formal' | 'Creative' | 'Analytical' | 'Sarcastic' | 'Enthusiastic' | 'Calm' | 'Energetic' | 'Curious' | 'Patient' | 'Humorous' | 'Stoic' | 'Wise' | 'Playful' | 'Direct' | 'Mysterious' | 'Empathetic' | 'Loyal' | 'Independent' | 'Assertive' | 'Gentle' | 'Introverted' | 'Extroverted' | 'Imaginative';

// All possible attitudes. These should match the values in constants.ts
export type Attitude = 'Country Simple' | 'City Smooth' | 'Practical' | 'Analytical' | 'Scientific' | 'Historical' | 'Storyteller' | 'Boomer' | 'Gen Z' | 'Classical';

// All possible voice options from Google GenAI. These should match the values in constants.ts
export type VoiceOption = 'Zephyr' | 'Kore' | 'Puck' | 'Fenrir' | 'Charon';

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