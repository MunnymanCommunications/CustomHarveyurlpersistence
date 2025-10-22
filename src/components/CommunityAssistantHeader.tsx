import React from 'react';
import { Icon } from './Icon.tsx';

interface CommunityAssistantHeaderProps {
  assistantName: string;
  onClone: () => void;
  isCloning: boolean;
}

export const CommunityAssistantHeader: React.FC<CommunityAssistantHeaderProps> = ({ assistantName, onClone, isCloning }) => {
  return (
    <div className="absolute top-4 right-4 left-4 md:left-auto max-w-lg mx-auto z-20 glassmorphic p-3 rounded-lg flex items-center justify-between gap-4 shadow-lg">
      <div>
        <p className="text-sm font-semibold text-text-primary dark:text-dark-text-primary">Previewing Community Assistant</p>
        <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Memories will not be saved for "{assistantName}".</p>
      </div>
      <button
        onClick={onClone}
        disabled={isCloning}
        className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-2 px-4 rounded-full flex items-center transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50"
      >
        <Icon name={isCloning ? 'loader' : 'plus'} className={`w-5 h-5 mr-2 ${isCloning ? 'animate-spin' : ''}`} />
        Add to My Assistants
      </button>
    </div>
  );
};
