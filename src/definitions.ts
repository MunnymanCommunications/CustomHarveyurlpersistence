// This file contains the raw data definitions and should have NO IMPORTS.
// It serves as the single source of truth to prevent circular dependencies.

export const PERSONALITY_TRAITS_DEFINITIONS = ['Friendly', 'Witty', 'Formal', 'Creative', 'Analytical', 'Sarcastic', 'Enthusiastic', 'Calm', 'Energetic', 'Curious', 'Patient', 'Humorous', 'Stoic', 'Wise', 'Playful', 'Direct', 'Mysterious', 'Empathetic', 'Loyal', 'Independent', 'Assertive', 'Gentle', 'Introverted', 'Extroverted', 'Imaginative', 'Bitchy', 'Asshole'] as const;

export const ATTITUDE_OPTIONS_DEFINITIONS = ['Country Simple', 'City Smooth', 'Practical', 'Analytical', 'Scientific', 'Historical', 'Storyteller', 'Boomer', 'Gen Z', 'Classical', 'Scottish', 'British'] as const;

export const VOICE_SETTINGS_DEFINITIONS = [
    { name: 'Neutral', value: 'Zephyr' },
    { name: 'Female - Standard', value: 'Kore' },
    { name: 'Male - Standard', value: 'Puck' },
    { name: 'Male - Strong', value: 'Fenrir' },
    { name: 'Male - Deep', value: 'Charon' },
] as const;