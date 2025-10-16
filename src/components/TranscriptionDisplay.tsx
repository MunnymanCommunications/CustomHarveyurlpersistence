import React from 'react';

interface TranscriptionDisplayProps {
  userTranscript: string;
  assistantTranscript: string;
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ userTranscript, assistantTranscript }) => {
  return (
    <div className="text-center min-h-[6rem] flex flex-col justify-center items-center p-4">
      <p className="text-2xl md:text-3xl text-text-primary dark:text-dark-text-primary transition-opacity duration-300 opacity-90 min-h-[2.5rem]">
        <span className="text-brand-tertiary-glow">{assistantTranscript}</span>
      </p>
      <p className="text-lg md:text-xl text-text-secondary dark:text-dark-text-secondary transition-opacity duration-300 h-8 mt-2">
        {userTranscript}
      </p>
    </div>
  );
};
