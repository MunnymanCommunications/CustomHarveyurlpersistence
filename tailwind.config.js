/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#1a1a1a',
        'brand-secondary': '#4a4a4a',
        'brand-secondary-glow': '#6a82fb',
        'brand-tertiary': '#b3b3b3',
        'brand-tertiary-glow': '#87e0f5',
        'brand-light': '#a6c1ee',
        'on-brand': '#ffffff',
        
        // Light theme colors
        'text-primary': '#2d3748', // Dark gray for main text
        'text-secondary': '#718096', // Lighter gray for subtext
        'text-tertiary': '#a0aec0', // Even lighter for hints
        'base-light': '#f7fafc', // Very light gray background
        'base-medium': '#edf2f7',
        'border-color': '#e2e8f0',
        'danger': '#e53e3e',
        'danger-hover': '#c53030',

        // Dark theme colors
        'dark-text-primary': '#f9fafb', // Light gray for main text
        'dark-text-secondary': '#9ca3af', // Darker gray for subtext
        'dark-text-tertiary': '#6b7281', // Even darker for hints
        'dark-base-light': '#111827', // Dark background
        'dark-base-medium': '#1f2937',
        'dark-border-color': '#374151',
      }
    },
  },
  plugins: [],
}