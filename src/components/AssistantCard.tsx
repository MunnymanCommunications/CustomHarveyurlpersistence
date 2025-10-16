import React from 'react';
import type { Assistant } from '../types.ts';

interface AssistantCardProps {
  assistant: Assistant;
}

export const AssistantCard: React.FC<AssistantCardProps> = ({ assistant }) => {
  return (
    <a href={`#/assistant/${assistant.id}`} className="block p-6 glassmorphic rounded-2xl hover:ring-2 hover:ring-brand-tertiary-glow transition-all duration-300 flex flex-col">
      <div className="flex items-center gap-4 mb-3">
        <img src={assistant.avatar} alt={assistant.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0" />
        <div className="overflow-hidden">
          <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary truncate">{assistant.name}</h2>
          {assistant.author_name && (
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary">
              by {assistant.author_name}
            </p>
          )}
        </div>
      </div>
      <div className="flex-grow">
        {assistant.description && (
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-2 line-clamp-2">
            {assistant.description}
          </p>
        )}
        <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary line-clamp-2 italic">
          {assistant.personality.join(', ')}
        </p>
      </div>
    </a>
  );
};