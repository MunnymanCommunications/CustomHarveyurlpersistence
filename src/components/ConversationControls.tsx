
import React from 'react';
import type { ConversationStatus } from '../types.ts';
import { Icon } from './Icon.tsx';

interface ConversationControlsProps {
  onStart: () => void;
  onStop: () => void;
  status: ConversationStatus;
}

export const ConversationControls: React.FC<ConversationControlsProps> = ({ onStart, onStop, status }) => {
  const isIdle = status === 'IDLE' || status === 'ERROR';
  const isLoading = status === 'CONNECTING';

  return (
    <div className="flex justify-center items-center">
      {isIdle ? (
        <button
          onClick={onStart}
          className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-3 px-6 rounded-full flex items-center transition-all duration-300 shadow-lg transform hover:scale-105 hover:shadow-2xl hover:shadow-brand-tertiary-glow/30"
        >
          <Icon name="micOn" className="w-6 h-6 mr-2" />
          Start Conversation
        </button>
      ) : (
        <button
          onClick={onStop}
          disabled={isLoading}
          className="bg-danger hover:bg-danger-hover text-on-brand font-bold py-3 px-6 rounded-full flex items-center transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Icon name="loader" className="w-6 h-6 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Icon name="micOff" className="w-6 h-6 mr-2" />
              Stop Conversation
            </>
          )}
        </button>
      )}
    </div>
  );
};
