import React from 'react';
import Orb from './orb/Orb.tsx';
import type { ConversationStatus } from '../types.ts';
import { DEFAULT_AVATAR_URL } from '../constants.ts';

interface AssistantAvatarProps {
  avatarUrl: string | null;
  isSpeaking: boolean;
  status: ConversationStatus;
  onClick?: () => void;
  orbHue?: number | null;
}

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ avatarUrl, isSpeaking, status, onClick, orbHue = 240 }) => {
  const isBreathing = status === 'ACTIVE' && !isSpeaking;
  const showOrb = status === 'ACTIVE' || status === 'CONNECTING';

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      aria-label={status === 'ACTIVE' || status === 'CONNECTING' ? 'Stop conversation' : 'Start conversation'}
      className="relative w-48 h-48 md:w-64 md:h-64 mx-auto focus:outline-none focus:ring-4 focus:ring-brand-secondary-glow/50 rounded-full transition-shadow duration-300 hover:shadow-2xl hover:shadow-brand-secondary-glow/20"
    >
      {showOrb && (
        <div className={`absolute inset-0 transition-opacity duration-500 ${isSpeaking ? 'animate-pulse-strong' : ''} ${isBreathing ? 'animate-breathing' : ''}`}>
          <Orb hue={orbHue || 240} forceHoverState={isSpeaking || isBreathing} rotateOnHover={false} />
        </div>
      )}
      <img
        src={avatarUrl || DEFAULT_AVATAR_URL}
        alt="Assistant Avatar"
        className={`w-full h-full rounded-full object-cover shadow-2xl transition-transform duration-500 transform ${showOrb ? 'scale-75' : 'scale-100'}`}
      />
    </button>
  );
};