/** @type {import('tailwindcss').Config} */
export default {
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
        'text-primary': '#2d3748', // Dark gray for main text
        'text-secondary': '#718096', // Lighter gray for subtext
        'text-tertiary': '#a0aec0', // Even lighter for hints
        'base-light': '#f7fafc', // Very light gray background
        'base-medium': '#edf2f7',
        'border-color': '#e2e8f0',
        'danger': '#e53e3e',
        'danger-hover': '#c53030',
      }
    },
  },
  plugins: [],
}
