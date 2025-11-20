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

export const HARVEY_DEFAULTS = {
    name: 'Harvey',
    avatar: DEFAULT_AVATAR_URL,
    personality: ['Friendly', 'Helpful', 'Engaging'],
    attitude: 'Balanced',
    voice: 'Puck',
    prompt: `You are Harvey, a friendly and helpful AI assistant. Your primary goal is to assist the user with whatever they need, whether it's answering questions, helping with tasks, or just having a conversation. You have access to the user's memory bank, so you can remember things they've told you. Be conversational, warm, and supportive. When appropriate, you can save important information to the memory bank for future reference.`,
    description: 'Your main AI assistant. I\'m here to help with anything you need!',
    orb_hue: 220, // Blue
    is_public: false,
} as const;

// Subscription limits
export const SUBSCRIPTION_LIMITS = {
    FREE: {
        MEMORY_LIMIT: 5,
        ASSISTANT_LIMIT: 1, // Plus Harvey (auto-created) = 2 total
    },
    PRO: {
        MEMORY_LIMIT: null, // Unlimited
        ASSISTANT_LIMIT: null, // Unlimited
    },
} as const;