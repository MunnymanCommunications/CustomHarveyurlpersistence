import React from 'react';
import Orb from './orb/Orb.tsx';
import type { ConversationStatus } from '../types.ts';

interface AssistantAvatarProps {
  avatarUrl: string;
  isSpeaking: boolean;
  status: ConversationStatus;
  onClick: () => void;
  orbHue: number;
}

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ avatarUrl, isSpeaking, status, onClick, orbHue }) => {
  const isBreathing = status === 'ACTIVE' && !isSpeaking;
  const showOrb = status === 'ACTIVE' || status === 'CONNECTING';

  return (
    <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto cursor-pointer" onClick={onClick}>
      {showOrb && (
        <div className={`absolute inset-0 transition-opacity duration-500 ${isSpeaking ? 'animate-pulse-strong' : ''} ${isBreathing ? 'animate-breathing' : ''}`}>
          <Orb forceHoverState={isSpeaking || isBreathing} rotateOnHover={false} hue={orbHue} />
        </div>
      )}
      <img
        src={avatarUrl}
        alt="Assistant Avatar"
        className={`w-full h-full rounded-full object-cover shadow-2xl transition-transform duration-500 transform ${showOrb ? 'scale-75' : 'scale-100'}`}
      />
    </div>
  );
};