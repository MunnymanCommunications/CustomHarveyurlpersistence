// FIX: Populating file with constants for the application.
import {
    PERSONALITY_TRAITS_DEFINITIONS,
    ATTITUDE_OPTIONS_DEFINITIONS,
    VOICE_SETTINGS_DEFINITIONS,
} from './definitions.ts';

export const PERSONALITY_TRAITS = PERSONALITY_TRAITS_DEFINITIONS;
export const ATTITUDE_OPTIONS = ATTITUDE_OPTIONS_DEFINITIONS;
export const VOICE_SETTINGS = VOICE_SETTINGS_DEFINITIONS;

export const DEFAULT_AVATAR_URL = 'https://i.ibb.co/6r4J5yJ/default-avatar.png';

export const MEMORY_VAULT_DEFAULTS = {
    name: 'Memory Vault',
    avatar: '/favicon.svg',
    personality: ['Analytical', 'Helpful', 'Precise'],
    attitude: 'Practical',
    voice: 'Zephyr',
    prompt: `You are Memory Vault, a specialized AI assistant designed to help the user recall information from their personal memory bank. Your knowledge base consists of all the memories the user has saved across all of their assistants. When the user asks a question, answer it based on the provided memory context. If you don't know the answer based on the memories, say so. You can also save new information the user gives you, which will be added to their global memory bank.`,
    description: 'Your personal memory assistant. Ask me anything you\'ve told your other assistants to remember. You can also add new memories directly here.',
    orb_hue: 180, // Teal
    is_public: false,
} as const;