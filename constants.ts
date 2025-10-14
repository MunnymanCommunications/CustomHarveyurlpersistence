import type { Settings, Personality, Attitude, VoiceOption } from './types';

// FIX: Removed explicit type annotation from `VOICE_SETTINGS` to break a circular dependency
// with `types.ts`. The type is now correctly inferred from the `as const` assertion, which
// resolves the "circularly references itself" and "referenced directly or indirectly in its own type annotation" errors.
export const VOICE_SETTINGS = [
    { name: 'Neutral', value: 'Zephyr' },
    { name: 'Female - Standard', value: 'Kore' },
    { name: 'Male - Standard', value: 'Puck' },
    { name: 'Male - Strong', value: 'Fenrir' },
    { name: 'Male - Deep', value: 'Charon' },
] as const;

// FIX: Added the missing `VOICE_OPTIONS` export required by the `SettingsPanel` component.
export const VOICE_OPTIONS = VOICE_SETTINGS.map(s => s.value);

export const PERSONALITY_TRAITS: Personality[] = ['Friendly', 'Witty', 'Formal', 'Creative', 'Analytical', 'Sarcastic', 'Enthusiastic', 'Calm', 'Energetic', 'Curious', 'Patient', 'Humorous', 'Stoic', 'Wise', 'Playful', 'Direct', 'Mysterious', 'Empathetic', 'Loyal', 'Independent', 'Assertive', 'Gentle', 'Introverted', 'Extroverted', 'Imaginative'];
export const ATTITUDE_OPTIONS: Attitude[] = ['Country Simple', 'City Smooth', 'Practical', 'Analytical', 'Scientific', 'Historical', 'Storyteller', 'Boomer', 'Gen Z', 'Classical'];

export const DEFAULT_SETTINGS: Settings = {
  name: 'Aura',
  avatar: 'https://picsum.photos/seed/ai-assistant/200',
  personality: ['Friendly'],
  attitude: 'Practical',
  knowledgeBase: 'fill in information about you, what you do for work , what your interests are or anything you want your Ai to know about you..',
  voice: 'Zephyr',
  prompt: 'Keep your answers concise and helpful.',
};