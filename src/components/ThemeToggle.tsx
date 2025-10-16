import React from 'react';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { Icon } from './Icon.tsx';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center w-full p-3 rounded-lg text-text-secondary hover:bg-white/70 hover:text-text-primary dark:text-dark-text-secondary dark:hover:bg-dark-base-medium/70 dark:hover:text-dark-text-primary justify-center"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} className="w-5 h-5" />
    </button>
  );
};
