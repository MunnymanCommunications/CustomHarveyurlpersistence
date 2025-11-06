import React from 'react';
import { Icon } from './Icon.tsx';

interface WebResult {
  web?: {
    uri: string;
    title: string;
  }
}

interface WebResultsProps {
  sources: WebResult[];
}

export const WebResults: React.FC<WebResultsProps> = ({ sources }) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="glassmorphic p-3 rounded-lg max-w-2xl w-full mx-auto mt-4 text-left">
      <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2 flex items-center">
        <Icon name="connection" className="w-4 h-4 mr-2" />
        Web Sources
      </h3>
      <ul className="space-y-1 text-xs max-h-24 overflow-y-auto">
        {sources.map((item, index) => (
          item.web && (
            <li key={index} className="truncate">
              <a 
                href={item.web.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-light hover:underline hover:text-brand-secondary-glow"
              >
                {item.web.title || item.web.uri}
              </a>
            </li>
          )
        ))}
      </ul>
    </div>
  );
};