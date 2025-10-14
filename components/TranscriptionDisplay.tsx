import React from 'react';

interface TranscriptionDisplayProps {
  userTranscript: string;
  assistantTranscript: string;
  isSpeaking: boolean;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ userTranscript, assistantTranscript, isSpeaking }) => {
  return (
    <div className="w-full max-w-2xl text-center min-h-[6rem] p-4">
      <p className="text-xl text-text-secondary transition-opacity duration-300" style={{ opacity: userTranscript ? 1 : 0 }}>
        {userTranscript || '...'}
      </p>
      <p className="text-2xl font-semibold text-text-primary mt-2 transition-opacity duration-300" style={{ opacity: assistantTranscript || isSpeaking ? 1 : 0 }}>
        {assistantTranscript || (isSpeaking ? '...' : '')}
      </p>
    </div>
  );
};
