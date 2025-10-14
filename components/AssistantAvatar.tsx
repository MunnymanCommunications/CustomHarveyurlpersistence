import React from 'react';
import type { ConversationStatus } from '../types';
import { Icon } from './Icon';

interface AssistantAvatarProps {
  avatarUrl: string;
  isSpeaking: boolean;
  sessionStatus: ConversationStatus;
}

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ avatarUrl, isSpeaking, sessionStatus }) => {
    const getStatusIndicator = () => {
        switch(sessionStatus) {
            case 'IDLE':
                return <div className="absolute -bottom-2 -right-2 bg-gray-400 rounded-full p-2 border-4 border-base-lighter z-20"><Icon name="micOff" className="w-6 h-6 text-on-brand"/></div>;
            case 'CONNECTING':
                return <div className="absolute -bottom-2 -right-2 bg-yellow-400 rounded-full p-2 border-4 border-base-lighter animate-pulse z-20"><Icon name="connection" className="w-6 h-6 text-on-brand"/></div>;
            case 'ACTIVE':
                return <div className="absolute -bottom-2 -right-2 bg-green-400 rounded-full p-2 border-4 border-base-lighter z-20"><Icon name="micOn" className="w-6 h-6 text-on-brand"/></div>;
            case 'ERROR':
                return <div className="absolute -bottom-2 -right-2 bg-red-400 rounded-full p-2 border-4 border-base-lighter z-20"><Icon name="error" className="w-6 h-6 text-on-brand"/></div>;
            default:
                return null;
        }
    }

    return (
        <div className="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center">
            {/* Pulsating ring for speaking state */}
            <div 
                className={`absolute inset-0 rounded-full bg-gradient-to-br from-brand-primary-glow to-brand-quaternary-glow transition-all duration-500 ease-in-out
                    ${isSpeaking ? 'animate-pulse-slow opacity-30' : 'opacity-0 scale-75'}`}
            ></div>
            <img
                src={avatarUrl}
                alt="Assistant Avatar"
                className={`relative w-3/4 h-3/4 rounded-full object-cover z-10 shadow-2xl transition-transform duration-300
                    ${isSpeaking ? 'scale-105' : 'scale-100'}`}
            />
            {getStatusIndicator()}
        </div>
    );
};