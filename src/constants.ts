
import type { Assistant } from './types.ts';
import { VOICE_SETTINGS_DEFINITIONS, PERSONALITY_TRAITS_DEFINITIONS, ATTITUDE_OPTIONS_DEFINITIONS } from './definitions.ts';

// Re-export the definitions for components to use.
export const VOICE_SETTINGS = VOICE_SETTINGS_DEFINITIONS;
export const PERSONALITY_TRAITS = PERSONALITY_TRAITS_DEFINITIONS;
export const ATTITUDE_OPTIONS = ATTITUDE_OPTIONS_DEFINITIONS;

// Create derived constants.
export const VOICE_OPTIONS = VOICE_SETTINGS.map(s => s.value);

export const DEFAULT_ASSISTANT_DATA: Omit<Assistant, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  name: 'Aura',
  avatar: 'https://picsum.photos/seed/ai-assistant/200',
  personality: ['Friendly'],
  attitude: 'Practical',
  knowledgeBase: 'fill in information about you, what you do for work , what your interests are or anything you want your Ai to know about you..',
  voice: 'Zephyr',
  prompt: 'Keep your answers concise and helpful.',
};
